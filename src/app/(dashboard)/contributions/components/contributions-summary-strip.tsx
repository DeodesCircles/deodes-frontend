"use client";

import { formatCurrency } from "@/lib/formatters";
import type { ContributionSummary } from "@/lib/contributions/summary";

interface Props {
  summary: ContributionSummary;
}

export function ContributionsSummaryStrip({ summary }: Props) {
  return (
    <section aria-label="Contribution summary" className="border-l-4 border-l-aurora-violet pl-5">
      <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Total contributed</p>
          <p className="font-heading text-5xl font-bold gradient-text leading-none">
            {formatCurrency(summary.totalContributed, "USDC")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 pb-1">
          <span className="inline-flex items-center rounded-full border border-emerald-400/40 px-3 py-1 text-xs font-medium">
            {summary.confirmedCount} confirmed
          </span>
          <span className="inline-flex items-center rounded-full border border-amber-400/40 px-3 py-1 text-xs font-medium">
            {summary.contributionCount} total
          </span>
          <span className="inline-flex items-center rounded-full border border-aurora-violet/40 px-3 py-1 text-xs font-medium">
            {summary.currentStreak} week streak
          </span>
        </div>
      </div>
      <div aria-hidden="true" className="mt-4 h-px w-full bg-gradient-to-r from-aurora-violet via-transparent to-transparent" />
    </section>
  );
}
