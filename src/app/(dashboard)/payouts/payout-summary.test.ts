import { describe, expect, it } from "vitest"
import type { Payout } from "@/types"
import { getCurrentPagePayoutTotal } from "./payout-summary"

const payout = (amount: number): Payout => ({
  id: `payout-${amount}`,
  circleId: "circle-1",
  recipientId: "user-1",
  roundNumber: 1,
  amount,
  payoutType: "fixed",
  createdAt: "2026-07-25T00:00:00Z",
})

describe("getCurrentPagePayoutTotal", () => {
  it("totals only the payouts supplied for the current page", () => {
    expect(getCurrentPagePayoutTotal([payout(125), payout(75)])).toBe(200)
  })
})
