import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
    warning: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
  }),
}))

const { mockGet, mockPost, walletState, authState } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  // Mutable stand-ins for the two zustand stores the hook reads.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  walletState: { activeWalletId: null, wallets: {}, signMessage: vi.fn() } as any,
  authState: { isAuthenticated: false },
}))

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/api-client")>()
  return { ...actual, get: mockGet, post: mockPost }
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.mock("@/stores/multi-wallet-store", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useMultiWalletStore: Object.assign((selector: (s: any) => any) => selector(walletState), {
    getState: () => walletState,
  }),
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.mock("@/stores/auth-store", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useAuthStore: (selector: (s: any) => any) => selector(authState),
}))

import { useWalletLink } from "@/hooks/use-wallet-link"

const CONNECTED = "0xAbC123000000000000000000000000000000dE0D"
const HOSTED = "0xHosted000000000000000000000000000000beef"

function adapterReturning(signature: string) {
  return {
    meta: { id: "metamask", name: "MetaMask" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signMessage: vi.fn(async (_message: string) => ({ signature, publicKey: CONNECTED }) as any),
  }
}

/** Mirror of the real store's signMessage: adapter result -> bare signature. */
function wireSignMessage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  walletState.signMessage = vi.fn(async (message: string) => {
    const entry = walletState.wallets[walletState.activeWalletId]
    const res = await entry.adapter.signMessage(message)
    return res.signature
  })
}

function setConnected(address: string, signature = "0xsig-ok") {
  walletState.activeWalletId = "metamask"
  walletState.wallets = {
    metamask: {
      publicKey: address,
      status: "connected",
      adapter: adapterReturning(signature),
    },
  }
  wireSignMessage()
}

function resetAll() {
  walletState.activeWalletId = null
  walletState.wallets = {}
  wireSignMessage()
  authState.isAuthenticated = false
}

beforeEach(() => {
  resetAll()
  vi.clearAllMocks()
  wireSignMessage()
  localStorage.clear()
  mockGet.mockResolvedValue({ data: { wallets: [] } })
})

describe("useWalletLink — needsLink detection", () => {
  it("is false when signed out even with a connected 0x wallet", async () => {
    setConnected(CONNECTED)
    authState.isAuthenticated = false

    const { result } = renderHook(() => useWalletLink())

    await waitFor(() => expect(result.current.checking).toBe(false))
    expect(result.current.address).toBeNull()
    expect(result.current.needsLink).toBe(false)
    expect(mockGet).not.toHaveBeenCalled()
  })

  it("is false when no wallet is connected", async () => {
    authState.isAuthenticated = true

    const { result } = renderHook(() => useWalletLink())

    await waitFor(() => expect(result.current.checking).toBe(false))
    expect(result.current.address).toBeNull()
    expect(result.current.needsLink).toBe(false)
    expect(mockGet).not.toHaveBeenCalled()
  })

  it("is false for non-0x (legacy) connected addresses", async () => {
    authState.isAuthenticated = true
    setConnected("GABC123LEGACYADDRESSXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")

    const { result } = renderHook(() => useWalletLink())

    await waitFor(() => expect(result.current.checking).toBe(false))
    expect(result.current.address).toBeNull()
    expect(result.current.needsLink).toBe(false)
    expect(mockGet).not.toHaveBeenCalled()
  })

  it("is false when the address is already recorded (hosted or linked)", async () => {
    authState.isAuthenticated = true
    setConnected(CONNECTED)
    mockGet.mockResolvedValue({
      data: {
        wallets: [
          { publicKey: HOSTED, walletType: "hosted" },
          // Different case on purpose — matching must be case-insensitive.
          { publicKey: CONNECTED.toLowerCase(), walletType: "linked" },
        ],
      },
    })

    const { result } = renderHook(() => useWalletLink())

    await waitFor(() => expect(result.current.checking).toBe(false))
    expect(mockGet).toHaveBeenCalledWith("/wallets")
    expect(result.current.needsLink).toBe(false)
  })

  it("is true when the connected 0x address is not recorded", async () => {
    authState.isAuthenticated = true
    setConnected(CONNECTED)
    mockGet.mockResolvedValue({
      data: { wallets: [{ publicKey: HOSTED, walletType: "hosted" }] },
    })

    const { result } = renderHook(() => useWalletLink())

    await waitFor(() => expect(result.current.needsLink).toBe(true))
    expect(result.current.address).toBe(CONNECTED)
    expect(result.current.error).toBeNull()
  })

  it("is false (not a crash) when GET /wallets fails", async () => {
    authState.isAuthenticated = true
    setConnected(CONNECTED)
    mockGet.mockRejectedValue(new Error("network down"))

    const { result } = renderHook(() => useWalletLink())

    await waitFor(() => expect(result.current.checking).toBe(false))
    expect(result.current.needsLink).toBe(false)
    expect(result.current.error).toBeNull()
  })
})

