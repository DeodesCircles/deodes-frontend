import { renderHook, waitFor, act } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { usePayouts, usePayoutPreview, useTriggerPayout } from "../use-payouts"
import { createQueryWrapper } from "./test-utils"
import { get, post } from "@/lib/api-client"

vi.mock("@/lib/api-client", () => ({
  get: vi.fn(),
  post: vi.fn(),
}))

const CIRCLE_ID = "circle-1"
const TXN_HASH =
  "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"

describe("useTriggerPayout optimistic updates", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("posts to the circle payout trigger endpoint and normalizes the record", async () => {
    vi.mocked(post).mockResolvedValue({
      success: true,
      data: {
        payout: {
          id: "payout-2",
          circleId: CIRCLE_ID,
          recipientId: "user-2",
          roundNumber: 2,
          amount: 300,
          feeAmount: 1.5,
          txnHash: { String: TXN_HASH, Valid: true },
          payoutType: "fixed",
          createdAt: "2026-07-25T00:00:00Z",
        },
      },
    })
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => useTriggerPayout(CIRCLE_ID), {
      wrapper: QueryWrapper,
    })

    let settled: unknown
    await act(async () => {
      settled = await result.current.mutateAsync({
        recipientId: "user-2",
        roundNumber: 2,
        amount: 300,
        feeAmount: 1.5,
        txnHash: TXN_HASH,
        payoutType: "fixed",
      })
    })

    expect(post).toHaveBeenCalledWith(`/circles/${CIRCLE_ID}/payout`, {
      recipientId: "user-2",
      roundNumber: 2,
      amount: 300,
      feeAmount: 1.5,
      txnHash: TXN_HASH,
      payoutType: "fixed",
    })
    // Go sql.NullString shape is flattened to a plain hash string.
    expect((settled as { txnHash: unknown }).txnHash).toBe(TXN_HASH)
  })

  it("optimistically prepends the payout, then settles", async () => {
    const initialData = {
      payouts: [
        {
          id: "payout-1",
          circleId: CIRCLE_ID,
          recipientId: "user-1",
          roundNumber: 1,
          amount: 200,
          payoutType: "fixed" as const,
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }

    let resolvePost: (val: unknown) => void
    const postPromise = new Promise((resolve) => {
      resolvePost = resolve
    })

    vi.mocked(post).mockImplementation(() => postPromise as Promise<never>)

    const { queryClient, QueryWrapper } = createQueryWrapper()
    queryClient.setQueryData(["payouts"], initialData)

    const { result } = renderHook(() => useTriggerPayout(CIRCLE_ID), {
      wrapper: QueryWrapper,
    })

    await act(async () => {
      result.current.mutate({
        recipientId: "user-2",
        roundNumber: 2,
        amount: 300,
        feeAmount: 1.5,
        txnHash: TXN_HASH,
        payoutType: "fixed",
      })
    })

    const updated = queryClient.getQueryData<typeof initialData>(["payouts"])
    expect(updated?.payouts.length).toBe(2)
    expect(updated?.payouts[0].amount).toBe(300)
    expect(updated?.payouts[0].id).toMatch(/^optimistic-/)

    await act(async () => {
      resolvePost!({ data: { id: "payout-2", amount: 300 } })
    })
  })

  it("rolls back optimistic update on API error", async () => {
    const initialData = {
      payouts: [
        {
          id: "payout-1",
          circleId: CIRCLE_ID,
          recipientId: "user-1",
          roundNumber: 1,
          amount: 200,
          payoutType: "fixed" as const,
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
    }

    vi.mocked(post).mockRejectedValueOnce(new Error("Failed"))

    const { queryClient, QueryWrapper } = createQueryWrapper()
    queryClient.setQueryData(["payouts"], initialData)

    const { result } = renderHook(() => useTriggerPayout(CIRCLE_ID), {
      wrapper: QueryWrapper,
    })

    await act(async () => {
      try {
        await result.current.mutateAsync({
          recipientId: "user-2",
          roundNumber: 2,
          amount: 300,
          feeAmount: 1.5,
          txnHash: TXN_HASH,
          payoutType: "fixed",
        })
      } catch {
        // Expected error
      }
    })

    const rolledBack = queryClient.getQueryData<typeof initialData>(["payouts"])
    expect(rolledBack?.payouts.length).toBe(1)
    expect(rolledBack?.payouts[0].amount).toBe(200)
  })
})

describe("usePayoutPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("posts to the preview endpoint and returns the distribution", async () => {
    const preview = {
      circleId: CIRCLE_ID,
      roundNumber: 2,
      currency: "USDC",
      totalGrossAmount: 300,
      totalNetAmount: 298.5,
      protocolFee: 1.5,
      stellarFeeEstimate: 0.00001,
      arcFeeEstimate: 0.001,
      recipients: [
        { recipientId: "user-2", grossAmount: 300, feeAmount: 1.5, netAmount: 298.5 },
      ],
      dryRun: true,
      isDue: true,
    }
    vi.mocked(post).mockResolvedValue({ success: true, data: { preview } })
    const { QueryWrapper } = createQueryWrapper()
    const { result } = renderHook(() => usePayoutPreview(CIRCLE_ID), {
      wrapper: QueryWrapper,
    })

    let settled: unknown
    await act(async () => {
      settled = await result.current.mutateAsync({ recipientId: "user-2", roundNumber: 2 })
    })

    expect(post).toHaveBeenCalledWith(`/circles/${CIRCLE_ID}/payout/preview`, {
      recipientId: "user-2",
      roundNumber: 2,
    })
    expect(settled).toEqual(preview)
  })
})

describe("usePayouts query keys", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("keeps the payouts list on the shared payouts cache", async () => {
    vi.mocked(get).mockResolvedValue({
      success: true,
      data: { payouts: [] },
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    })
    const { queryClient, QueryWrapper } = createQueryWrapper()
    renderHook(() => usePayouts({ page: 1, limit: 20 }), { wrapper: QueryWrapper })

    await waitFor(() => expect(vi.mocked(get)).toHaveBeenCalled())
    expect(queryClient.getQueriesData({ queryKey: ["payouts"] }).length).toBeGreaterThan(0)
  })
})
