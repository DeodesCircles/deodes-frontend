// @vitest-environment node
// Server-side API routes: run them under the real Node environment instead.
import { describe, it, expect, vi, beforeEach } from "vitest"
import fs from "fs"
import path from "path"
import { NextRequest } from "next/server"

// The real `@/lib/passkey/store` module throws at import time (a pre-existing,
// unrelated bug: it calls a `sweepExpired` function that is never defined in
// that file). Mock it here so these tests exercise the sign routes' own
// logic — auth/ownership checks and server-side key derivation — without
// being blocked by that unrelated breakage.
const TEST_PEPPER = "test-server-pepper-for-signing"
const credentials = new Map<string, { userId: string }>()

vi.mock("@/lib/passkey/store", () => ({
  getCredential: vi.fn(async (credentialId: string) => credentials.get(credentialId)),
  getPepper: vi.fn(() => TEST_PEPPER),
}))

import { POST as signMessage } from "../sign-message/route"
import { deriveEd25519Keypair, signWithSeed, hexEncode } from "@/lib/crypto/key-derivation"

function writeSessionFixture(userId = "user-123") {
  const contentDir = path.join(process.cwd(), "content")
  fs.mkdirSync(contentDir, { recursive: true })
  fs.writeFileSync(path.join(contentDir, "sessions.json"), JSON.stringify([{ token: "session-token", userId, createdAt: Date.now() }], null, 2))
  fs.writeFileSync(path.join(contentDir, "users.json"), JSON.stringify([{ id: userId, username: "demo", role: "user" }], null, 2))
}

let ipCounter = 0
function nextIp() {
  ipCounter += 1
  return `127.0.0.${ipCounter}`
}

function makeRequest(body: unknown, ip = nextIp()) {
  return new NextRequest("http://localhost:1110/api/auth/passkey/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
      Cookie: "deodes_session=session-token",
      Origin: "http://localhost:1110",
    },
    body: JSON.stringify(body),
  })
}

function makeUnauthenticatedRequest(body: unknown) {
  return new NextRequest("http://localhost:1110/api/auth/passkey/test", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:1110" },
    body: JSON.stringify(body),
  })
}

describe("sign-message API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    credentials.clear()
    writeSessionFixture()
  })

  it("returns 401 when unauthenticated", async () => {
    const res = await signMessage(makeUnauthenticatedRequest({ credentialId: "cred-1", message: "hello" }))
    expect(res.status).toBe(401)
  })

  it("returns 400 for missing message", async () => {
    const res = await signMessage(makeRequest({ credentialId: "cred-1" }))
    expect(res.status).toBe(400)
  })

  it("returns 403 when credential belongs to another user", async () => {
    credentials.set("cred-1", { userId: "someone-else" })
    const res = await signMessage(makeRequest({ credentialId: "cred-1", message: "hello" }))
    expect(res.status).toBe(403)
  })

  it("never returns a secretKey field", async () => {
    credentials.set("cred-1", { userId: "user-123" })
    const res = await signMessage(makeRequest({ credentialId: "cred-1", message: "hello" }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.secretKey).toBeUndefined()
  }, 30000)

  it("signs the message server-side with the credential-derived keypair", async () => {
    credentials.set("cred-1", { userId: "user-123" })
    const res = await signMessage(makeRequest({ credentialId: "cred-1", message: "hello" }))
    expect(res.status).toBe(200)
    const data = await res.json()

    const expectedKeypair = await deriveEd25519Keypair("cred-1", TEST_PEPPER)
    expect(data.publicKey).toBe(hexEncode(expectedKeypair.publicKey))

    const { sha256 } = await import("@noble/hashes/sha2.js")
    const hashBytes = sha256(new TextEncoder().encode("hello"))
    const expectedSignature = await signWithSeed(hashBytes, expectedKeypair.secretKey)
    expect(data.signature).toBe(hexEncode(expectedSignature))
  }, 30000)
})
