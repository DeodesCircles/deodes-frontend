import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useTransferPoll } from "../hooks/useTransferPoll"

// ── Module mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/constants", () => ({
  ARC_RPC_URL: "https://rpc.testnet.arc.io",
}))

const mockFetch = vi.fn()

// ── Test helpers ─────────────────────────────────────────────────────────────

function receiptResponse(status: string | null) {
  return {
    ok: true,
    json: async () => ({ jsonrpc: "2.0", id: 1, result: status === null ? null : { status } }),
  }
}

/**
 * Drives the hook's recursive poll loop under fake timers.
 *
 * Every poll awaits fetch + res.json(), so its follow-up timer is only
 * registered *after* microtasks flush. `advanceTimersByTimeAsync` handles the
 * promise chain; stepping with a flush between ticks walks the whole loop.
 */
async function flushPolls(ticks: number, stepMs = 3_000) {
  for (let i = 0; i < ticks; i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(stepMs)
    })
  }
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("useTransferPoll", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockFetch.mockReset()
    vi.stubGlobal("fetch", mockFetch)
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it("starts in pending state", () => {
    mockFetch.mockResolvedValue(receiptResponse(null))
    const { result } = renderHook(() => useTransferPoll("0xabc"))
    expect(result.current.status).toBe("pending")
    expect(result.current.attempts).toBe(0)
  })

  it("returns pending when hash is null", () => {
    const { result } = renderHook(() => useTransferPoll(null))
    expect(result.current.status).toBe("pending")
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("posts eth_getTransactionReceipt to the Arc RPC", async () => {
    mockFetch.mockResolvedValue(receiptResponse(null))
    renderHook(() => useTransferPoll("0xdeadbeef"))

    await flushPolls(1, 2_000)

    expect(mockFetch).toHaveBeenCalled()
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://rpc.testnet.arc.io")
    expect(init.method).toBe("POST")
    const body = JSON.parse(init.body as string)
    expect(body.method).toBe("eth_getTransactionReceipt")
    expect(body.params).toEqual(["0xdeadbeef"])
  })

  it("transitions to finalized when receipt status is 0x1", async () => {
    mockFetch.mockResolvedValue(receiptResponse("0x1"))
    const { result } = renderHook(() => useTransferPoll("0xsuccess"))

    await flushPolls(1, 2_000)

    expect(result.current.status).toBe("finalized")
  })

  it("transitions to failed when receipt status is 0x0", async () => {
    mockFetch.mockResolvedValue(receiptResponse("0x0"))
    const { result } = renderHook(() => useTransferPoll("0xfail"))

    await flushPolls(1, 2_000)

    expect(result.current.status).toBe("failed")
  })

  it("increments attempts on null receipt (not mined yet)", async () => {
    mockFetch.mockResolvedValue(receiptResponse(null))
    const { result } = renderHook(() => useTransferPoll("0xpending"))

    // First poll at 1.5s, second at 4.5s
    await flushPolls(5)

    expect(result.current.attempts).toBeGreaterThanOrEqual(1)
    expect(result.current.status).toBe("pending")
  })

  it("treats RPC / network errors as poll-continue", async () => {
    mockFetch.mockRejectedValueOnce(new Error("boom")).mockResolvedValue(receiptResponse(null))
    const { result } = renderHook(() => useTransferPoll("0xflaky"))

    await flushPolls(3)

    expect(result.current.status).toBe("pending")
    expect(result.current.attempts).toBeGreaterThanOrEqual(1)
    expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it("treats JSON-RPC error payloads as poll-continue", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ jsonrpc: "2.0", id: 1, error: { code: -32000, message: "header not found" } }),
    })
    const { result } = renderHook(() => useTransferPoll("0xerr"))

    await flushPolls(2)

    expect(result.current.status).toBe("pending")
  })

  it("transitions to timeout after MAX_ATTEMPTS", async () => {
    mockFetch.mockResolvedValue(receiptResponse(null))
    const { result } = renderHook(() => useTransferPoll("0xtimeout"))

    // 20 attempts × 3_000ms + initial 1_500ms
    await flushPolls(30)

    expect(result.current.status).toBe("timeout")
  })

  it("resets state when txnHash changes", async () => {
    mockFetch
      .mockResolvedValueOnce(receiptResponse("0x1"))
      .mockResolvedValue(receiptResponse(null))

    const { result, rerender } = renderHook(
      ({ hash }: { hash: string }) => useTransferPoll(hash),
      { initialProps: { hash: "0xaaa" } },
    )

    await flushPolls(1, 2_000)
    expect(result.current.status).toBe("finalized")

    // Switch to a new hash
    rerender({ hash: "0xbbb" })

    expect(result.current.status).toBe("pending")
    expect(result.current.attempts).toBe(0)
  })
})
