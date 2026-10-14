import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { get } from "@/lib/api-client"
import { useContributions } from "@/hooks/use-contributions"
import { createQueryWrapper } from "./test-utils"

vi.mock("@/lib/api-client", () => ({ get: vi.fn() }))

const mockedGet = vi.mocked(get)

describe("useContributions", () => {

  it("loads contributions with the supported filters and pagination", async () => {
    const contribution = {
      id: "contribution-1",
      circleId: "circle-1",
      userId: "user-1",
      roundNumber: 2,
      amount: 25,
      status: "confirmed" as const,
      onTime: true,
      createdAt: "2026-07-25T00:00:00Z",
    }
    mockedGet.mockResolvedValue({
      success: true,
      data: {
        contributions: [contribution],
        summary: null,
      },
      meta: { page: 2, limit: 20, total: 1, totalPages: 1 },
    })
    const { QueryWrapper } = createQueryWrapper()

    const { result } = renderHook(
      () =>
        useContributions({
          circleId: "circle-1",
          page: 2,
          limit: 20,
        }),
      { wrapper: QueryWrapper },
    )

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // Only backend-supported params are sent (search/amount/date/sort are
    // client-side and intentionally omitted).
    expect(mockedGet).toHaveBeenCalledWith(
      "/contributions?circleId=circle-1&page=2&limit=20",
    )
    expect(result.current.data?.contributions).toEqual([contribution])
  })

  it("normalizes legacy sql.NullString txnHash objects to strings", async () => {
    mockedGet.mockResolvedValue({
      success: true,
      data: {
        contributions: [
          {
            id: "c-1",
            circleId: "circle-1",
            userId: "user-1",
            roundNumber: 1,
            amount: 100,
            txnHash: { String: "0xabc", Valid: true },
            status: "confirmed",
            onTime: true,
            createdAt: "2026-07-25T00:00:00Z",
          },
        ],
      },
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useContributions(), {
      wrapper: QueryWrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.contributions[0].txnHash).toBe("0xabc")
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
      meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
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
