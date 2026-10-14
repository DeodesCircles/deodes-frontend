"use client"

import type { SavingsGoal } from "@/hooks/use-savings"
import { GoalCard } from "./GoalCard"

interface GoalListProps {
  goals: SavingsGoal[]
  selectedId: string | null
  busy: boolean
  onSelect: (id: string) => void
  onEdit: (goal: SavingsGoal) => void
  onDelete: (id: string) => void
  onComplete: (id: string) => void
}

/** Vertical timeline: connecting rail + dots, staggered goal blocks. */
export function GoalList({ goals, selectedId, busy, onSelect, onEdit, onDelete, onComplete }: GoalListProps) {
  return (
    <ol className="relative space-y-8 border-dotted pl-0" data-testid="goal-list">
      <span
        aria-hidden="true"
        className="absolute bottom-4 left-[5px] top-4 w-px bg-gradient-to-b from-aurora-violet/60 via-white/15 to-emerald-400/60"
      />
      {goals.map((goal, i) => (
        <li key={goal.id} className="relative pl-8" style={{ marginTop: i === 0 ? 0 : undefined }}>
          <span
            aria-hidden="true"
            className={`absolute left-0 top-2 h-[11px] w-[11px] rounded-full border-2 ${
              goal.status === "completed"
                ? "border-emerald-400 bg-emerald-400/30"
                : "border-aurora-violet bg-background"
            }`}
          />
          <GoalCard
            goal={goal}
            selected={selectedId === goal.id}
            onSelect={onSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            onComplete={onComplete}
            busy={busy}
          />
        </li>
      ))}
    </ol>
  )
}
