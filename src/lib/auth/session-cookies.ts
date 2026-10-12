/**
 * Names and attributes for the session cookies.
 *
 * These cookies are the only place an auth token is persisted. They are set
 * exclusively by the route handlers under /api/auth/session and /api/auth/refresh
 * so they can carry `HttpOnly` — no client script ever writes them, and no
 * client script can read them back off `document.cookie`.
 *
 * The `__Secure-` prefix is a browser-enforced contract: a cookie carrying it
 * is rejected unless it is `Secure` and has `Path=/`. Unlike `__Host-`, it
 * permits a `Domain`, so one session spans `deodes.com` and `app.deodes.com`
 * (marketing site + app). Both hosts are served by this same application, so
 * the sibling-subdomain trade-off does not apply. The prefix requires HTTPS,
 * which local development over plain http:// does not have, so the unprefixed
 * names are used outside production — the same split next-auth uses.
 *
 * Edge-safe: this module is imported by middleware, so it must stay free of
 * Node built-ins.
 */

const isProduction = process.env.NODE_ENV === "production"

/** Cookie holding the short-lived access token. */
export const ACCESS_TOKEN_COOKIE = isProduction
  ? "__Secure-deodes_token"
  : "deodes_token"

/** Cookie holding the long-lived refresh token. Never leaves the server. */
export const REFRESH_TOKEN_COOKIE = isProduction
  ? "__Secure-deodes_refresh"
  : "deodes_refresh"

/**
 * Cookie names written by earlier versions of the app, which were readable by
 * script — plus the previous `__Host-` names, which browsers will no longer
 * send now that the domain is shared. Cleared alongside the current ones on
 * logout so an upgrading browser does not keep a stale copy of a live token.
 */
export const LEGACY_TOKEN_COOKIES = [
  "deodes_token",
  "deodes_refresh",
  "__Host-deodes_token",
  "__Host-deodes_refresh",
  "__Host-deodes_csrf",
] as const

export const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 24 // 24 hours
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

/** Cookie holding an independent CSRF token for double-submit protection. */
export const CSRF_TOKEN_COOKIE = isProduction
  ? "__Secure-deodes_csrf"
  : "deodes_csrf"

export const CSRF_TOKEN_MAX_AGE = REFRESH_TOKEN_MAX_AGE

/**
 * Attributes shared by session cookies. `secure` tracks NODE_ENV because
 * a `Secure` cookie is dropped outright over plain http://, which would break
 * local development. `domain` is set in production only, so one login spans
 * `deodes.com` and `app.deodes.com`; localhost keeps host-only cookies.
 */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
  ...(isProduction ? { domain: ".deodes.com" } : {}),
} as const
