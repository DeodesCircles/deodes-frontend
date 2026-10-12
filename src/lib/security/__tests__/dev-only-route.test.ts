// @vitest-environment node
import { describe, expect, it, vi, afterEach } from "vitest"
import { blockInProduction } from "../dev-only-route"

describe("blockInProduction", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns null when NODE_ENV is not production", () => {
    vi.stubEnv("NODE_ENV", "development")
    expect(blockInProduction()).toBeNull()
  })

  it("returns a 404 response when NODE_ENV is production", () => {
    vi.stubEnv("NODE_ENV", "production")
    const res = blockInProduction()
    expect(res).not.toBeNull()
    expect(res!.status).toBe(404)
  })

  it("returns a JSON body with error message in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const res = blockInProduction()!
    const body = await res.json()
    expect(body).toEqual({ error: "Not found" })
  })
})
