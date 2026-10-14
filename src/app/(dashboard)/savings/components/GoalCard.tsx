"use client"

import { CalendarDays, Check, Pencil, Trash2 } from "lucide-react"
import type { SavingsGoal } from "@/hooks/use-savings"
import { formatDate } from "@/lib/formatters"
import { daysUntil, formatUsdc, isOverdue, progressPercent, remainingAmount } from "../utils/savings-helpers"

interface GoalCardProps {
  goal: SavingsGoal
  selected: boolean
  onSelect: (id: string) => void
  onEdit: (goal: SavingsGoal) => void
  onDelete: (id: string) => void
  onComplete: (id: string) => void
  busy: boolean
}

function statusPill(goal: SavingsGoal): string {
  if (goal.status === "completed")
    return "bg-emerald-400/15 text-emerald-400"
  if (goal.status === "cancelled") return "bg-white/10 text-muted-foreground"
  if (isOverdue(goal)) return "bg-red-400/15 text-red-400"
  return "bg-aurora-violet/15 text-aurora-violet"
}

function statusLabel(goal: SavingsGoal): string {
  if (goal.status === "completed") return "Completed"
  if (goal.status === "cancelled") return "Cancelled"
  if (isOverdue(goal)) return "Overdue"
  return "Active"
}

/** Timeline item: left-accent block, pill tags, underline progress. */
export function GoalCard({ goal, selected, onSelect, onEdit, onDelete, onComplete, busy }: GoalCardProps) {
  const pct = progressPercent(goal)
  const days = daysUntil(goal.targetDate)
  const active = goal.status === "active"

  return (
    <article
      data-testid={`goal-card-${goal.id}`}
      className={`border-l-4 pl-5 pr-1 py-1 ${goal.status === "completed" ? "border-l-emerald-400" : isOverdue(goal) ? "border-l-red-400" : "border-l-aurora-violet"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onSelect(goal.id)}
          aria-pressed={selected}
          className="min-w-0 flex-1 text-left"
        >
          <h3 className="truncate font-heading text-lg text-foreground">{goal.name}</h3>
          <p className="mt-0.5 font-mono text-2xl font-bold text-foreground">
            {formatUsdc(goal.currentAmount)}
            <span className="ml-2 align-middle font-body text-xs font-normal text-muted-foreground">
              of {formatUsdc(goal.targetAmount)}
            </span>
          </p>
        </button>
        <div className="flex flex-wrap gap-1.5">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusPill(goal)}`}>
            {statusLabel(goal)}
          </span>
          {goal.targetDate && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-muted-foreground">
              <CalendarDays className="h-3 w-3" aria-hidden="true" />
              {formatDate(goal.targetDate)}
            </span>
          )}
          {goal.autoReserve && active && (
            <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-medium text-amber-400">
              Auto-reserve
            </span>
          )}
        </div>
      </div>

      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${goal.name} progress`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-aurora-violet to-emerald-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{Math.round(pct)}% saved · {formatUsdc(remainingAmount(goal))} to go</span>
        {active && days !== null && (
          <span>{days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`}</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onEdit(goal)}
          disabled={busy}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
        </button>
        {active && (
          <button
            type="button"
            onClick={() => onComplete(goal.id)}
            disabled={busy}
            className="inline-flex items-center gap-1 text-xs text-emerald-400 transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Mark complete
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(goal.id)}
          disabled={busy}
          className="inline-flex items-center gap-1 text-xs text-red-400 transition-opacity hover:opacity-80 disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
        </button>
      </div>
    </article>
  )
}
