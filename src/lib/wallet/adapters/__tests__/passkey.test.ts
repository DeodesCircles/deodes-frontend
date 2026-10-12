import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock @simplewebauthn/browser
vi.mock("@simplewebauthn/browser", () => ({
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
}))

// Polyfill PublicKeyCredential for jsdom
Object.defineProperty(globalThis, "PublicKeyCredential", {
  value: class MockPublicKeyCredential {},
  configurable: true,
})

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Setup localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()
Object.defineProperty(global, "localStorage", { value: localStorageMock })

import { createPasskeyAdapter } from "../passkey"
import { startRegistration, startAuthentication } from "@simplewebauthn/browser"
import { deriveStellarKeypair, secureZeroMemory } from "@/lib/crypto/key-derivation"

const mockOptions = {
  challenge: "test-challenge-base64url",
  rp: { name: "Moistello", id: "localhost" },
  user: { id: "dXNlckB0ZXN0LmNvbQ", name: "user@test.com", displayName: "user@test.com" },
  pubKeyCredParams: [{ alg: -7, type: "public-key" }],
  authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "required" },
  timeout: 120000,
}

const mockAttestation = {
  id: "test-credential-id-123",
  rawId: "test-credential-id-123",
  response: { clientDataJSON: "{}", attestationObject: "{}" },
}

const mockAssertion = {
  id: "test-credential-id-123",
  rawId: "test-credential-id-123",
  response: { clientDataJSON: "{}", authenticatorData: "{}", signature: "{}", userHandle: "{}" },
}

const keypairResponse = {
  verified: true,
  email: "user@test.com",
  publicKey: "a".repeat(64),
}

const signMessageResponse = { signature: "c".repeat(128), publicKey: "a".repeat(64) }
const signTransactionResponse = {
  signedXdr:
    "AAAAAgAAAAAZf2sj4WyFMsaryDj6zV6nib4MdrKSAzQDm/qLPTaNYQAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAABqF+POAAAAAAAAAAEAAAAAAAAAAQAAAABCzwVZeQ9sO2TeFRIN8Lslyqt9wttPtKGKNeiBvzI69wAAAAAAAAAAAJiWgAAAAAAAAAABPTaNYQAAAEBATUu5C3pxDGuXruyHgDvDHwgJZBlklafJMM8VSy2EMTUhk4Ez+ewCF/sekMAX5VynMxCdtfsd/KHR3gvI0HYK",
}

