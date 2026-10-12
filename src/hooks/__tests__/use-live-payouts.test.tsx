import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { get } from "@/lib/api-client"
import { useLivePayouts } from "@/hooks/use-live-payouts"
import { createQueryWrapper } from "./test-utils"

// ── Module mocks ───────────────────────────────────────────────────────────

vi.mock("@/lib/api-client", () => ({ get: vi.fn() }))

import type { WsConnectionState } from "@/hooks/use-websocket"

// Mock useWsState so tests are not dependent on a real WebSocket connection
const mockWsState: { isConnected: boolean; connectionState: WsConnectionState } =
  vi.hoisted(() => ({ isConnected: true, connectionState: "connected" as WsConnectionState }))

vi.mock("@/hooks/use-ws-state", () => ({
  useWsState: () => mockWsState,
}))

const mockedGet = vi.mocked(get)

// ── Helpers ────────────────────────────────────────────────────────────────

const makePayout = (id = "payout-1") => ({
  id,
  circleId: "circle-1",
  recipientId: "user-1",
  roundNumber: 1,
  amount: 100,
  payoutType: "fixed" as const,
  createdAt: "2026-07-25T00:00:00Z",
})

const makeResponse = (payouts = [makePayout()]) => ({
  success: true,
  data: { payouts },
  meta: { page: 1, limit: 20, total: payouts.length, totalPages: 1 },
})

// ── Tests ──────────────────────────────────────────────────────────────────

describe("useLivePayouts", () => {
  beforeEach(() => {
    mockWsState.isConnected = true
    mockWsState.connectionState = "connected"
    vi.clearAllMocks()
  })

  it("returns payout data fetched via usePayouts", async () => {
    mockedGet.mockResolvedValue(makeResponse())
    const { QueryWrapper } = createQueryWrapper()

    const { result } = renderHook(() => useLivePayouts(), { wrapper: QueryWrapper })

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.payouts).toHaveLength(1)
    expect(result.current.data?.payouts[0].id).toBe("payout-1")
  })

  it("exposes isLive: true when WebSocket is connected", async () => {
    mockWsState.isConnected = true
    mockWsState.connectionState = "connected"
    mockedGet.mockResolvedValue(makeResponse())
    const { QueryWrapper } = createQueryWrapper()

    const { result } = renderHook(() => useLivePayouts(), { wrapper: QueryWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.isLive).toBe(true)
    expect(result.current.connectionState).toBe("connected")
  })

  it("exposes isLive: false when WebSocket is disconnected", async () => {
    mockWsState.isConnected = false
    mockWsState.connectionState = "polling"
    mockedGet.mockResolvedValue(makeResponse())
    const { QueryWrapper } = createQueryWrapper()

    const { result } = renderHook(() => useLivePayouts(), { wrapper: QueryWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.isLive).toBe(false)
    expect(result.current.connectionState).toBe("polling")
  })

  it("passes filter params through to the underlying usePayouts query", async () => {
    mockedGet.mockResolvedValue(makeResponse([]))
    const { QueryWrapper } = createQueryWrapper()

    renderHook(
      () =>
        useLivePayouts({
          page: 2,
          limit: 10,
          sortBy: "amount",
          sortDir: "asc",
          circleId: "circle-1",
        }),
      { wrapper: QueryWrapper },
    )

    await waitFor(() =>
      expect(mockedGet).toHaveBeenCalledWith(
        "/payouts?page=2&limit=10&sortBy=amount&sortDir=asc&circleId=circle-1",
      ),
    )
  })

  it("does not pass refetchInterval to the API query string", async () => {
    mockedGet.mockResolvedValue(makeResponse([]))
    const { QueryWrapper } = createQueryWrapper()

    renderHook(() => useLivePayouts({ page: 1 }), { wrapper: QueryWrapper })

    await waitFor(() => expect(mockedGet).toHaveBeenCalled())
    const calledUrl = mockedGet.mock.calls[0][0] as string
    expect(calledUrl).not.toContain("refetchInterval")
  })

  it("normalizes an empty response", async () => {
    mockedGet.mockResolvedValue({ success: true })
    const { QueryWrapper } = createQueryWrapper()

    const { result } = renderHook(() => useLivePayouts(), { wrapper: QueryWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.payouts).toEqual([])
  })

  it("connectionState reflects connecting state", async () => {
    mockWsState.isConnected = false
    mockWsState.connectionState = "connecting"
    mockedGet.mockResolvedValue(makeResponse())
    const { QueryWrapper } = createQueryWrapper()

    const { result } = renderHook(() => useLivePayouts(), { wrapper: QueryWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.connectionState).toBe("connecting")
    expect(result.current.isLive).toBe(false)
  })
})
