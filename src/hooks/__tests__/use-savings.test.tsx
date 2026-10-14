import { renderHook, waitFor, act } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { del, get, patch, post } from "@/lib/api-client"
import {
  useActiveSavingsGoals,
  useSavingsGoal,
  useSavingsGoals,
  useSavingsMutations,
  useSavingsObligations,
  useSavingsSummary,
  type SavingsGoal,
} from "@/hooks/use-savings"
import { createQueryWrapper } from "./test-utils"

vi.mock("@/lib/api-client", () => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : "error"),
}))

const mockedGet = vi.mocked(get)
const mockedPost = vi.mocked(post)
const mockedPatch = vi.mocked(patch)
const mockedDel = vi.mocked(del)

function makeGoal(overrides: Partial<SavingsGoal> = {}): SavingsGoal {
  return {
    id: "goal-1",
    userId: "u-test",
    name: "Emergency fund",
    description: "buffer",
    targetAmount: 1000,
    currentAmount: 250,
    targetDate: "2026-12-31",
    circleId: null,
    autoReserve: false,
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

describe("useSavingsGoals", () => {
  beforeEach(() => vi.clearAllMocks())

  it("hits GET /savings/goals and unwraps the envelope", async () => {
    mockedGet.mockResolvedValue({ data: { goals: [makeGoal()] } } as never)
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useSavingsGoals(), { wrapper: QueryWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedGet).toHaveBeenCalledWith("/savings/goals")
    expect(result.current.data).toEqual([makeGoal()])
  })

  it("normalizes a missing goals array to an empty list", async () => {
    mockedGet.mockResolvedValue({ data: {} } as never)
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useSavingsGoals(), { wrapper: QueryWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})

describe("useActiveSavingsGoals / useSavingsSummary / useSavingsObligations", () => {
  beforeEach(() => vi.clearAllMocks())

  it("fetches active goals, summary, and obligations from their endpoints", async () => {
    mockedGet.mockImplementation(async (url: string) => {
      if (url === "/savings/goals/active") return { data: { goals: [makeGoal()] } } as never
      if (url === "/savings/goals/summary")
        return {
          data: {
            summary: { totalGoals: 2, activeGoals: 1, completedGoals: 1, totalTarget: 2000, totalSaved: 500, overallPercent: 25, savingsStreak: 3 },
          },
        } as never
      return { data: { goals: [] } } as never
    })
    const { QueryWrapper } = createQueryWrapper()
    const { result: active } = renderHook(() => useActiveSavingsGoals(), { wrapper: QueryWrapper })
    const { result: summary } = renderHook(() => useSavingsSummary(), { wrapper: QueryWrapper })
    const { result: obligations } = renderHook(() => useSavingsObligations(), { wrapper: QueryWrapper })

    await waitFor(() => expect(active.current.isSuccess).toBe(true))
    await waitFor(() => expect(summary.current.isSuccess).toBe(true))
    await waitFor(() => expect(obligations.current.isSuccess).toBe(true))
    expect(mockedGet).toHaveBeenCalledWith("/savings/goals/active")
    expect(mockedGet).toHaveBeenCalledWith("/savings/goals/summary")
    expect(mockedGet).toHaveBeenCalledWith("/savings/goals/obligations")
    expect(summary.current.data?.totalGoals).toBe(2)
    expect(obligations.current.data).toEqual([])
  })
})

describe("useSavingsGoal", () => {
  beforeEach(() => vi.clearAllMocks())

  it("fetches a single goal and stays disabled without an id", async () => {
    mockedGet.mockResolvedValue({ data: { goal: makeGoal() } } as never)
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useSavingsGoal("goal-1"), { wrapper: QueryWrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedGet).toHaveBeenCalledWith("/savings/goals/goal-1")
    expect(result.current.data?.name).toBe("Emergency fund")

    vi.clearAllMocks()
    renderHook(() => useSavingsGoal(null), { wrapper: QueryWrapper })
    expect(mockedGet).not.toHaveBeenCalled()
  })
})

describe("useSavingsMutations", () => {
  beforeEach(() => vi.clearAllMocks())

  it("creates a goal via POST /savings/goals", async () => {
    mockedPost.mockResolvedValue({ data: { goal: makeGoal() } } as never)
    const { QueryWrapper, queryClient } = createQueryWrapper()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => useSavingsMutations(), { wrapper: QueryWrapper })

    await act(async () => {
      await result.current.createGoal.mutateAsync({ name: "Emergency fund", targetAmount: 1000 })
    })

    expect(mockedPost).toHaveBeenCalledWith("/savings/goals", { name: "Emergency fund", targetAmount: 1000 })
    expect(invalidate).toHaveBeenCalled()
  })

  it("updates via PATCH, completes via POST :complete, deletes via DELETE", async () => {
    mockedPatch.mockResolvedValue({ data: { goal: makeGoal({ currentAmount: 300 }) } } as never)
    mockedPost.mockResolvedValue({ data: { goal: makeGoal({ status: "completed" }) } } as never)
    mockedDel.mockResolvedValue({ data: { success: true } } as never)
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useSavingsMutations(), { wrapper: QueryWrapper })

    await act(async () => {
      await result.current.updateGoal.mutateAsync({ id: "goal-1", patch: { currentAmount: 300 } })
    })
    expect(mockedPatch).toHaveBeenCalledWith("/savings/goals/goal-1", { currentAmount: 300 })

    await act(async () => {
      await result.current.completeGoal.mutateAsync("goal-1")
    })
    expect(mockedPost).toHaveBeenCalledWith("/savings/goals/goal-1/complete")

    await act(async () => {
      await result.current.deleteGoal.mutateAsync("goal-1")
    })
    expect(mockedDel).toHaveBeenCalledWith("/savings/goals/goal-1")
  })

  it("surfaces mutation errors without throwing", async () => {
    mockedPost.mockRejectedValue(new Error("network down"))
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useSavingsMutations(), { wrapper: QueryWrapper })

    await act(async () => {
      await expect(
        result.current.createGoal.mutateAsync({ name: "X", targetAmount: 10 })
      ).rejects.toThrow("network down")
    })
    expect(result.current.createGoal.isError).toBe(true)
  })
})
