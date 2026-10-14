import React from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import PayoutsPage from "./page"

const mockUseLivePayouts = vi.fn()
const mockRefetch = vi.fn()

vi.mock("@/hooks/use-live-payouts", () => ({
  useLivePayouts: () => mockUseLivePayouts(),
}))

function payout(id: string, overrides = {}) {
  return {
    id,
    circleId: "circle-1",
    recipientId: "user-1",
    roundNumber: 1,
    amount: 100,
    feeAmount: 0.5,
    txnHash: null,
    payoutType: "fixed",
    createdAt: "2026-07-25T00:00:00Z",
    ...overrides,
  }
}

describe("PayoutsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows the loading skeleton while fetching", () => {
    mockUseLivePayouts.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: mockRefetch, isLive: false })
    render(<PayoutsPage />)
    expect(screen.getByTestId("payouts-loading")).toBeDefined()
  })

  it("shows the empty state when no payouts exist", () => {
    mockUseLivePayouts.mockReturnValue({
      data: { payouts: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
      isLive: true,
    })
    render(<PayoutsPage />)
    expect(screen.getByText("No payouts received yet")).toBeDefined()
  })

  it("shows the error state with a working retry", () => {
    mockUseLivePayouts.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: mockRefetch, isLive: false })
    render(<PayoutsPage />)
    expect(screen.getByText("Failed to load payouts")).toBeDefined()
    fireEvent.click(screen.getByRole("button", { name: /Retry/ }))
    expect(mockRefetch).toHaveBeenCalled()
  })

  it("renders real payouts with page totals and pagination", () => {
    mockUseLivePayouts.mockReturnValue({
      data: {
        payouts: [payout("p1", { amount: 125 }), payout("p2", { amount: 75, roundNumber: 2 })],
        meta: { page: 1, limit: 20, total: 2, totalPages: 2 },
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
      isLive: true,
    })
    render(<PayoutsPage />)
    expect(screen.getByTestId("payout-history")).toBeDefined()
    expect(screen.getByTestId("payout-page-total")).toBeDefined()
    expect(screen.getByText(/Page 1 of 2/)).toBeDefined()
    expect(screen.getByRole("button", { name: /Next/ })).toBeDefined()
  })
})
