import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { WalletSelectorDialog } from "../wallet-selector-dialog"

const mockStore: Record<string, unknown> = {
  isSelectorOpen: false,
  activeWalletId: null,
  wallets: {},
  setSelectorOpen: vi.fn(),
}

vi.mock("@/stores/multi-wallet-store", () => ({
  useMultiWalletStore: (selector: (s: typeof mockStore) => unknown) =>
    selector(mockStore),
}))

vi.mock("../wallet-selector", () => ({
  WalletSelector: ({ variant }: { variant?: string }) => (
    <div data-testid="wallet-selector" data-variant={variant}>
      selector
    </div>
  ),
}))

beforeEach(() => {
  Object.assign(mockStore, {
    isSelectorOpen: false,
    activeWalletId: null,
    wallets: {},
  })
  vi.clearAllMocks()
})

describe("WalletSelectorDialog", () => {
  it("renders nothing when closed", () => {
    render(<WalletSelectorDialog />)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("opens the overlay selector when isSelectorOpen", () => {
    mockStore.isSelectorOpen = true
    render(<WalletSelectorDialog />)
    expect(screen.getByRole("dialog")).toBeDefined()
    expect(screen.getByTestId("wallet-selector")).toBeDefined()
  })

  it("closes on backdrop and X", () => {
    const setOpen = vi.fn()
    mockStore.setSelectorOpen = setOpen
    mockStore.isSelectorOpen = true
    render(<WalletSelectorDialog />)
    fireEvent.click(screen.getByRole("button", { name: "Dismiss wallet dialog" }))
    fireEvent.click(screen.getByRole("button", { name: "Close wallet dialog" }))
    expect(setOpen).toHaveBeenCalledWith(false)
    expect(setOpen).toHaveBeenCalledTimes(2)
  })

  it("auto-closes after a successful connect", () => {
    const setOpen = vi.fn()
    mockStore.setSelectorOpen = setOpen
    mockStore.isSelectorOpen = true
    mockStore.activeWalletId = "arc-evm"
    mockStore.wallets = { "arc-evm": { status: "connected" } }
    render(<WalletSelectorDialog />)
    expect(setOpen).toHaveBeenCalledWith(false)
  })
})
