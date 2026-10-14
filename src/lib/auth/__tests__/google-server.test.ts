import { describe, expect, it, vi } from "vitest"

const HMAC_KEY = "9fe903151d646503421c57f3bd7dc844ca10196ac0003c6bb6189e98748ada41"

vi.stubEnv("WALLET_HMAC_KEY", HMAC_KEY)
vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")

const { splitState } = await import("../google-server")

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
