import { NextRequest, NextResponse } from "next/server";
import { blockInProduction } from "@/lib/security/dev-only-route";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest) {
  // Local-development scaffolding — clears the dev-only moistello_session cookie.
  const blocked = blockInProduction();
  if (blocked) return blocked;

  const response = NextResponse.json({ success: true });
  response.cookies.set("moistello_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
