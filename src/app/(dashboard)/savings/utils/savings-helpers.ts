import type { SavingsGoal } from "@/hooks/use-savings"

/** 0–100 progress for a goal, clamped so over-saving never overflows bars. */
export function progressPercent(goal: Pick<SavingsGoal, "targetAmount" | "currentAmount">): number {
  if (goal.targetAmount <= 0) return 0
  return Math.min(100, Math.max(0, (goal.currentAmount / goal.targetAmount) * 100))
}

/** USDC still needed to reach the target. Never negative. */
export function remainingAmount(goal: Pick<SavingsGoal, "targetAmount" | "currentAmount">): number {
  return Math.max(0, goal.targetAmount - goal.currentAmount)
}

/** Whole days from now until the deadline. Null when no deadline is set. */
export function daysUntil(targetDate: string | null | undefined, now = Date.now()): number | null {
  if (!targetDate) return null
  const end = new Date(`${targetDate}T23:59:59`).getTime()
  if (Number.isNaN(end)) return null
  return Math.ceil((end - now) / 86_400_000)
}

/** True when the deadline passed and the goal is still active. */
export function isOverdue(goal: Pick<SavingsGoal, "targetDate" | "status">, now = Date.now()): boolean {
  if (goal.status !== "active") return false
  const days = daysUntil(goal.targetDate, now)
  return days !== null && days < 0
}

/** "1,250.00 USDC" — Arc USDC only, never XLM. */
export function formatUsdc(amount: number, locale = "en-US"): string {
  return `${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`
}

/** Sort: active first, then nearest deadline, then newest. */
export function sortGoals(goals: SavingsGoal[]): SavingsGoal[] {
  const rank = (s: SavingsGoal["status"]) => (s === "active" ? 0 : s === "completed" ? 1 : 2)
  return [...goals].sort((a, b) => {
    const byStatus = rank(a.status) - rank(b.status)
    if (byStatus !== 0) return byStatus
    if (a.targetDate && b.targetDate) return a.targetDate.localeCompare(b.targetDate)
    if (a.targetDate) return -1
    if (b.targetDate) return 1
    return b.createdAt.localeCompare(a.createdAt)
  })
}
