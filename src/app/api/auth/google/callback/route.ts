import { NextRequest, NextResponse } from "next/server"
import {
  GOOGLE_STATE_COOKIE,
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

function fail(request: NextRequest, reason: string): NextResponse {
  const url = new URL("/login", publicOrigin(request.url))
  url.searchParams.set("error", reason)
  const response = NextResponse.redirect(url)
  response.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/", maxAge: 0 })
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
    if (!tokens.id_token) return fail(request, "google-no-token")
    const profile = await verifyIdToken(tokens.id_token)
    const session = mintSessionJwt(profile)

    const response = NextResponse.redirect(new URL(next, publicOrigin(request.url)))
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
    response.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/", maxAge: 0 })
    return response
  } catch {
    return fail(request, "google-failed")
  }
}
