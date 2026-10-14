"use client";

import Link from "next/link";
import { ArrowLeft, CalendarClock, Pause, Play, XCircle, Zap } from "lucide-react";import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import {
  useCancelSubscription,
  useMySubscriptions,
  usePauseSubscription,
  useResumeSubscription,
} from "@/hooks/use-subscriptions";

/**
 * Upcoming debit calendar: every auto-debit consent in one place with
 * next-debit dates, cap progress, and pause / resume / cancel.
 */
export default function AutoDebitPage() {
  const { data, isLoading, isError } = useMySubscriptions();
  const pause = usePauseSubscription();
  const resume = useResumeSubscription();
  const cancel = useCancelSubscription();
  const busy = pause.isPending || resume.isPending || cancel.isPending;

  const subs = [...(data?.data?.subscriptions ?? [])].sort(
    (a, b) => +new Date(a.nextDebitAt) - +new Date(b.nextDebitAt),
  );

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/wallet" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Back to wallet">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">Auto-debits</h1>
          <p className="text-sm text-muted-foreground">Every scheduled pull, one calendar</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading schedules…</p>
      ) : isError ? (
        <EmptyState
          title="Could not load schedules"
          description="Check your connection and try again."
          icon={<CalendarClock className="h-6 w-6" />}
        />
      ) : subs.length === 0 ? (
        <EmptyState
          title="No auto-debits yet"
          description="Join an Auto circle and consent once — pulls appear here with their next dates."
          icon={<Zap className="h-6 w-6" />}
        />
      ) : (
        <ol className="relative space-y-4 border-l-2 border-aurora-violet/30 pl-6">
          {subs.map((sub) => {
            const collected = Number(sub.collectedTotal) || 0;
            const cap = Number(sub.capTotal) || 0;
            return (
              <li key={sub.id} className="relative rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <span className="absolute -left-[31px] top-5 h-3 w-3 rounded-full bg-aurora-violet ring-4 ring-background" aria-hidden="true" />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-1.5 font-heading text-sm font-semibold text-foreground">
                      <Zap className="h-3.5 w-3.5 text-aurora-violet" aria-hidden="true" />
                      {sub.amount} USDC
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                      {sub.status === "active"
                        ? `Next: ${new Date(sub.nextDebitAt).toLocaleString()}`
                        : `Status: ${sub.status}`}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Collected {collected} / {cap} USDC
                    </p>
                  </div>
                  <Link
                    href={`/circles/${sub.circleId}`}
                    className="shrink-0 text-xs font-medium text-aurora-violet hover:underline"
                  >
                    Open circle
                  </Link>
                </div>
                {sub.status === "active" && (
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" leftIcon={<Pause className="h-3.5 w-3.5" />} onClick={() => pause.mutate(sub.circleId)} disabled={busy}>
                      Pause
                    </Button>
                    <Button variant="ghost" size="sm" leftIcon={<XCircle className="h-3.5 w-3.5" />} onClick={() => cancel.mutate(sub.circleId)} disabled={busy}>
                      Cancel
                    </Button>
                  </div>
                )}
                {sub.status === "paused" && (
                  <div className="mt-3">
                    <Button variant="outline" size="sm" leftIcon={<Play className="h-3.5 w-3.5" />} onClick={() => resume.mutate(sub.circleId)} disabled={busy}>
                      Resume
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
