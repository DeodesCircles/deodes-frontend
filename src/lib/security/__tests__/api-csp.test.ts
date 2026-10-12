/**
 * Tests for src/lib/security/api-csp.mjs
 *
 * The static API policy is the header served (via next.config.mjs and the
 * middleware) for every /api/:path* response. It must stay permanently locked
 * down — API routes answer JSON only and must never inherit page-level script
 * allowances.
 */

import { describe, expect, it } from "vitest"
import { API_CSP, API_CSP_DIRECTIVES } from "@/lib/security/api-csp.mjs"

describe("API CSP", () => {
  it("serialises from the canonical directive list", () => {
    expect(API_CSP).toBe(API_CSP_DIRECTIVES.join("; "))
  })

  it("defaults to a fully locked-down policy", () => {
    expect(API_CSP).toContain("default-src 'none'")
    expect(API_CSP).toContain("script-src 'none'")
    expect(API_CSP).toContain("object-src 'none'")
    expect(API_CSP).toContain("frame-ancestors 'none'")
  })

  it("spells out every -src directive explicitly (no implicit fallback)", () => {
    for (const directive of ["script-src", "style-src", "connect-src", "img-src", "font-src", "media-src", "manifest-src", "object-src", "worker-src", "child-src", "frame-src"]) {
      expect(API_CSP).toMatch(new RegExp(`${directive} `))
    }
  })

  it("never allows script execution of any kind", () => {
    expect(API_CSP).not.toContain("unsafe-inline")
    expect(API_CSP).not.toContain("unsafe-eval")
    expect(API_CSP).not.toContain("strict-dynamic")
    expect(API_CSP).not.toContain("nonce-")
  })
})