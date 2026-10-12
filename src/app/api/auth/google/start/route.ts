import { NextRequest, NextResponse } from "next/server"
import {
  GOOGLE_STATE_COOKIE,
  STATE_TTL_SECONDS,
  buildAuthUrl,
  googleConfigured,
  newState,
} from "@/lib/auth/google-server"

export const runtime = "nodejs"

/** Begin Google sign-in: set a CSRF state cookie and redirect to Google. */
export async function GET(request: NextRequest) {
  if (!googleConfigured()) {
    const url = new URL("/login", request.url)
    url.searchParams.set("error", "google-not-configured")
    return NextResponse.redirect(url)
  }
  const next = request.nextUrl.searchParams.get("next")
  const state = newState()
  const response = NextResponse.redirect(buildAuthUrl(state, next))
  response.cookies.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STATE_TTL_SECONDS,
  })
  return response
}
