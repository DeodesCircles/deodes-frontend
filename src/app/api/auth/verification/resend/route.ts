import { NextRequest, NextResponse } from "next/server"
import { resendCode } from "@/lib/verification/store"

export async function POST(request: NextRequest) {
  let body: { verificationId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.verificationId || typeof body.verificationId !== "string") {
    return NextResponse.json({ error: "Verification ID is required." }, { status: 400 })
  }

  const result = resendCode(body.verificationId)

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result)
}
