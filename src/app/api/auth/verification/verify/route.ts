import { NextRequest, NextResponse } from "next/server"
import { verifyCode } from "@/lib/verification/store"

export async function POST(request: NextRequest) {
  let body: { verificationId?: string; code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.verificationId || typeof body.verificationId !== "string") {
    return NextResponse.json({ error: "Verification ID is required." }, { status: 400 })
  }

  if (!body.code || typeof body.code !== "string") {
    return NextResponse.json({ error: "Code is required." }, { status: 400 })
  }

  const result = verifyCode(body.verificationId, body.code)

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error, ...(result.remainingAttempts !== undefined ? { remainingAttempts: result.remainingAttempts } : {}) },
      { status: result.status },
    )
  }

  return NextResponse.json(result)
}
