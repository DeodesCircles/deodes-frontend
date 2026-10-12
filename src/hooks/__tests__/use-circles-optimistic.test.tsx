import { renderHook, waitFor, act } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useCircles, useContribute } from "../use-circles"
import { createQueryWrapper } from "./test-utils"
import { get, post } from "@/lib/api-client"

vi.mock("@/lib/api-client", () => ({
  get: vi.fn(),
  post: vi.fn(),
}))

describe("useCircles & useContribute hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("useCircles sort parameters", () => {
    it("includes sort, sortBy, and sortOrder parameters in API URL", async () => {
      vi.mocked(get).mockResolvedValueOnce({
        data: { circles: [] },
        meta: { page: 1, limit: 12, total: 0, totalPages: 0 },
      })

      const { QueryWrapper } = createQueryWrapper()
      const { result } = renderHook(
        () =>
          useCircles({
            sort: "amount-desc",
            sortBy: "amount",
            sortOrder: "desc",
            currency: "USDC",
            page: 1,
            limit: 12,
          }),
        { wrapper: QueryWrapper }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(get).toHaveBeenCalledWith(
        "/circles?currency=USDC&page=1&limit=12&sort=amount-desc&sortBy=amount&sortOrder=desc"
      )
    })
  })

  describe("useContribute optimistic updates", () => {
    it("optimistically updates circle and rounds cache on mutate, then settles", async () => {
      const circleId = "circle-123"
      const initialCircle = {
        id: circleId,
        name: "Test Circle",
        contributionAmount: 100,
        totalContributions: 500,
        currentRound: 2,
        maxMembers: 5,
        status: "active",
      }
      const initialRounds = [
        {
          id: "round-1",
          circleId,
          userId: "user-1",
          roundNumber: 1,
          amount: 100,
          status: "completed",
          onTime: true,
          submittedAt: "2026-01-01T00:00:00Z",
        },
      ]

      let resolvePost: (val: unknown) => void
      const postPromise = new Promise((resolve) => {
        resolvePost = resolve
      })

      vi.mocked(post).mockImplementation(() => postPromise as Promise<never>)

      const { queryClient, QueryWrapper } = createQueryWrapper()

      // Seed query cache
      queryClient.setQueryData(["circle", circleId], initialCircle)
      queryClient.setQueryData(["circle-rounds", circleId], initialRounds)

      const { result } = renderHook(() => useContribute(circleId), {
        wrapper: QueryWrapper,
      })

      // Trigger mutation and wait for onMutate microtasks to complete
      await act(async () => {
        result.current.mutate({ amount: 100, roundNumber: 2 })
      })

      // Verify optimistic update took effect instantly
      const updatedCircle = queryClient.getQueryData<typeof initialCircle>(["circle", circleId])
      const updatedRounds = queryClient.getQueryData<typeof initialRounds>(["circle-rounds", circleId])

      expect(updatedCircle?.totalContributions).toBe(600)
      expect(updatedRounds?.length).toBe(2)
      expect(updatedRounds?.[1].amount).toBe(100)
      expect(updatedRounds?.[1].roundNumber).toBe(2)

      // Complete server promise
      await act(async () => {
        resolvePost!({ data: { id: "round-2", amount: 100 } })
      })
    })

    it("rolls back optimistic update on API error", async () => {
      const circleId = "circle-456"
      const initialCircle = {
        id: circleId,
        name: "Rollback Circle",
        totalContributions: 200,
      }
      const initialRounds = [
        {
          id: "round-1",
          circleId,
          userId: "user-1",
          roundNumber: 1,
          amount: 200,
          status: "completed",
          onTime: true,
          submittedAt: "2026-01-01T00:00:00Z",
        },
      ]

      vi.mocked(post).mockRejectedValueOnce(new Error("Network Error"))

      const { queryClient, QueryWrapper } = createQueryWrapper()

      queryClient.setQueryData(["circle", circleId], initialCircle)
      queryClient.setQueryData(["circle-rounds", circleId], initialRounds)

      const { result } = renderHook(() => useContribute(circleId), {
        wrapper: QueryWrapper,
      })

      await act(async () => {
        try {
          await result.current.mutateAsync({ amount: 100 })
        } catch {
          // Expected error
        }
      })

      // Cache should be rolled back to initial state
      const rolledBackCircle = queryClient.getQueryData<typeof initialCircle>(["circle", circleId])
      const rolledBackRounds = queryClient.getQueryData<typeof initialRounds>(["circle-rounds", circleId])

      expect(rolledBackCircle?.totalContributions).toBe(200)
      expect(rolledBackRounds?.length).toBe(1)
    })
  })
})
