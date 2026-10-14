"use client"

import { useState } from "react"
import { Lock, LogOut, CircleAlert, CircleCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getErrorMessage } from "@/lib/api-client"
import { useExitCircle } from "@/hooks/use-circles"
import { useCirclePayouts } from "@/hooks/use-payouts"
import { payoutCompletion, withdrawalLockMessage } from "@/lib/payout-rotation"
import type { Circle, CircleMember } from "@/types"

interface CircleExitSectionProps {
  circle: Circle
  members: CircleMember[]
  isMember: boolean
  isOrganizer: boolean
}

/**
 * Member withdrawal from a circle (Rule 1: no withdrawals until every
 * member has been paid).
 *
 * Active circles lock withdrawals until every active member has received a
 * payout; the backend enforces this with 403 PAYOUTS_INCOMPLETE and this
 * section mirrors that state with counts so the block is never a mystery.
 * Pending/completed circles have nothing (left) to pay out — the button
 * shows directly. Organizers cannot exit and non-members have nothing to
 * withdraw, so both render nothing.
 */
export function CircleExitSection({ circle, members, isMember, isOrganizer }: CircleExitSectionProps) {
  const [error, setError] = useState<string | null>(null)
  const exitCircle = useExitCircle()
  // Full history (limit 100 = max members): the page's recent-payouts slice
  // is too short to decide rotation completion.
  const { data: payoutData, isLoading: payoutsLoading } = useCirclePayouts(
    circle.id,
    { limit: 100 },
    { enabled: isMember && !isOrganizer },
  )

  if (!isMember || isOrganizer) return null

  const payouts = payoutData?.payouts ?? []
  const completion = payoutCompletion(members, payouts)
  const isActive = circle.status === "active"
  const locked = isActive && (payoutsLoading || !completion.complete)

  const handleExit = async () => {
    setError(null)
    try {
      await exitCircle.mutateAsync({ circleId: circle.id })
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  if (locked && !payoutsLoading) {
    return (
      <section aria-label="Withdraw from circle" className="border-l-4 border-l-amber-400 pl-4">
        <div className="flex flex-wrap items-center gap-2">
          <Lock className="h-4 w-4 text-amber-400" aria-hidden="true" />
          <h3 className="font-heading text-base font-semibold text-foreground">Withdraw from circle</h3>
          <span className="rounded-full bg-amber-400/15 px-2.5 py-0.5 font-mono text-2xs font-semibold text-amber-400">
            Locked · {completion.paidCount} of {completion.totalCount} paid
          </span>
        </div>
        <p className="mt-1 font-body text-sm text-muted-foreground" role="status">
          {withdrawalLockMessage(completion)} You can withdraw once all{" "}
          {completion.totalCount} round{completion.totalCount === 1 ? "" : "s"} are paid out.
        </p>
        <ul aria-label="Members awaiting payout" className="mt-3 flex flex-wrap gap-2">
          {members
            .filter((m) => m.status === "active")
            .map((m) => {
              const paid = payouts.some((p) => p.recipientId === m.userId)
              return (
                <li
                  key={m.userId}
                  className={
                    paid
                      ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 font-body text-xs text-emerald-400"
                      : "inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/20 px-3 py-1 font-body text-xs text-muted-foreground"
                  }
                >
                  {paid && <CircleCheck className="h-3 w-3" aria-hidden="true" />}
                  {m.userName ?? m.userId}
                  <span className="font-mono text-2xs">{paid ? "paid" : "waiting"}</span>
                </li>
              )
            })}
        </ul>
        {error && (
          <p role="alert" className="mt-3 flex items-start gap-2 font-body text-sm text-red-400">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
      </section>
    )
  }

  if (locked) {
    return (
      <section aria-label="Withdraw from circle" className="border-l-4 border-l-amber-400 pl-4">
        <p className="font-body text-sm text-muted-foreground" role="status">
          Checking payout status…
        </p>
      </section>
    )
  }

  return (
    <section aria-label="Withdraw from circle" className="border-l-4 border-l-emerald-400 pl-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-heading text-base font-semibold text-foreground">Withdraw from circle</h3>
        <span className="rounded-full bg-emerald-400/15 px-2.5 py-0.5 font-mono text-2xs font-semibold text-emerald-400">
          {isActive ? "All rounds paid" : "Open"}
        </span>
      </div>
      <p className="mt-1 font-body text-sm text-muted-foreground">
        {isActive
          ? "Every member has been paid — you can leave the circle."
          : "This circle has no pending payouts — you can leave at any time."}
      </p>
      <div className="mt-3">
        <Button
          variant="outline"
          size="sm"
          leftIcon={<LogOut className="h-4 w-4" />}
          onClick={handleExit}
          isLoading={exitCircle.isPending}
        >
          Leave circle
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 flex items-start gap-2 font-body text-sm text-red-400">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </section>
  )
}
