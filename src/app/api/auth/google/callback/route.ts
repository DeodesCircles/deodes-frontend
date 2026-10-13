import { NextRequest, NextResponse } from "next/server"
import {
  GOOGLE_STATE_COOKIE,
  cookieDomain,
  defaultNext,
  exchangeCode,
  mintSessionJwt,
  publicOrigin,
  splitState,
  verifyIdToken,
} from "@/lib/auth/google-server"
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  CSRF_TOKEN_COOKIE,
  CSRF_TOKEN_MAX_AGE,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/session-cookies"
import crypto from "crypto"

function clientIp(request: NextRequest): string {
  return (
    (request as NextRequest & { ip?: string }).ip?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  )
}

/**
 * Explicit audit log for Google sign-ins (operator-requested).
 * NOTE: intentionally uses direct stdout instead of @/lib/logger, because
 * the shared logger redacts emails to "[email]". Only email/sub/name/ip/ua
 * are logged — never codes, tokens, or secrets.
 */
function auditGoogleLogin(fields: Record<string, unknown>): void {
  const line = JSON.stringify({ tag: "google-login", ts: new Date().toISOString(), ...fields })
  // eslint-disable-next-line no-console
  console.info(line)
}

function fail(request: NextRequest, reason: string): NextResponse {
  const url = new URL("/login", publicOrigin(request.url))
  url.searchParams.set("error", reason)
  const response = NextResponse.redirect(url)
  response.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/", ...cookieDomain(), maxAge: 0 })
  return response
}

/** Google OAuth callback: verify identity, mint a DEODES session, go home. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  if (params.get("error") !== null) return fail(request, "google-cancelled")

  const { state, next } = splitState(params.get("state"))
  const cookieState = request.cookies.get(GOOGLE_STATE_COOKIE)?.value
  if (!state || !cookieState || state !== cookieState) {
    return fail(request, "google-bad-state")
  }

  const code = params.get("code")
  if (!code) return fail(request, "google-no-code")

  try {
    const tokens = await exchangeCode(code)
    if (!tokens.id_token) {
      auditGoogleLogin({ ok: false, reason: "google-no-token", ip: clientIp(request) })
      return fail(request, "google-no-token")
    }
    const profile = await verifyIdToken(tokens.id_token)
    auditGoogleLogin({
      ok: true,
      email: profile.email,
      google_sub: profile.sub,
      name: profile.name,
      ip: clientIp(request),
      ua: request.headers.get("user-agent")?.slice(0, 200) ?? null,
    })
    const session = mintSessionJwt(profile)

    const response = NextResponse.redirect(
      next === "/" ? defaultNext() : new URL(next, publicOrigin(request.url)),
    )
    response.cookies.set(ACCESS_TOKEN_COOKIE, session, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    })
    response.cookies.set(CSRF_TOKEN_COOKIE, crypto.randomBytes(32).toString("base64url"), {
      ...SESSION_COOKIE_OPTIONS,
      httpOnly: false,
      maxAge: CSRF_TOKEN_MAX_AGE,
    })
    // No separate backend refresh token in the Google flow yet: reuse the
    // session JWT so later refresh attempts have something to send.
    response.cookies.set(REFRESH_TOKEN_COOKIE, session, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    })
    response.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/", ...cookieDomain(), maxAge: 0 })
    return response
  } catch (err) {
    auditGoogleLogin({ ok: false, reason: "google-failed", ip: clientIp(request), err: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200) })
    return fail(request, "google-failed")
  }
}
