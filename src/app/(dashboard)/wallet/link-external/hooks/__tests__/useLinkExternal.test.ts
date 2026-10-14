import { describe, expect, it, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"

import { formatWeiBalance } from "../useLinkExternal"

vi.mock("@/lib/wallet/ensure-hosted", () => ({
  ensureHostedArcWallet: vi.fn(async () => ({ publicKey: "0x51b45Ba8570551e0D1fe818227d8bAa8b556694D", walletType: "hosted" })),
}))

vi.mock("@/stores/multi-wallet-store", () => ({
  useMultiWalletStore: (sel: (s: unknown) => unknown) =>
    sel({
      activeWalletId: "arc-evm",
      wallets: {
        "arc-evm": { status: "connected", publicKey: "0x81e877e2d21ec187994ed4ae1fafb36d529bacb1" },
      },
      disconnect: vi.fn(),
    }),
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadHook(): Promise<any> {
  const mod = await import("../useLinkExternal")
  return mod.useLinkExternal
}

describe("formatWeiBalance", () => {
  it("formats whole and fractional native USDC", () => {
    expect(formatWeiBalance("0x0")).toBe("0")
    expect(formatWeiBalance("0xde0b6b3a7640000")).toBe("1")
    expect(formatWeiBalance("0x1bc16d674ec80000")).toBe("2")
    expect(formatWeiBalance("0xE8D4A51000")).toBe("0.000001")
    expect(formatWeiBalance("garbage")).toBe("0")
  })
})

describe("useLinkExternal sweep", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("reads the external balance and sweeps via eth_sendTransaction", async () => {
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === "eth_getBalance") return "0x1bc16d674ec80000"
      if (method === "eth_sendTransaction")
        return "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      throw new Error("unexpected method " + method)
    })
    Object.defineProperty(window, "ethereum", { value: { request }, configurable: true })

    const useLinkExternal = await loadHook()
    const { result } = renderHook(() => useLinkExternal())

    await waitFor(() => {
      expect(result.current.externalBalance).toBe("2")
    })
    expect(result.current.hostedAddress).toBe("0x51b45Ba8570551e0D1fe818227d8bAa8b556694D")

    act(() => {
      result.current.setAmount("1.5")
    })
    await act(async () => {
      await result.current.sweep()
    })

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ method: "eth_sendTransaction" }),
    )
    await waitFor(() => {
      expect(result.current.status.kind).toBe("done")
    })
  })

  it("reports rejection without moving anything", async () => {
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === "eth_getBalance") return "0x1bc16d674ec80000"
      const err = new Error("denied") as Error & { code?: number }
      err.code = 4001
      throw err
    })
    Object.defineProperty(window, "ethereum", { value: { request }, configurable: true })

    const useLinkExternal = await loadHook()
    const { result } = renderHook(() => useLinkExternal())

    await waitFor(() => {
      expect(result.current.externalBalance).toBe("2")
    })
    act(() => {
      result.current.setAmount("1")
    })
    await act(async () => {
      await result.current.sweep()
    })

    expect(result.current.status).toEqual({
      kind: "error",
      message: "Transfer rejected in wallet. Nothing moved.",
    })
  })
})
