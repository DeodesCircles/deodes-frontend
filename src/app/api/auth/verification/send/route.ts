import { NextRequest, NextResponse } from "next/server"
import { sendCode } from "@/lib/verification/store"

export async function POST(request: NextRequest) {
  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.email || typeof body.email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 })
  }

  const result = sendCode(body.email)

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ data: result })
}
