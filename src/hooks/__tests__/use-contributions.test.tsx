import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { get } from "@/lib/api-client"
import { useContributions } from "@/hooks/use-contributions"
import { createQueryWrapper } from "./test-utils"

vi.mock("@/lib/api-client", () => ({ get: vi.fn() }))

const mockedGet = vi.mocked(get)

describe("useContributions", () => {

  it("loads contributions with the existing filters and pagination", async () => {
    const contribution = {
      id: "contribution-1",
      circleId: "circle-1",
      userId: "user-1",
      roundNumber: 2,
      amount: 25,
      status: "completed" as const,
      onTime: true,
      submittedAt: "2026-07-25T00:00:00Z",
    }
    mockedGet.mockResolvedValue({
      success: true,
      data: {
        contributions: [contribution],
        summary: { totalContributed: 25, average: 25, count: 1 },
      },
      meta: { page: 2, limit: 20, total: 1, totalPages: 1 },
    })
    const { QueryWrapper } = createQueryWrapper()

    const { result } = renderHook(
      () =>
        useContributions({
          search: "weekly",
          circleId: "circle-1",
          amount: "100-500",
          date: "30d",
          sort: "date-desc",
          page: 2,
          limit: 20,
        }),
      { wrapper: QueryWrapper },
    )

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedGet).toHaveBeenCalledWith(
      "/contributions?search=weekly&circleId=circle-1&amount=100-500&date=30d&sort=date-desc&page=2&limit=20",
    )
    expect(result.current.data?.contributions).toEqual([contribution])
  })

  it("normalizes an empty response", async () => {
    mockedGet.mockResolvedValue({ success: true })
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useContributions(), {
      wrapper: QueryWrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      contributions: [],
      summary: null,
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    })
  })

  it("exposes request errors through TanStack Query", async () => {
    const error = new Error("contributions unavailable")
    mockedGet.mockRejectedValue(error)
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useContributions(), {
      wrapper: QueryWrapper,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(error)
  })
})
