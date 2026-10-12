import { describe, expect, it, vi } from "vitest"

const HMAC_KEY = "9fe903151d646503421c57f3bd7dc844ca10196ac0003c6bb6189e98748ada41"

vi.stubEnv("WALLET_HMAC_KEY", HMAC_KEY)
vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")

const { mintSessionJwt, splitState, verifySessionJwt } = await import("../google-server")

describe("google session JWT", () => {
  it("round-trips a profile through mint and verify", () => {
    const token = mintSessionJwt({ sub: "123", email: "a@b.com", name: "Ada" })
    const claims = verifySessionJwt(token)
    expect(claims).not.toBeNull()
    expect(claims?.sub).toBe("google:123")
    expect(claims?.email).toBe("a@b.com")
    expect(claims?.provider).toBe("google")
  })

  it("rejects tampered tokens", () => {
    const token = mintSessionJwt({ sub: "123", email: "a@b.com", name: null })
    const [h] = token.split(".")
    const evil = `${h}.${Buffer.from(JSON.stringify({ sub: "google:admin", provider: "google", exp: 9999999999 })).toString("base64url")}.${token.split(".")[2]}`
    expect(verifySessionJwt(evil)).toBeNull()
    expect(verifySessionJwt("not.a.token")).toBeNull()
  })

  it("rejects expired tokens", () => {
    vi.useFakeTimers()
    try {
      const token = mintSessionJwt({ sub: "1", email: "a@b.com", name: null })
      vi.advanceTimersByTime(25 * 3_600_000)
      expect(verifySessionJwt(token)).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe("oauth state", () => {
  it("passes through a safe next path and drops the rest", () => {
    expect(splitState("abc")).toEqual({ state: "abc", next: "/" })
    expect(splitState(`abc.${Buffer.from("/circles").toString("base64url")}`)).toEqual({
      state: "abc",
      next: "/circles",
    })
    expect(splitState(null)).toEqual({ state: "", next: "/" })
  })
})
