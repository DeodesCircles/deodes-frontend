import type { Contribution } from "@/types"

export function calculateRoundTotals(contributions: Contribution[]) {
  const settled = contributions.filter(
    (contribution) =>
      contribution.status === "confirmed" || contribution.status === "late",
  )

  return {
    settledAmount: settled.reduce(
      (total, contribution) => total + contribution.amount,
      0,
    ),
    settledCount: settled.length,
  }
}
