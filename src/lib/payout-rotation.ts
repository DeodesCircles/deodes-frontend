import type { CircleMember, Payout } from "@/types"

export interface PayoutCompletion {
  paidCount: number
  totalCount: number
  remainingCount: number
  complete: boolean
}

/** Active members only — exited/removed members leave the rotation. */
export function activeMembers<T extends Pick<CircleMember, "status">>(members: T[]): T[] {
  return members.filter((m) => m.status === "active")
}

/** User IDs that have received at least one payout in this circle. */
export function paidRecipientIds(payouts: Pick<Payout, "recipientId">[]): Set<string> {
  return new Set(payouts.map((p) => p.recipientId))
}

/**
 * Remaining rotation recipients: active members with no payout yet, in
 * member order. The organizer's trigger offers these first so random draws
 * cycle through unpaid members and never repeat within a rotation.
 */
export function remainingRecipients<T extends Pick<CircleMember, "userId" | "status">>(
  members: T[],
  payouts: Pick<Payout, "recipientId">[],
): T[] {
  const paid = paidRecipientIds(payouts)
  return activeMembers(members).filter((m) => !paid.has(m.userId))
}

/**
 * Withdrawal/payout completion: every active member paid at least once.
 * A circle with no active members is never "complete" — there is nobody
 * whose payout could unlock withdrawals.
 */
export function payoutCompletion(
  members: Pick<CircleMember, "userId" | "status">[],
  payouts: Pick<Payout, "recipientId">[],
): PayoutCompletion {
  const active = activeMembers(members)
  const paid = paidRecipientIds(payouts)
  const paidCount = active.filter((m) => paid.has(m.userId)).length
  return {
    paidCount,
    totalCount: active.length,
    remainingCount: active.length - paidCount,
    complete: active.length > 0 && paidCount >= active.length,
  }
}

/** Clear lock copy for the Rule-1 withdrawal gate. */
export function withdrawalLockMessage(completion: PayoutCompletion): string {
  return (
    `Withdrawals unlock after every member has been paid — ` +
    `${completion.paidCount} of ${completion.totalCount} rounds paid so far.`
  )
}
