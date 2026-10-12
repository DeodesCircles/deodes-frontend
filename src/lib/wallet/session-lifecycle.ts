export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function computeSessionExpiry(now: number = Date.now()): number {
  return now + SESSION_TTL_MS
}

export function isSessionExpired(expiresAt: number, now: number = Date.now()): boolean {
  return now > expiresAt
}

export function filterExpiredSessions<T extends { lastConnected: number }>(
  sessions: T[],
  now: number = Date.now(),
): T[] {
  return sessions.filter((s) => now - s.lastConnected < SESSION_TTL_MS)
}
