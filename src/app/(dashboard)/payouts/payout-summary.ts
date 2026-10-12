import type { Payout } from "@/types"

export function getCurrentPagePayoutTotal(payouts: Payout[]): number {
  return payouts.reduce((total, payout) => total + payout.amount, 0)
}
