import { describe, expect, it } from "vitest"
import type { Contribution } from "@/types"
import { calculateRoundTotals } from "./round-totals"

const contribution = (
  status: Contribution["status"],
  amount: number,
): Contribution => ({
  id: `${status}-${amount}`,
  circleId: "circle-1",
  userId: "user-1",
  roundNumber: 1,
  amount,
  status,
  onTime: status === "confirmed",
  createdAt: "2026-07-25T00:00:00Z",
})

describe("calculateRoundTotals", () => {
  it("counts confirmed and late contributions as settled", () => {
    expect(
      calculateRoundTotals([
        contribution("confirmed", 100),
        contribution("late", 100),
        contribution("pending", 100),
        contribution("failed", 100),
      ]),
    ).toEqual({ settledAmount: 200, settledCount: 2 })
  })
})
