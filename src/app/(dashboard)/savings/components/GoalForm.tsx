"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CreateGoalInput, SavingsGoal, UpdateGoalInput } from "@/hooks/use-savings"

interface GoalFormProps {
  initial?: SavingsGoal | null
  pending: boolean
  onCreate?: (input: CreateGoalInput) => void
  onUpdate?: (id: string, patch: UpdateGoalInput) => void
  onCancel: () => void
}

/** Create/edit vault form. Backend model: name, target USDC, optional deadline, no frequency. */
export function GoalForm({ initial, pending, onCreate, onUpdate, onCancel }: GoalFormProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [target, setTarget] = useState(initial ? String(initial.targetAmount) : "")
  const [deadline, setDeadline] = useState(initial?.targetDate ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [autoReserve, setAutoReserve] = useState(initial?.autoReserve ?? false)
  const [errors, setErrors] = useState<{ name?: string; target?: string; deadline?: string }>({})

  const validate = () => {
    const next: typeof errors = {}
    if (!name.trim()) next.name = "Give your vault a name."
    const amount = Number(target)
    if (!target.trim() || Number.isNaN(amount) || amount <= 0)
      next.target = "Enter a target above 0 USDC."
    if (deadline.trim() && Number.isNaN(new Date(`${deadline}T00:00:00`).getTime()))
      next.deadline = "Use a valid date (YYYY-MM-DD)."
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    const amount = Number(target)
    if (initial) {
      onUpdate?.(initial.id, {
        name: name.trim(),
        description: description.trim(),
        targetAmount: amount,
        targetDate: deadline.trim() ? deadline.trim() : null,
        autoReserve,
      })
    } else {
      onCreate?.({
        name: name.trim(),
        description: description.trim() || undefined,
        targetAmount: amount,
        targetDate: deadline.trim() || null,
        autoReserve,
      })
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" data-testid="goal-form">
      <Input
        label="Vault name"
        placeholder="e.g. Emergency fund"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        maxLength={80}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Target (USDC on Arc)"
          placeholder="500.00"
          inputMode="decimal"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          error={errors.target}
        />
        <Input
          label="Deadline (optional)"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          error={errors.deadline}
        />
      </div>
      <Input
        label="Note (optional)"
        placeholder="What is this vault for?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={280}
      />
      <label className="flex cursor-pointer items-center justify-between gap-4 border-t border-dotted border-white/15 pt-4">
        <span>
          <span className="block font-heading text-sm text-foreground">Auto-reserve</span>
          <span className="block text-xs text-muted-foreground">
            Flag this vault for automatic top-ups from circle payouts.
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={autoReserve}
          aria-label="Auto-reserve"
          onClick={() => setAutoReserve((v) => !v)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${autoReserve ? "bg-emerald-400" : "bg-white/15"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${autoReserve ? "left-[22px]" : "left-0.5"}`}
          />
        </button>
      </label>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button variant="primary" size="sm" type="submit" isLoading={pending}>
          {initial ? "Save changes" : "Create vault"}
        </Button>
      </div>
    </form>
  )
}
