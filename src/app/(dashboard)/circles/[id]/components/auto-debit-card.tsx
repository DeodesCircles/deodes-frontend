"use client";

import { Pause, Play, XCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useCancelSubscription,
  useMySubscriptions,
  usePauseSubscription,
  useResumeSubscription,
} from "@/hooks/use-subscriptions";
import type { Frequency } from "@/types";

interface AutoDebitCardProps {
  circleId: string;
  contributionAmount: number;
  currency: string;
  frequency: Frequency;
}

/**
 * Member auto-debit management for Auto circles: status, next debit,
 * collected-vs-cap progress, pause / resume / cancel. Renders nothing when
 * the member has no subscription (e.g. joined before subscribing).
 */
export function AutoDebitCard({
  circleId,
  contributionAmount,
  currency,
  frequency,
}: AutoDebitCardProps) {
  const { data, isLoading } = useMySubscriptions();
  const pause = usePauseSubscription();
  const resume = useResumeSubscription();
  const cancel = useCancelSubscription();

  if (isLoading) return null;
  const sub = data?.data?.subscriptions?.find((s) => s.circleId === circleId);
  if (!sub) return null;

  const busy = pause.isPending || resume.isPending || cancel.isPending;
  const collected = Number(sub.collectedTotal) || 0;
  const cap = Number(sub.capTotal) || 0;
  const progress = cap > 0 ? Math.min(100, (collected / cap) * 100) : 0;
  const next = sub.nextDebitAt ? new Date(sub.nextDebitAt).toLocaleDateString() : "—";

  return (
    <section aria-label="Auto-debit" className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
          <Zap className="h-4 w-4 text-aurora-violet" aria-hidden="true" />
          Auto-debit
        </h3>
        <span
          className={
            "rounded-full px-3 py-1 text-[11px] font-heading font-semibold " +
            (sub.status === "active"
              ? "bg-emerald-500/15 text-emerald-300"
              : sub.status === "paused"
                ? "bg-amber-500/15 text-amber-300"
                : "bg-white/10 text-muted-foreground")
          }
        >
          {sub.status}
        </span>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Per round</dt>
          <dd className="font-medium text-foreground">
            {contributionAmount} {currency} · {frequency}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Next debit</dt>
          <dd className="font-medium text-foreground">{sub.status === "active" ? next : "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Collected</dt>
          <dd className="font-medium text-foreground">
            {collected} / {cap} {currency}
          </dd>
        </div>
      </dl>

      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Cap progress"
      >
        <div className="h-full bg-gradient-to-r from-aurora-violet to-emerald-400" style={{ width: `${progress}%` }} />
      </div>

      {(sub.status === "active" || sub.status === "paused") && (
        <div className="mt-4 flex flex-wrap gap-2">
          {sub.status === "active" ? (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Pause className="h-3.5 w-3.5" />}
              onClick={() => pause.mutate(circleId)}
              disabled={busy}
            >
              Pause
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Play className="h-3.5 w-3.5" />}
              onClick={() => resume.mutate(circleId)}
              disabled={busy}
            >
              Resume
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<XCircle className="h-3.5 w-3.5" />}
            onClick={() => cancel.mutate(circleId)}
            disabled={busy}
          >
            Cancel
          </Button>
        </div>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">
        Deodes never overdrafts: short balances skip the round and notify you. Cancel anytime — past debits stand.
      </p>
    </section>
  );
}
