"use client"

import React from "react"
import type { MoiScoreBreakdown } from "@/types"

export interface ReputationBreakdownProps {
  breakdown: MoiScoreBreakdown
}

const FACTORS: Array<{
  key: keyof MoiScoreBreakdown
  label: string
  weight: number
  color: string
}> = [
  { key: "streaks", label: "Streaks", weight: 35, color: "bg-aurora-violet" },
  { key: "completions", label: "Completions", weight: 30, color: "bg-cyan-400" },
  { key: "volume", label: "Volume", weight: 20, color: "bg-emerald-400" },
  { key: "recency", label: "Recency", weight: 15, color: "bg-amber-400" },
]

export function ReputationBreakdown({ breakdown }: ReputationBreakdownProps) {
  return (
    <section
      className="border-y border-foreground/10 py-6"
      aria-labelledby="reputation-breakdown-title"
      data-testid="reputation-breakdown"
    >
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-aurora-violet">
            Score anatomy
          </p>
          <h2 id="reputation-breakdown-title" className="mt-2 font-heading text-2xl font-bold">
            Reputation breakdown
          </h2>
        </div>
        <span className="rounded-full border border-foreground/10 px-3 py-1 font-mono text-xs text-muted-foreground">
          4 factors
        </span>
      </div>
      <div className="space-y-5">
        {FACTORS.map(({ key, label, weight, color }) => {
          const value = Math.max(0, breakdown[key])
          const width = Math.min(100, value)
          return (
            <div key={key}>
              <div className="mb-2 flex items-baseline justify-between gap-4">
                <span className="font-heading text-sm font-semibold">{label}</span>
                <span className="font-mono text-sm text-muted-foreground">
                  {value} <span className="text-xs">· {weight}% weight</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
