import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock simplewebauthn
vi.mock("@simplewebauthn/browser", () => ({
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
}))

// Polyfill PublicKeyCredential for jsdom
Object.defineProperty(globalThis, "PublicKeyCredential", {
  value: class MockPublicKeyCredential {},
  configurable: true,
})

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(global, "localStorage", { value: localStorageMock })

import { createPasskeyAdapter } from "../adapters/passkey"
import { startRegistration } from "@simplewebauthn/browser"

const validUnsignedXdr =
  "AAAAAgAAAAAZf2sj4WyFMsaryDj6zV6nib4MdrKSAzQDm/qLPTaNYQAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAABqF+POAAAAAAAAAAEAAAAAAAAAAQAAAABCzwVZeQ9sO2TeFRIN8Lslyqt9wttPtKGKNeiBvzI69wAAAAAAAAAAAJiWgAAAAAAAAAAA"

const mockSignedXdr =
  "AAAAAgAAAAAZf2sj4WyFMsaryDj6zV6nib4MdrKSAzQDm/qLPTaNYQAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAABqF+POAAAAAAAAAAEAAAAAAAAAAQAAAABCzwVZeQ9sO2TeFRIN8Lslyqt9wttPtKGKNeiBvzI69wAAAAAAAAAAAJiWgAAAAAAAAAABPTaNYQAAAEBATUu5C3pxDGuXruyHgDvDHwgJZBlklafJMM8VSy2EMTUhk4Ez+ewCF/sekMAX5VynMxCdtfsd/KHR3gvI0HYK"

const mockAttestation = {
  id: "test-credential-id-123",
  rawId: "test-credential-id-123",
  response: { clientDataJSON: "{}", attestationObject: "{}" },
}

const keypairResponse = { verified: true, email: "user@test.com", publicKey: "a".repeat(64) }

function lastSignTransactionBody(): Record<string, unknown> {
  const call = mockFetch.mock.calls.find(([url]) => String(url).includes("/sign-transaction"))
  if (!call) throw new Error("sign-transaction was never called")
  return JSON.parse(call[1].body)
}

describe("signTransaction — comprehensive", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    mockFetch.mockReset()
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("/generate-options")) {
        return new Response(JSON.stringify({ options: { challenge: "x" }, challenge: "test" }))
      }
      if (url.includes("/register")) {
        return new Response(JSON.stringify({ ...keypairResponse, credentialId: "test-credential-id-123" }))
      }
      if (url.includes("/sign-transaction")) {
        return new Response(JSON.stringify({ signedXdr: mockSignedXdr }))
      }
      return new Response(JSON.stringify({}), { status: 404 })
    })
  })

  it("returns a signed XDR string different from input", async () => {
    vi.mocked(startRegistration).mockResolvedValueOnce(mockAttestation as never)
    const adapter = createPasskeyAdapter()
    await adapter.connect()

    const result = await adapter.signTransaction(validUnsignedXdr)

    expect(result.signedXdr).toBeDefined()
    expect(typeof result.signedXdr).toBe("string")
    expect(result.signedXdr.length).toBeGreaterThan(0)
    expect(result.signedXdr).not.toEqual(validUnsignedXdr)
  })

  it("throws not_installed when no active session", async () => {
    const adapter = createPasskeyAdapter()
    try {
      await adapter.signTransaction(validUnsignedXdr)
      expect.unreachable("Should have thrown")
    } catch (e) {
      const err = e as { code: string; message: string }
      expect(err.code).toBe("not_installed")
      expect(err.message).toContain("Not authenticated")
    }
  })

  it("never sends a secret key — only credentialId and xdr are forwarded to the server", async () => {
    vi.mocked(startRegistration).mockResolvedValueOnce(mockAttestation as never)
    const adapter = createPasskeyAdapter()
    await adapter.connect()

    await adapter.signTransaction(validUnsignedXdr)
    const body = lastSignTransactionBody()
    expect(body.credentialId).toBe("test-credential-id-123")
    expect(body.xdr).toBe(validUnsignedXdr)
    expect(body).not.toHaveProperty("secretKey")
  })

  it("passes mainnet passphrase to the sign-transaction endpoint", async () => {
    vi.mocked(startRegistration).mockResolvedValueOnce(mockAttestation as never)
    const adapter = createPasskeyAdapter()
    await adapter.connect()

    await adapter.signTransaction(validUnsignedXdr, { network: "mainnet" })
    expect(lastSignTransactionBody().networkPassphrase).toBe("Public Global Stellar Network ; September 2015")
  })

  it("passes testnet passphrase by default", async () => {
    vi.mocked(startRegistration).mockResolvedValueOnce(mockAttestation as never)
    const adapter = createPasskeyAdapter()
    await adapter.connect()

    await adapter.signTransaction(validUnsignedXdr)
    expect(lastSignTransactionBody().networkPassphrase).toBe("Test SDF Network ; September 2015")
  })

  it("uses networkPassphrase option over network shorthand", async () => {
    vi.mocked(startRegistration).mockResolvedValueOnce(mockAttestation as never)
    const adapter = createPasskeyAdapter()
    await adapter.connect()

    await adapter.signTransaction(validUnsignedXdr, {
      network: "testnet",
      networkPassphrase: "Custom Network ; 2024",
    })
    expect(lastSignTransactionBody().networkPassphrase).toBe("Custom Network ; 2024")
  })

  it("returns the signedXdr from the server response verbatim", async () => {
    vi.mocked(startRegistration).mockResolvedValueOnce(mockAttestation as never)
    const adapter = createPasskeyAdapter()
    await adapter.connect()

    const result = await adapter.signTransaction(validUnsignedXdr)
    expect(result.signedXdr).toBe(mockSignedXdr)
  })
})

describe("signTransaction — error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    mockFetch.mockReset()
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("/generate-options")) {
        return new Response(JSON.stringify({ options: { challenge: "x" }, challenge: "test" }))
      }
      if (url.includes("/register")) {
        return new Response(JSON.stringify({ ...keypairResponse, credentialId: "test-credential-id-123" }))
      }
      return new Response(JSON.stringify({}), { status: 404 })
    })
  })

  it("throws internal error with the server's error message on invalid XDR", async () => {
    vi.mocked(startRegistration).mockResolvedValueOnce(mockAttestation as never)
    const adapter = createPasskeyAdapter()
    await adapter.connect()

    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("/sign-transaction")) {
        return new Response(JSON.stringify({ error: "invalid_xdr" }), { status: 400 })
      }
      return new Response(JSON.stringify({}), { status: 404 })
    })

    try {
      await adapter.signTransaction("not-valid-base64!!!")
      expect.unreachable("Should have thrown")
    } catch (e) {
      const err = e as { code: string; message: string; adapter: string }
      expect(err.code).toBe("internal")
      expect(err.message).toBe("invalid_xdr")
      expect(err.adapter).toBe("passkey")
    }
  })

  it("preserves adapter field in error objects when the server request fails", async () => {
    vi.mocked(startRegistration).mockResolvedValueOnce(mockAttestation as never)
    const adapter = createPasskeyAdapter()
    await adapter.connect()

    mockFetch.mockImplementation(async () => new Response(JSON.stringify({ error: "internal_error" }), { status: 500 }))

    try {
      await adapter.signTransaction(validUnsignedXdr)
      expect.unreachable("Should have thrown")
    } catch (e) {
      const err = e as { adapter: string }
      expect(err.adapter).toBe("passkey")
    }
  })
})
