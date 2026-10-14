"use client"

import { Check, Pencil, Trash2, X } from "lucide-react"
import type { SavingsGoal } from "@/hooks/use-savings"
import { formatDate } from "@/lib/formatters"
import { daysUntil, formatUsdc, progressPercent, remainingAmount } from "../utils/savings-helpers"

interface GoalDetailProps {
  goal: SavingsGoal
  busy: boolean
  onClose: () => void
  onEdit: (goal: SavingsGoal) => void
  onDelete: (id: string) => void
  onComplete: (id: string) => void
}

/** Selected-vault detail: progress ledger, deadline row, edit/delete/complete. */
export function GoalDetail({ goal, busy, onClose, onEdit, onDelete, onComplete }: GoalDetailProps) {
  const pct = progressPercent(goal)
  const days = daysUntil(goal.targetDate)
  const active = goal.status === "active"

  return (
    <section
      aria-label={`Details for ${goal.name}`}
      data-testid="goal-detail"
      className="border-l-4 border-l-emerald-400 pl-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Vault detail
          </p>
          <h2 className="mt-1 truncate font-heading text-2xl text-foreground">{goal.name}</h2>
          {goal.description && (
            <p className="mt-1 text-sm text-muted-foreground">{goal.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Saved", value: formatUsdc(goal.currentAmount) },
          { label: "Target", value: formatUsdc(goal.targetAmount) },
          { label: "Left", value: formatUsdc(remainingAmount(goal)) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-white/5 px-2 py-3">
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{stat.label}</dt>
            <dd className="mt-1 truncate font-mono text-sm font-bold text-foreground">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${goal.name} overall progress`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-aurora-violet to-emerald-400"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-4 space-y-1.5 border-t border-dotted border-white/15 pt-4 text-sm">
        <li className="flex justify-between gap-4">
          <span className="text-muted-foreground">Status</span>
          <span className="font-medium capitalize text-foreground">{goal.status}</span>
        </li>
        <li className="flex justify-between gap-4">
          <span className="text-muted-foreground">Deadline</span>
          <span className="font-medium text-foreground">
            {goal.targetDate ? formatDate(goal.targetDate) : "No deadline"}
            {active && days !== null ? (days < 0 ? ` (${Math.abs(days)}d overdue)` : ` (${days}d left)`) : ""}
          </span>
        </li>
        <li className="flex justify-between gap-4">
          <span className="text-muted-foreground">Auto-reserve</span>
          <span className="font-medium text-foreground">{goal.autoReserve ? "On" : "Off"}</span>
        </li>
        <li className="flex justify-between gap-4">
          <span className="text-muted-foreground">Denomination</span>
          <span className="font-medium text-foreground">USDC on Arc</span>
        </li>
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onEdit(goal)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs text-foreground transition-colors hover:bg-white/5 disabled:opacity-40"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
        </button>
        {active && (
          <button
            type="button"
            onClick={() => onComplete(goal.id)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-400/15 px-3 py-2 text-xs font-medium text-emerald-400 transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Mark complete
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(goal.id)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-xl border border-red-400/30 px-3 py-2 text-xs text-red-400 transition-opacity hover:opacity-80 disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
        </button>
      </div>
    </section>
  )
}
