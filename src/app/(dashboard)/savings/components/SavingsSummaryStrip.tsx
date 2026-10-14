"use client"

import type { SavingsSummary } from "@/hooks/use-savings"
import { formatUsdc } from "../utils/savings-helpers"

interface SavingsSummaryStripProps {
  summary: SavingsSummary | null
  obligations: { id: string; name: string; targetAmount: number; currentAmount: number; targetDate?: string | null }[]
}

/**
 * Full-bleed callout strip: giant saved total over a dot-grid, with pill
 * counters for active goals, streak, and upcoming auto-reserve obligations.
 */
export function SavingsSummaryStrip({ summary, obligations }: SavingsSummaryStripProps) {
  const saved = summary?.totalSaved ?? 0
  const target = summary?.totalTarget ?? 0
  const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0

  return (
    <section
      aria-label="Savings overview"
      data-testid="savings-summary"
      className="relative -mx-4 overflow-hidden bg-gradient-to-r from-aurora-violet/25 via-background to-emerald-400/15 px-4 py-8 sm:-mx-6 sm:px-6"
    >
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
      >
        <defs>
          <pattern id="savings-dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="currentColor" className="text-white/20" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#savings-dots)" />
      </svg>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-aurora-violet/20 blur-3xl"
      />

      <div className="relative">
        <p className="font-heading text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Total saved · USDC on Arc
        </p>
        <p className="mt-1 font-mono text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
          {formatUsdc(saved)}
        </p>
        <div
          className="mt-4 h-2 max-w-xl overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Overall savings progress"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-aurora-violet via-emerald-400 to-emerald-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {Math.round(pct)}% of {formatUsdc(target)} across {summary?.totalGoals ?? 0}{" "}
          {(summary?.totalGoals ?? 0) === 1 ? "vault" : "vaults"}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-foreground">
            <strong className="font-mono">{summary?.activeGoals ?? 0}</strong> active
          </span>
          <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-foreground">
            <strong className="font-mono">{summary?.completedGoals ?? 0}</strong> completed
          </span>
          <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-foreground">
            <strong className="font-mono">{summary?.savingsStreak ?? 0}</strong> streak
          </span>
          {obligations.slice(0, 3).map((g) => (
            <span
              key={g.id}
              className="rounded-full bg-amber-400/15 px-3 py-1.5 text-xs text-amber-400"
            >
              {g.name} · {formatUsdc(Math.max(0, g.targetAmount - g.currentAmount))} due
              {g.targetDate ? ` ${g.targetDate}` : ""}
            </span>
          ))}
          {obligations.length === 0 && (
            <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-muted-foreground">
              No auto-reserve obligations due
            </span>
          )}
        </div>
      </div>

      <div
        aria-hidden="true"
        className="relative mt-6 h-px bg-gradient-to-r from-aurora-violet/60 via-white/10 to-emerald-400/60"
      />
    </section>
  )
}
