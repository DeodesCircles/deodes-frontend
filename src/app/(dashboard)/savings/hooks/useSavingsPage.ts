"use client"

import { useMemo, useState } from "react"
import {
  useActiveSavingsGoals,
  useSavingsGoals,
  useSavingsObligations,
  useSavingsSummary,
  type SavingsGoal,
} from "@/hooks/use-savings"
import { sortGoals } from "../utils/savings-helpers"

export type SavingsFilter = "all" | "active" | "completed"

/** Page orchestration: queries, selection, filter, and create/edit sheets. */
export function useSavingsPage() {
  const goalsQuery = useSavingsGoals()
  const summaryQuery = useSavingsSummary()
  const obligationsQuery = useSavingsObligations()
  const activeQuery = useActiveSavingsGoals()

  const [filter, setFilter] = useState<SavingsFilter>("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<SavingsGoal | null>(null)

  const goals = useMemo(() => {
    const all = sortGoals(goalsQuery.data ?? [])
    if (filter === "active") return all.filter((g) => g.status === "active")
    if (filter === "completed")
      return all.filter((g) => g.status !== "active")
    return all
  }, [goalsQuery.data, filter])

  const selected =
    goalsQuery.data?.find((g) => g.id === selectedId) ?? null

  const loading =
    goalsQuery.isLoading || summaryQuery.isLoading
  const isError = goalsQuery.isError || summaryQuery.isError

  const refetch = () => {
    void goalsQuery.refetch()
    void summaryQuery.refetch()
    void obligationsQuery.refetch()
    void activeQuery.refetch()
  }

  return {
    goals,
    totalCount: goalsQuery.data?.length ?? 0,
    summary: summaryQuery.data ?? null,
    obligations: obligationsQuery.data ?? [],
    activeCount: activeQuery.data?.length ?? 0,
    loading,
    isError,
    refetch,
    filter,
    setFilter,
    selected,
    setSelectedId,
    showCreate,
    setShowCreate,
    editing,
    setEditing,
  }
}
