import type { Payout } from "@/types"

/**
 * The Go backend serializes `sql.NullString` (txnHash) as
 * `{ String, Valid }` objects instead of plain strings. Normalize those
 * shapes at the fetch boundary so every consumer sees `string | null`.
 */
function nullStringToStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") return value
  if (typeof value === "object") {
    const obj = value as { String?: unknown; Valid?: unknown }
    if (obj.Valid && typeof obj.String === "string" && obj.String !== "") {
      return obj.String
    }
    return null
  }
  return null
}

export function normalizePayout(raw: unknown): Payout {
  const record = raw as Record<string, unknown>
  return {
    ...(record as unknown as Omit<Payout, "txnHash">),
    txnHash: nullStringToStringOrNull(record.txnHash),
  } as Payout
}

export function normalizePayouts(raw: unknown): Payout[] {
  if (!Array.isArray(raw)) return []
  return raw.map(normalizePayout)
}
