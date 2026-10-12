import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { get } from "@/lib/api-client"
import { useReputation } from "@/hooks/use-reputation"
import { createQueryWrapper } from "./test-utils"

vi.mock("@/lib/api-client", () => ({ get: vi.fn() }))

const mockedGet = vi.mocked(get)

describe("useReputation", () => {

  it("loads reputation from the build-plan endpoint", async () => {
    const reputation = {
      score: 720,
      breakdown: { streaks: 200, completions: 220, volume: 180, recency: 120 },
      history: [{ date: "2026-07-25", score: 720 }],
    }
    mockedGet.mockResolvedValue({
      success: true,
      data: { reputation },
    })
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useReputation("user-1"), {
      wrapper: QueryWrapper,
    })

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedGet).toHaveBeenCalledWith("/users/user-1/reputation")
    expect(result.current.data).toEqual(reputation)
  })

  it("normalizes a missing reputation payload to null", async () => {
    mockedGet.mockResolvedValue({ success: true })
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useReputation("user-1"), {
      wrapper: QueryWrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  it("exposes request errors through TanStack Query", async () => {
    const error = new Error("reputation unavailable")
    mockedGet.mockRejectedValue(error)
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useReputation("user-1"), {
      wrapper: QueryWrapper,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(error)
  })
})
