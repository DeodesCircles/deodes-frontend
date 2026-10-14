import { describe, expect, it } from "vitest"
import { normalizePayout, normalizePayouts } from "@/lib/payout"

describe("normalizePayout", () => {
  it("flattens Go sql.NullString txnHash objects to plain strings", () => {
    const raw = {
      id: "payout-1",
      circleId: "circle-1",
      recipientId: "user-1",
      roundNumber: 1,
      amount: 300,
      feeAmount: 1.5,
      txnHash: { String: "0xabc", Valid: true },
      payoutType: "fixed",
      createdAt: "2026-07-25T00:00:00Z",
    }
    expect(normalizePayout(raw).txnHash).toBe("0xabc")
  })

  it("maps invalid NullString and missing hashes to null", () => {
    expect(
      normalizePayout({ id: "a", txnHash: { String: "", Valid: false } }).txnHash,
    ).toBeNull()
    expect(normalizePayout({ id: "b", txnHash: null }).txnHash).toBeNull()
    expect(normalizePayout({ id: "c" }).txnHash).toBeNull()
  })

  it("passes plain string hashes through untouched", () => {
    expect(
      normalizePayout({ id: "a", txnHash: "0xdeadbeef" }).txnHash,
    ).toBe("0xdeadbeef")
  })
})

describe("normalizePayouts", () => {
  it("normalizes lists and rejects non-arrays", () => {
    expect(normalizePayouts([{ id: "a" }, { id: "b", txnHash: "0x1" }])).toHaveLength(2)
    expect(normalizePayouts(undefined)).toEqual([])
    expect(normalizePayouts(null)).toEqual([])
  })
})
