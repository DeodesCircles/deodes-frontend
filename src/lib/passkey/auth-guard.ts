import fs from "fs"
import path from "path"
import { NextRequest, NextResponse } from "next/server"

const SESSIONS_FILE = path.join(process.cwd(), "content", "sessions.json")
const USERS_FILE = path.join(process.cwd(), "content", "users.json")
const RATE_LIMITS = new Map<string, { count: number; resetAt: number }>()

export type AuthenticatedUser = {
  id: string
  username?: string
  role?: string
}

function readJsonFile<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return []
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T[]
  } catch {
    return []
  }
}

export function getAuthenticatedUser(req: NextRequest): AuthenticatedUser | null {
  const cookie = req.cookies.get("moistello_session")
  if (!cookie?.value) return null

  const sessions = readJsonFile<{ token: string; userId: string; createdAt: number }>(SESSIONS_FILE)
  const session = sessions.find((item) => item.token === cookie.value)
  if (!session) return null

  if (Date.now() - session.createdAt > 7 * 24 * 60 * 60 * 1000) return null

  const users = readJsonFile<{ id: string; username?: string; role?: string }>(USERS_FILE)
  const user = users.find((item) => item.id === session.userId)
  if (!user) return null

  return { id: user.id, username: user.username, role: user.role }
}

export function requireAuthenticatedUser(req: NextRequest) {
  const user = getAuthenticatedUser(req)
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }),
    }
  }

  return { ok: true as const, user }
}

export function checkRateLimit(req: NextRequest, endpoint: string, limit = 5, windowMs = 60_000) {
  const forwarded = req.headers.get("x-forwarded-for")
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown"
  const key = `${endpoint}:${ip}`
  const now = Date.now()
  const bucket = RATE_LIMITS.get(key)

  if (!bucket || now >= bucket.resetAt) {
    RATE_LIMITS.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterMs: windowMs }
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: Math.max(0, bucket.resetAt - now) }
  }

  bucket.count += 1
  return { allowed: true, retryAfterMs: Math.max(0, bucket.resetAt - now) }
}
