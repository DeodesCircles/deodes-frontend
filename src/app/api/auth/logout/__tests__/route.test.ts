// @vitest-environment node
import { NextRequest } from "next/server"
import { describe, expect, it, vi, afterEach } from "vitest"
import { POST } from "../route"

describe("POST /api/auth/logout – production guard", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns 404 in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const req = new NextRequest("http://localhost/api/auth/logout", { method: "POST" })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it("returns 404 with JSON error body in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const req = new NextRequest("http://localhost/api/auth/logout", { method: "POST" })
    const res = await POST(req)
    const body = await res.json()
    expect(body).toEqual({ error: "Not found" })
  })

  it("allows the route in development", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const req = new NextRequest("http://localhost/api/auth/logout", { method: "POST" })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})
