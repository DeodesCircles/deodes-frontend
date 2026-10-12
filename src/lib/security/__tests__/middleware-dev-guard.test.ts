// @vitest-environment node
import { describe, expect, it, vi, afterEach } from "vitest"
import { NextRequest } from "next/server"
import { middleware } from "@/middleware"

function makeRequest(pathname: string, opts?: { cookie?: string }) {
  const url = `http://localhost${pathname}`
  const headers: Record<string, string> = {}
  if (opts?.cookie) headers["cookie"] = opts.cookie
  return new NextRequest(url, { headers })
}

describe("middleware – dev-only API route blocking in production", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const devOnlyPaths = [
    "/api/auth/login",
    "/api/auth/setup",
    "/api/upload",
    "/api/auth/logout",
    "/api/auth",
  ]

  for (const path of devOnlyPaths) {
    it(`returns 404 for ${path} in production`, () => {
      vi.stubEnv("NODE_ENV", "production")
      const res = middleware(makeRequest(path))
      expect(res.status).toBe(404)
    })
  }

  it("returns 404 for sub-paths of dev-only routes in production", () => {
    vi.stubEnv("NODE_ENV", "production")
    const res = middleware(makeRequest("/api/auth/login/extra"))
    expect(res.status).toBe(404)
  })

  for (const path of devOnlyPaths) {
    it(`allows ${path} in development`, () => {
      vi.stubEnv("NODE_ENV", "development")
      const res = middleware(makeRequest(path))
      // In development the middleware should pass through (not 404)
      expect(res.status).not.toBe(404)
    })
  }

  it("does not block non-dev API routes in production", () => {
    vi.stubEnv("NODE_ENV", "production")
    const res = middleware(makeRequest("/api/auth/session"))
    // Should not be a 404 from the dev-route guard
    expect(res.status).not.toBe(404)
  })
})
