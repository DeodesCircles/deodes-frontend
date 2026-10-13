import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockReplace = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
    warning: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
  }),
}))

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }))

vi.mock("@/lib/api-client", () => ({
  post: mockPost,
}))

vi.mock("@/lib/monitoring", () => ({
  recordMetric: vi.fn(),
  captureAuthError: vi.fn(),
}))

const mockSetTokens = vi.fn()

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: {
    getState: () => ({ setTokens: mockSetTokens }),
  },
}))

import { useAuthFlowStore } from "@/stores/auth-flow-store"
import { useMultiWalletStore } from "@/stores/multi-wallet-store"
import {
  isUserRejectionMessage,
  toFriendlyWalletAuthError,
  useWalletAuth,
} from "@/hooks/use-wallet-auth"

const EVM_ADDRESS = "0xAbC123000000000000000000000000000000dE0D"

function mockAdapter(signImpl?: (...args: unknown[]) => Promise<unknown>) {
  return {
    meta: {
      id: "freighter",
      name: "Freighter",
      category: "extension",
      icon: "",
      installUrl: "",
      description: "",
      priority: 1,
      isAvailable: () => true,
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: vi.fn().mockResolvedValue(true),
    signMessage: signImpl ?? vi.fn().mockResolvedValue({ signature: "sig-abc", publicKey: EVM_ADDRESS }),
    signTransaction: vi.fn(),
    getPublicKey: vi.fn().mockResolvedValue(EVM_ADDRESS),
    getNetwork: vi.fn().mockResolvedValue("testnet"),
  } as unknown as import("@/lib/wallet/types").WalletAdapter
}

function setConnected(adapter?: import("@/lib/wallet/types").WalletAdapter) {
  useMultiWalletStore.setState({
    activeWalletId: "freighter",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    wallets: {
      freighter: {
        adapter: adapter ?? mockAdapter(),
        publicKey: EVM_ADDRESS,
        network: "testnet",
        balance: null,
        lastConnected: Date.now(),
        error: null,
        status: "connected",
      },
    } as unknown as Record<string, never>,
  })
}

function resetAll() {
  useAuthFlowStore.getState().reset()
  useMultiWalletStore.setState({
    activeWalletId: null,
    wallets: {},
    loginError: null,
    registerError: null,
  })
}

describe("useWalletAuth helpers", () => {
  it("detects user-rejected signatures", () => {
    expect(isUserRejectionMessage("User rejected the request")).toBe(true)
    expect(isUserRejectionMessage("user_rejected")).toBe(true)
    expect(isUserRejectionMessage("Request denied (4001)")).toBe(true)
    expect(isUserRejectionMessage("Network error")).toBe(false)
    expect(isUserRejectionMessage(null)).toBe(false)
  })

  it("maps rejections to friendly retry copy", () => {
    const friendly = toFriendlyWalletAuthError("User rejected request")
    expect(friendly.toLowerCase()).toContain("rejected")
    expect(toFriendlyWalletAuthError("boom")).toBe("boom")
    expect(toFriendlyWalletAuthError("")).toContain("try again")
  })
})

describe("useWalletAuth bridge", () => {
  beforeEach(() => {
    resetAll()
    vi.clearAllMocks()
    localStorage.clear()
  })

  it("stays idle when no wallet is connected", async () => {
    const { result } = renderHook(() => useWalletAuth({ mode: "login" }))
    expect(result.current.isConnected).toBe(false)
    expect(result.current.isAuthenticating).toBe(false)
    expect(result.current.error).toBeNull()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(mockPost).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it("bridges a connected wallet to signAndSubmit and redirects login to /", async () => {
    mockPost
      .mockResolvedValueOnce({ data: { nonce: { nonce: "nonce-123" } } })
      .mockResolvedValueOnce({
        data: { token: "jwt", refreshToken: "refresh", user: { id: "u1" } },
      })

    const { result } = renderHook(() => useWalletAuth({ mode: "login" }))

    act(() => {
      setConnected()
    })

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/")
    })
    expect(mockPost).toHaveBeenCalledWith(
      "/auth/nonce",
      { walletAddress: EVM_ADDRESS },
      { _retry: true },
    )
    expect(mockPost).toHaveBeenCalledWith(
      "/auth/verify",
      expect.objectContaining({ walletAddress: EVM_ADDRESS, nonce: "nonce-123" }),
      { _retry: true },
    )
    expect(mockSetTokens).toHaveBeenCalled()
    expect(mockToastSuccess).toHaveBeenCalled()
    expect(useMultiWalletStore.getState().loginError).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it("redirects register wallets to /wallet?fresh=1", async () => {
    mockPost
      .mockResolvedValueOnce({ data: { nonce: { nonce: "n1" } } })
      .mockResolvedValueOnce({
        data: { token: "jwt", refreshToken: "refresh", user: { id: "u2" } },
      })

    renderHook(() => useWalletAuth({ mode: "register" }))

    act(() => {
      setConnected()
    })

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/wallet?fresh=1")
    })
  })

  it("surfaces verify failures in the mode-scoped route error", async () => {
    mockPost
      .mockResolvedValueOnce({ data: { nonce: { nonce: "n1" } } })
      .mockRejectedValueOnce({
        response: { status: 401, data: { error: "signature verification failed" } },
      })

    const { result } = renderHook(() => useWalletAuth({ mode: "login" }))

    act(() => {
      setConnected()
    })

    await waitFor(() => {
      expect(result.current.error).toContain("signature verification failed")
    })
    expect(useMultiWalletStore.getState().loginError).toContain(
      "signature verification failed",
    )
    expect(useMultiWalletStore.getState().registerError).toBeNull()
    expect(mockReplace).not.toHaveBeenCalled()
    expect(mockToastError).toHaveBeenCalled()
  })

  it("writes registerError (not loginError) for register mode failures", async () => {
    mockPost.mockRejectedValueOnce(new Error("nonce down"))

    const { result } = renderHook(() => useWalletAuth({ mode: "register" }))

    act(() => {
      setConnected()
    })

    await waitFor(() => {
      expect(result.current.error).toContain("nonce down")
    })
    expect(useMultiWalletStore.getState().registerError).toContain("nonce down")
    expect(useMultiWalletStore.getState().loginError).toBeNull()
  })

  it("handles user-rejected signatures gracefully with friendly copy", async () => {
    mockPost.mockResolvedValueOnce({ data: { nonce: { nonce: "n1" } } })
    const rejecting = mockAdapter(() =>
      Promise.reject(new Error("User rejected the request")),
    )

    const { result } = renderHook(() => useWalletAuth({ mode: "login" }))

    act(() => {
      setConnected(rejecting)
    })

    await waitFor(() => {
      expect(result.current.error).not.toBeNull()
    })
    expect(result.current.error!.toLowerCase()).toContain("rejected")
    expect(useMultiWalletStore.getState().loginError!.toLowerCase()).toContain(
      "rejected",
    )
    expect(mockReplace).not.toHaveBeenCalled()
    // No throw escapes the hook; the effect promise resolves to undefined.
    expect(mockToastError).toHaveBeenCalled()
  })

  it("authenticates a given wallet only once (no double submit)", async () => {
    mockPost
      .mockResolvedValueOnce({ data: { nonce: { nonce: "n1" } } })
      .mockResolvedValueOnce({
        data: { token: "jwt", refreshToken: "refresh", user: { id: "u1" } },
      })

    const { rerender } = renderHook(() => useWalletAuth({ mode: "login" }))

    act(() => {
      setConnected()
    })

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/")
    })

    const nonceCalls = mockPost.mock.calls.filter((c) => c[0] === "/auth/nonce")
    expect(nonceCalls).toHaveLength(1)

    rerender()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })
    expect(mockPost.mock.calls.filter((c) => c[0] === "/auth/nonce")).toHaveLength(1)
  })

  it("retry() re-attempts after a failure and then succeeds", async () => {
    mockPost.mockRejectedValueOnce(new Error("temporary outage"))

    const { result } = renderHook(() => useWalletAuth({ mode: "login" }))

    act(() => {
      setConnected()
    })

    await waitFor(() => {
      expect(result.current.error).toContain("temporary outage")
    })
    expect(mockReplace).not.toHaveBeenCalled()

    mockPost
      .mockResolvedValueOnce({ data: { nonce: { nonce: "n2" } } })
      .mockResolvedValueOnce({
        data: { token: "jwt2", refreshToken: "r2", user: { id: "u1" } },
      })

    await act(async () => {
      await result.current.retry()
    })

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/")
    })
    expect(useMultiWalletStore.getState().loginError).toBeNull()
  })

  it("does not trigger when disabled (hidden wallet tab)", async () => {
    renderHook(() => useWalletAuth({ mode: "register", enabled: false }))

    act(() => {
      setConnected()
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 40))
    })
    expect(mockPost).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
