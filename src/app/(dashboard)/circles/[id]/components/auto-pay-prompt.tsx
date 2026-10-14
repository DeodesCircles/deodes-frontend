"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMySubscriptions, useSubscribe } from "@/hooks/use-subscriptions";

interface AutoPayPromptProps {
  circleId: string;
  contributionAmount: number;
  maxMembers: number;
  currency: string;
  frequency: string;
}

const DISMISS_KEY = "deodes-autopay-prompt-dismissed";

/**
 * Auto-pay opt-in for Auto-circle members paying manually (no subscription
 * row): enable auto-pay with one tap, or dismiss to keep paying manually.
 * Dismissal is per-circle in localStorage; AutoDebitCard takes over once a
 * subscription exists. Renders nothing while loading, dismissed, or already
 * subscribed.
 */
export function AutoPayPrompt({
  circleId,
  contributionAmount,
  maxMembers,
  currency,
  frequency,
}: AutoPayPromptProps) {
  const { data, isLoading } = useMySubscriptions();
  const subscribe = useSubscribe();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(`${DISMISS_KEY}:${circleId}`) === "1";
    } catch {
      return false;
    }
  });

  if (isLoading || dismissed) return null;
  const sub = data?.data?.subscriptions?.find((s) => s.circleId === circleId);
  if (sub) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(`${DISMISS_KEY}:${circleId}`, "1");
    } catch {
      // Non-fatal: the prompt just shows again next visit.
    }
    setDismissed(true);
  };

  const enable = () => {
    void subscribe.mutateAsync({
      circleId,
      amount: contributionAmount,
      capTotal: contributionAmount * maxMembers,
    });
  };

  return (
    <section aria-label="Auto-pay" className="rounded-xl border border-aurora-violet/30 bg-aurora-violet/[0.06] p-5">
      <h3 className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
        <Zap className="h-4 w-4 text-aurora-violet" aria-hidden="true" />
        Paying manually
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Turn on auto-pay and {contributionAmount} {currency} pulls from your
        Deodes balance every {frequency} round — skipped, never overdrafted,
        when your balance is short. Pause or cancel anytime.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={enable}
          isLoading={subscribe.isPending}
        >
          Auto-pay from my Deodes balance
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={dismiss}>
          I&apos;ll pay manually
        </Button>
      </div>
    </section>
  );
}
