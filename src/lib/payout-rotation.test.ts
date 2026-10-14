import { describe, expect, it } from "vitest"
import {
  activeMembers,
  paidRecipientIds,
  payoutCompletion,
  remainingRecipients,
  withdrawalLockMessage,
} from "@/lib/payout-rotation"
import type { CircleMember, Payout } from "@/types"

const members = [
  { userId: "a", status: "active" },
  { userId: "b", status: "active" },
  { userId: "c", status: "active" },
  { userId: "gone", status: "exited" },
] as CircleMember[]

const payoutTo = (recipientId: string, roundNumber: number) =>
  ({ recipientId, roundNumber }) as Payout

describe("remainingRecipients", () => {
  it("returns active unpaid members in order, excluding the paid", () => {
    expect(remainingRecipients(members, [payoutTo("a", 1)])).toEqual([
      { userId: "b", status: "active" },
      { userId: "c", status: "active" },
    ])
  })

  it("returns everyone when no payouts exist yet", () => {
    expect(remainingRecipients(members, [])).toHaveLength(3)
  })

  it("is empty once the rotation is complete", () => {
    const payouts = [payoutTo("a", 1), payoutTo("b", 2), payoutTo("c", 3)]
    expect(remainingRecipients(members, payouts)).toEqual([])
  })

  it("ignores exited members — they leave the rotation", () => {
    expect(activeMembers(members).map((m) => m.userId)).toEqual(["a", "b", "c"])
    expect(paidRecipientIds([payoutTo("gone", 1)])).toContain("gone")
    // A payout to an exited member does not unblock anyone.
    expect(payoutCompletion(members, [payoutTo("gone", 1)]).complete).toBe(false)
  })
})

describe("payoutCompletion", () => {
  it("counts paid active members and reports incompleteness", () => {
    const completion = payoutCompletion(members, [payoutTo("a", 1)])
    expect(completion).toEqual({
      paidCount: 1,
      totalCount: 3,
      remainingCount: 2,
      complete: false,
    })
  })

  it("is complete only when every active member has been paid", () => {
    const payouts = [payoutTo("a", 1), payoutTo("b", 2), payoutTo("c", 3)]
    const completion = payoutCompletion(members, payouts)
    expect(completion.complete).toBe(true)
    expect(completion.remainingCount).toBe(0)
  })

  it("is never complete with zero active members", () => {
    expect(payoutCompletion([], []).complete).toBe(false)
  })
})

describe("withdrawalLockMessage", () => {
  it("states paid/total rounds plainly", () => {
    expect(withdrawalLockMessage(payoutCompletion(members, [payoutTo("a", 1)]))).toBe(
      "Withdrawals unlock after every member has been paid — 1 of 3 rounds paid so far.",
    )
  })
})
