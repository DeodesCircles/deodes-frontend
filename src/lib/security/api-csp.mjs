/**
 * Static Content-Security-Policy for API responses.
 *
 * API routes answer JSON, never HTML, so they need none of the page policy's
 * allowances: no nonce, no script sources, no external frames. `default-src
 * 'none'` already makes every omitted directive fall back to `'none'`, but the
 * critical -src directives are spelled out explicitly so the policy is auditable
 * at a glance and stays locked down even in browsers that mis-handle the
 * default-src fallback.
 *
 * The directive list is the single source of truth shared by:
 *  - next.config.mjs (the static `headers()` entry for `/api/:path*`), and
 *  - src/middleware.ts (so `/api/*` requests never inherit the page CSP).
 */

export const API_CSP_DIRECTIVES = [
  "default-src 'none'",
  "script-src 'none'",
  "connect-src 'self'",
  "frame-src 'none'",
  "img-src 'self' data:",
  "style-src 'self'",
  "font-src 'none'",
  "media-src 'none'",
  "manifest-src 'none'",
  "object-src 'none'",
  "worker-src 'none'",
  "child-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
]

export const API_CSP = API_CSP_DIRECTIVES.join("; ")