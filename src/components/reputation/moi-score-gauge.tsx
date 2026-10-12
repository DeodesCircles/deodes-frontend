"use client"

import React from "react"
import { cn } from "@/lib/cn"

export interface MoiScoreGaugeProps {
  score: number
  className?: string
}

export function MoiScoreGauge({ score, className }: MoiScoreGaugeProps) {
  const normalizedScore = Math.min(1000, Math.max(0, score))
  const progress = normalizedScore / 1000
  const radius = 86
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden border border-aurora-violet/25 bg-card/60 px-6 py-8",
        className,
      )}
      aria-label={`MoiScore ${normalizedScore} out of 1000`}
      data-testid="moi-score-gauge"
    >
      <div
        className="absolute inset-0 -z-10 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(139,92,246,.45) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
        aria-hidden="true"
      />
      <div className="mx-auto grid max-w-md place-items-center">
        <div className="relative h-56 w-56">
          <svg className="-rotate-90" viewBox="0 0 200 200" role="img" aria-hidden="true">
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-foreground/10"
            />
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="url(#moi-score-gradient)"
              strokeLinecap="round"
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
            <defs>
              <linearGradient id="moi-score-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="55%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-heading text-6xl font-bold tracking-tighter text-foreground">
              {normalizedScore}
            </span>
            <span className="font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground">
              of 1000
            </span>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span>0</span>
          <span className="h-px w-24 bg-gradient-to-r from-aurora-violet via-cyan-400 to-emerald-400" />
          <span>1000</span>
        </div>
      </div>
    </section>
  )
}