describe("Passkey adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    mockFetch.mockReset()
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("/generate-options")) {
        return new Response(JSON.stringify({ options: mockOptions, challenge: "test-challenge" }))
      }
      if (url.includes("/register")) {
        return new Response(JSON.stringify({ ...keypairResponse, credentialId: "test-credential-id-123" }))
      }
      if (url.includes("/auth-verify")) {
        return new Response(JSON.stringify(keypairResponse))
      }
      if (url.includes("/sign-message")) {
        return new Response(JSON.stringify(signMessageResponse))
      }
      if (url.includes("/sign-transaction")) {
        return new Response(JSON.stringify(signTransactionResponse))
      }
      return new Response(JSON.stringify({}), { status: 404 })
    })
  })

  describe("meta", () => {
    it("has correct adapter metadata", () => {
      const adapter = createPasskeyAdapter()
      expect(adapter.meta.id).toBe("passkey")
      expect(adapter.meta.name).toContain("Passkey")
      expect(adapter.meta.category).toBe("passkey")
      expect(adapter.meta.priority).toBe(30)
    })

    it("isAvailable returns true when PublicKeyCredential exists", () => {
      const adapter = createPasskeyAdapter()
      expect(adapter.meta.isAvailable()).toBe(true)
    })
  })

  describe("connect — registration", () => {
    it("creates credential, derives keypair, returns public key", async () => {
      vi.mocked(startRegistration).mockResolvedValueOnce(mockAttestation as never)

      const adapter = createPasskeyAdapter()
      const result = await adapter.connect("user@test.com")

      expect(result.publicKey).toMatch(/^[a-f0-9]{64}$/)
      expect(result.publicKey.length).toBe(64)
      expect(startRegistration).toHaveBeenCalledOnce()
    })

    it("returns user_rejected error on biometric cancel", async () => {
      const err = new Error("User cancelled")
      err.name = "NotAllowedError"
      vi.mocked(startRegistration).mockRejectedValueOnce(err)

      const adapter = createPasskeyAdapter()
      try {
        await adapter.connect("user@test.com")
        expect.unreachable("Should have thrown")
      } catch (e) {
        const errResp = e as { code: string }
        expect(errResp.code).toBe("user_rejected")
      }
    })
  })

  describe("connect — authentication (returning user with conditional mediation)", () => {
    it("authenticates with stored credential via conditional mediation", async () => {
      localStorageMock.setItem(
        "moistello_passkey_credential",
        JSON.stringify({ credentialId: "test-credential-id-123", email: "user@test.com", publicKeyRaw: "test" })
      )

      vi.mocked(startAuthentication).mockResolvedValueOnce(mockAssertion as never)

      const adapter = createPasskeyAdapter()
      const result = await adapter.connect()

      expect(result.publicKey).toMatch(/^[a-f0-9]{64}$/)
      expect(result.publicKey.length).toBe(64)
      expect(startAuthentication).toHaveBeenCalledWith(
        expect.objectContaining({ useBrowserAutofill: true })
      )
    })

    it("returns user_rejected on auth cancel", async () => {
      localStorageMock.setItem(
        "moistello_passkey_credential",
        JSON.stringify({ credentialId: "test-credential-id-123", email: "user@test.com", publicKeyRaw: "test" })
      )

      const err = new Error("Auth cancelled")
      err.name = "NotAllowedError"
      vi.mocked(startAuthentication).mockRejectedValueOnce(err)

      const adapter = createPasskeyAdapter()
      try {
        await adapter.connect()
        expect.unreachable("Should have thrown")
      } catch (e) {
        const errResp = e as { code: string }
        expect(errResp.code).toBe("user_rejected")
      }
    })
  })

  describe("lifecycle and reset", () => {
    it("disconnect clears session", async () => {
      vi.mocked(startRegistration).mockResolvedValueOnce(mockAttestation as never)
      const adapter = createPasskeyAdapter()
      await adapter.connect("user@test.com")
      expect(await adapter.isConnected()).toBe(true)

      await adapter.disconnect()
      expect(await adapter.isConnected()).toBe(false)
    })

    it("reset removes stored credential and zeros session", async () => {
      vi.mocked(startRegistration).mockResolvedValueOnce(mockAttestation as never)
      const adapter = createPasskeyAdapter()
      await adapter.connect("user@test.com")
      expect(await adapter.isConnected()).toBe(true)

      adapter.reset?.()
      expect(await adapter.isConnected()).toBe(false)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("moistello_passkey_credential")
    })

    it("getPublicKey throws when not connected", async () => {
      const adapter = createPasskeyAdapter()
      try {
        await adapter.getPublicKey()
        expect.unreachable("Should have thrown")
      } catch (e) {
        const errResp = e as { code: string }
        expect(errResp.code).toBe("not_installed")
      }
    })
  })

  describe("signing", () => {
    it("signMessage returns signature and public key", async () => {
      vi.mocked(startRegistration).mockResolvedValueOnce(mockAttestation as never)
      const adapter = createPasskeyAdapter()
      await adapter.connect("user@test.com")

      const result = await adapter.signMessage("hello")
      expect(result.signature).toBeDefined()
      expect(typeof result.signature).toBe("string")
      expect(result.publicKey).toMatch(/^[a-f0-9]{64}$/)
    })

    it("signTransaction returns signed XDR", async () => {
      vi.mocked(startRegistration).mockResolvedValueOnce(mockAttestation as never)
      const adapter = createPasskeyAdapter()
      await adapter.connect("user@test.com")

      const result = await adapter.signTransaction(
        "AAAAAgAAAAAZf2sj4WyFMsaryDj6zV6nib4MdrKSAzQDm/qLPTaNYQAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAABqF+POAAAAAAAAAAEAAAAAAAAAAQAAAABCzwVZeQ9sO2TeFRIN8Lslyqt9wttPtKGKNeiBvzI69wAAAAAAAAAAAJiWgAAAAAAAAAAA"
      )
      expect(result.signedXdr).toBeDefined()
      expect(typeof result.signedXdr).toBe("string")
      expect(result.signedXdr.length).toBeGreaterThan(0)
    })
  })

  describe("crypto key derivation & memory zeroing", () => {
    it("derives deterministic Ed25519 keypair for given credentialId and pepper", async () => {
      const keypair1 = await deriveStellarKeypair("cred-123", "pepper-abc", "user@test.com")
      const keypair2 = await deriveStellarKeypair("cred-123", "pepper-abc", "user@test.com")

      expect(keypair1.publicKey).toEqual(keypair2.publicKey)
      expect(keypair1.secretKey).toEqual(keypair2.secretKey)
    }, 30000)

    it("zeroes memory buffer correctly", () => {
      const buf = new Uint8Array([1, 2, 3, 4, 5])
      secureZeroMemory(buf)
      expect(buf.every(b => b === 0)).toBe(true)
    })
  })
})
