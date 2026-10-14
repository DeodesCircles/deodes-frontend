"use client"

import { useState } from "react"
import { Plus, Wallet, CircleAlert } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api-client"
import { parseApiFieldErrors } from "@/lib/validators"
import { useSavingsMutations, type SavingsGoal } from "@/hooks/use-savings"
import { useSavingsPage, type SavingsFilter } from "./hooks/useSavingsPage"
import { SavingsSummaryStrip } from "./components/SavingsSummaryStrip"
import { GoalList } from "./components/GoalList"
import { GoalDetail } from "./components/GoalDetail"
import { GoalForm } from "./components/GoalForm"

const FILTERS: { value: SavingsFilter; label: string }[] = [
  { value: "all", label: "All vaults" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Done" },
]

/** Savings & Vaults — full-bleed summary strip, timeline of goal blocks, detail rail. */
export default function SavingsPage() {
  const page = useSavingsPage()
  const { createGoal, updateGoal, deleteGoal, completeGoal } = useSavingsMutations()
  const [pendingDelete, setPendingDelete] = useState<SavingsGoal | null>(null)

  const busy = createGoal.isPending || updateGoal.isPending || deleteGoal.isPending || completeGoal.isPending

  const handleComplete = (id: string) => {
    completeGoal.mutate(id, { onSuccess: () => page.setSelectedId(id) })
  }

  if (page.loading) {
    return (
      <div className="space-y-6" data-testid="savings-loading">
        <Skeleton variant="heading" width="40%" height={40} />
        <Skeleton variant="rectangular" height={200} />
      </div>
    )
  }

  if (page.isError) {
    return (
      <EmptyState
        icon={<CircleAlert />}
        title="Failed to load savings"
        description="Could not retrieve your savings goals and vaults."
        action={{ label: "Retry", onClick: page.refetch }}
        className="border border-red-400/20"
      />
    )
  }

  return (
    <div className="space-y-8" data-testid="savings-page">
      <PageHeader
        title="Savings & Vaults"
        description="Personal USDC vaults on Arc — one goal at a time."
        action={
          <Button variant="primary" size="sm" onClick={() => page.setShowCreate(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Create Vault
          </Button>
        }
      />

      <SavingsSummaryStrip summary={page.summary} obligations={page.obligations} />

      {page.totalCount === 0 ? (
        <EmptyState
          icon={<Wallet />}
          title="No savings vaults created"
          description="Start a dedicated savings vault to lock USDC towards personal financial milestones."
          action={{ label: "Create Vault", onClick: () => page.setShowCreate(true) }}
          className="border border-dashed border-aurora-violet/30"
        />
      ) : (
        <>
          <nav aria-label="Filter vaults" className="flex gap-6 border-b border-white/10">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => page.setFilter(f.value)}
                aria-pressed={page.filter === f.value}
                className={`relative pb-2 text-sm transition-colors ${
                  page.filter === f.value ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-aurora-violet to-emerald-400 transition-opacity ${
                    page.filter === f.value ? "opacity-100" : "opacity-0"
                  }`}
                />
              </button>
            ))}
          </nav>

          {page.goals.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground" data-testid="savings-filter-empty">
              No vaults match this filter yet.
            </p>
          ) : (
            <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
              <GoalList
                goals={page.goals}
                selectedId={page.selected?.id ?? null}
                busy={busy}
                onSelect={page.setSelectedId}
                onEdit={(g) => page.setEditing(g)}
                onDelete={(id) => {
                  const goal = page.goals.find((g) => g.id === id) ?? null
                  setPendingDelete(goal)
                }}
                onComplete={handleComplete}
              />
              {page.selected && (
                <div className="lg:sticky lg:top-6 lg:self-start">
                  <GoalDetail
                    goal={page.selected}
                    busy={busy}
                    onClose={() => page.setSelectedId(null)}
                    onEdit={(g) => page.setEditing(g)}
                    onDelete={(id) => {
                      const goal = page.goals.find((g) => g.id === id) ?? null
                      setPendingDelete(goal)
                    }}
                    onComplete={handleComplete}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={page.showCreate}
        onClose={() => {
          page.setShowCreate(false)
          createGoal.reset()
        }}
        title="Create savings vault"
        description="Lock USDC on Arc towards a personal milestone."
      >
        <GoalForm
          pending={createGoal.isPending}
          serverFieldErrors={parseApiFieldErrors(createGoal.error)}
          serverError={createGoal.error ? getErrorMessage(createGoal.error) : null}
          onCreate={(input) =>
            createGoal.mutate(input, { onSuccess: () => page.setShowCreate(false) })
          }
          onCancel={() => {
            page.setShowCreate(false)
            createGoal.reset()
          }}
        />
      </Modal>

      <Modal
        isOpen={!!page.editing}
        onClose={() => {
          page.setEditing(null)
          updateGoal.reset()
        }}
        title="Edit vault"
        description={page.editing ? `Editing “${page.editing.name}”.` : undefined}
      >
        {page.editing && (
          <GoalForm
            initial={page.editing}
            pending={updateGoal.isPending}
            serverFieldErrors={parseApiFieldErrors(updateGoal.error)}
            serverError={updateGoal.error ? getErrorMessage(updateGoal.error) : null}
            onUpdate={(id, patch) =>
              updateGoal.mutate({ id, patch }, { onSuccess: () => page.setEditing(null) })
            }
            onCancel={() => {
              page.setEditing(null)
              updateGoal.reset()
            }}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete vault?"
        description={
          pendingDelete
            ? `“${pendingDelete.name}” and its progress will be removed. This cannot be undone.`
            : undefined
        }
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" size="sm" onClick={() => setPendingDelete(null)}>
              Keep vault
            </Button>
            <Button
              variant="destructive"
              size="sm"
              isLoading={deleteGoal.isPending}
              onClick={() =>
                pendingDelete &&
                deleteGoal.mutate(pendingDelete.id, {
                  onSuccess: () => {
                    if (page.selected?.id === pendingDelete.id) page.setSelectedId(null)
                    setPendingDelete(null)
                  },
                })
              }
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          Saved USDC stays in your wallet — only the goal record is deleted.
        </p>
      </Modal>
    </div>
  )
}