describe("useWalletLink — link()", () => {
  beforeEach(() => {
    authState.isAuthenticated = true
    setConnected(CONNECTED)
  })

  it("proves ownership (nonce -> sign -> link), toasts, and clears needsLink", async () => {
    // First GET (initial check): hosted only. Second GET (post-link
    // confirm): hosted + linked. Once-queues: consume exactly per call.
    mockGet
      .mockResolvedValueOnce({
        data: { wallets: [{ publicKey: HOSTED, walletType: "hosted" }] },
      })
      .mockResolvedValue({
        data: {
          wallets: [
            { publicKey: HOSTED, walletType: "hosted" },
            { publicKey: CONNECTED, walletType: "linked" },
          ],
        },
      })
    mockPost
      .mockResolvedValueOnce({ data: { nonce: { nonce: "nonce-123" } } })
      .mockResolvedValueOnce({ wallet: { address: CONNECTED } })

    const { result } = renderHook(() => useWalletLink())
    await waitFor(() => expect(result.current.needsLink).toBe(true))

    await act(async () => {
      await result.current.link()
    })

    expect(mockPost).toHaveBeenCalledWith("/auth/nonce", {
      walletAddress: CONNECTED,
    })
    const entry = walletState.wallets.metamask
    expect(entry.adapter.signMessage).toHaveBeenCalledWith("nonce-123")
    expect(mockPost).toHaveBeenCalledWith("/wallets/link", {
      address: CONNECTED,
      signature: "0xsig-ok",
    })
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Wallet linked to your account.",
    )
    expect(result.current.error).toBeNull()
    expect(result.current.needsLink).toBe(false)
  })

  it("maps user-rejected signatures to friendly copy", async () => {
    mockPost.mockResolvedValueOnce({ data: { nonce: { nonce: "n1" } } })
    const entry = walletState.wallets.metamask
    entry.adapter.signMessage.mockRejectedValueOnce(
      new Error("User rejected the request"),
    )

    const { result } = renderHook(() => useWalletLink())
    await waitFor(() => expect(result.current.needsLink).toBe(true))

    await act(async () => {
      await result.current.link()
    })

    expect(result.current.error).not.toBeNull()
    expect(result.current.error!.toLowerCase()).toContain("rejected")
    expect(mockToastError).toHaveBeenCalled()
    // Still unlinked, so the CTA stays.
    expect(result.current.needsLink).toBe(true)
  })

  it("surfaces 'not available yet' when the link endpoint 404s", async () => {
    mockPost
      .mockResolvedValueOnce({ data: { nonce: { nonce: "n1" } } })
      .mockRejectedValueOnce({ response: { status: 404, data: {} } })

    const { result } = renderHook(() => useWalletLink())
    await waitFor(() => expect(result.current.needsLink).toBe(true))

    await act(async () => {
      await result.current.link()
    })

    expect(result.current.error).toContain("not available yet")
    expect(mockToastError).toHaveBeenCalled()
  })

  it("maps 409 to the owned-by-another-account copy", async () => {
    mockPost
      .mockResolvedValueOnce({ data: { nonce: { nonce: "n1" } } })
      .mockRejectedValueOnce({
        response: { status: 409, data: { error: "taken" } },
      })

    const { result } = renderHook(() => useWalletLink())
    await waitFor(() => expect(result.current.needsLink).toBe(true))

    await act(async () => {
      await result.current.link()
    })

    expect(result.current.error).toContain("already linked to another account")
  })

  it("maps 401 to the bad-signature copy", async () => {
    mockPost
      .mockResolvedValueOnce({ data: { nonce: { nonce: "n1" } } })
      .mockRejectedValueOnce({ response: { status: 401, data: {} } })

    const { result } = renderHook(() => useWalletLink())
    await waitFor(() => expect(result.current.needsLink).toBe(true))

    await act(async () => {
      await result.current.link()
    })

    expect(result.current.error).toContain("Signature verification failed")
  })

  it("does nothing when there is no candidate address", async () => {
    resetAll()
    authState.isAuthenticated = true

    const { result } = renderHook(() => useWalletLink())
    await waitFor(() => expect(result.current.checking).toBe(false))

    await act(async () => {
      await result.current.link()
    })

    expect(mockPost).not.toHaveBeenCalled()
    expect(result.current.error).toBeNull()
  })
})
