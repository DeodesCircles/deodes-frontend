import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@simplewebauthn/browser", () => ({
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

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
import { startRegistration, startAuthentication } from "@simplewebauthn/browser"

const mockOptions = {
  challenge: "test-challenge",
  rp: { name: "Moistello", id: "localhost" },
  user: { id: "dXNlckB0ZXN0LmNvbQ", name: "user@test.com", displayName: "user@test.com" },
  pubKeyCredParams: [{ alg: -7, type: "public-key" }],
}

const mockAttestation = {
  id: "test-credential-id-456",
  rawId: "test-credential-id-456",
  response: { clientDataJSON: "{}", attestationObject: "{}" },
}

const mockAssertion = {
  id: "test-credential-id-456",
  rawId: "test-credential-id-456",
  response: { clientDataJSON: "{}", authenticatorData: "{}", signature: "{}" },
}

const keypairResponse = { verified: true, email: "user@test.com", publicKey: "a".repeat(64) }
const signMessageResponse = { signature: "c".repeat(128), publicKey: "a".repeat(64) }

describe("Passkey Integration — end-to-end flows", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    mockFetch.mockReset()
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("/generate-options")) {
        return new Response(JSON.stringify({ options: mockOptions, challenge: "test-challenge" }))
      }
      if (url.includes("/register")) {
        return new Response(JSON.stringify({ ...keypairResponse, credentialId: "test-credential-id-456" }))
      }
      if (url.includes("/auth-verify")) {
        return new Response(JSON.stringify(keypairResponse))
      }
      if (url.includes("/sign-message")) {
        return new Response(JSON.stringify(signMessageResponse))
      }
      return new Response(JSON.stringify({}), { status: 404 })
    })
  })

  it("full passkey registration → auth → sign flow", async () => {
    vi.mocked(startRegistration).mockResolvedValueOnce(mockAttestation as never)
    const adapter = createPasskeyAdapter()
    const regResult = await adapter.connect("user@test.com")
    expect(regResult.publicKey.length).toBe(64)

    const signResult = await adapter.signMessage("hello")
    expect(signResult.publicKey).toBe(regResult.publicKey)

    await adapter.disconnect()

    localStorageMock.setItem(
      "moistello_passkey_credential",
      JSON.stringify({ credentialId: "test-credential-id-456", email: "user@test.com", publicKeyRaw: "test" })
    )

    vi.mocked(startAuthentication).mockResolvedValueOnce(mockAssertion as never)
    const authResult = await adapter.connect()
    expect(authResult.publicKey).toBe(regResult.publicKey)
  })

  it("session restore via stored credential", async () => {
    localStorageMock.setItem(
      "moistello_passkey_credential",
      JSON.stringify({ credentialId: "test-credential-id-456", email: "user@test.com", publicKeyRaw: "test" })
    )
    vi.mocked(startAuthentication).mockResolvedValueOnce(mockAssertion as never)

    const adapter = createPasskeyAdapter()
    const result = await adapter.connect()
    expect(result.publicKey).toMatch(/^[a-f0-9]{64}$/)
  })

  it("derivation determinism across full auth flow", async () => {
    vi.mocked(startRegistration).mockResolvedValueOnce(mockAttestation as never)
    const adapter = createPasskeyAdapter()
    const r1 = await adapter.connect("user@test.com")
    await adapter.disconnect()

    localStorageMock.setItem(
      "moistello_passkey_credential",
      JSON.stringify({ credentialId: "test-credential-id-456", email: "user@test.com", publicKeyRaw: "test" })
    )
    vi.mocked(startAuthentication).mockResolvedValueOnce(mockAssertion as never)
    const r2 = await adapter.connect()

    expect(r1.publicKey).toBe(r2.publicKey)
  })

  it("handles invalid credential error gracefully", async () => {
    localStorageMock.setItem(
      "moistello_passkey_credential",
      JSON.stringify({ credentialId: "bad-credential", email: "user@test.com", publicKeyRaw: "test" })
    )

    const err = new Error("Credential from different RP ID")
    err.name = "SecurityError"
    vi.mocked(startAuthentication).mockRejectedValueOnce(err)

    const adapter = createPasskeyAdapter()
    try {
      await adapter.connect()
      expect.unreachable("Should have thrown")
    } catch (e) {
      const errResp = e as { code: string; message: string }
      expect(errResp.code).toBe("internal")
    }
  })
})
