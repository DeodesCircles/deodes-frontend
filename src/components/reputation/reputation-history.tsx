"use client"

import React from "react"
import { format } from "date-fns"
import type { MoiScoreHistoryEntry } from "@/types"

export interface ReputationHistoryProps {
  history: MoiScoreHistoryEntry[]
}

export function ReputationHistory({ history }: ReputationHistoryProps) {
  if (history.length === 0) {
    return (
      <section
        className="border border-dashed border-foreground/20 px-6 py-10 text-center"
        data-testid="reputation-history"
      >
        <h2 className="font-heading text-xl font-bold">Score history</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your score changes will appear here after your first reputation event.
        </p>
      </section>
    )
  }

  const scores = history.map((entry) => Math.min(1000, Math.max(0, entry.score)))
  const points = scores
    .map((score, index) => {
      const x = history.length === 1 ? 50 : (index / (history.length - 1)) * 100
      const y = 100 - score / 10
      return `${x},${y}`
    })
    .join(" ")

  return (
    <section aria-labelledby="reputation-history-title" data-testid="reputation-history">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-emerald-400">
            Momentum
          </p>
          <h2 id="reputation-history-title" className="mt-2 font-heading text-2xl font-bold">
            Score history
          </h2>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {history.length} {history.length === 1 ? "event" : "events"}
        </span>
      </div>
      <div className="border-b border-dotted border-foreground/25 pb-6">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-44 w-full overflow-visible"
          role="img"
          aria-label="MoiScore history chart"
        >
          {[25, 50, 75].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              vectorEffect="non-scaling-stroke"
              className="stroke-foreground/10"
              strokeDasharray="3 5"
            />
          ))}
          <polyline
            points={points}
            fill="none"
            vectorEffect="non-scaling-stroke"
            className="stroke-aurora-violet"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {scores.map((score, index) => {
            const x = history.length === 1 ? 50 : (index / (history.length - 1)) * 100
            const y = 100 - score / 10
            return <circle key={`${history[index].date}-${index}`} cx={x} cy={y} r="2" className="fill-emerald-400" />
          })}
        </svg>
      </div>
      <ol className="mt-5 grid gap-3 sm:grid-cols-2">
        {history.map((entry, index) => (
          <li key={`${entry.date}-${index}`} className="flex items-start gap-3">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-aurora-violet" />
            <div>
              <p className="font-heading text-sm font-semibold">
                {entry.score} points
                {entry.reason ? ` · ${entry.reason}` : ""}
              </p>
              <time className="font-mono text-xs text-muted-foreground" dateTime={entry.date}>
                {format(new Date(entry.date), "MMM d, yyyy")}
              </time>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
