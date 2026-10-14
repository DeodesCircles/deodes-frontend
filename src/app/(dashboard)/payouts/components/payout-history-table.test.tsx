import React from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { PayoutHistoryTable } from "./payout-history-table"
import type { Payout } from "@/types"

const TXN_HASH =
  "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"

function makePayout(overrides: Partial<Payout> = {}): Payout {
  return {
    id: "payout-1",
    circleId: "circle-1",
    recipientId: "user-1",
    roundNumber: 2,
    amount: 199,
    feeAmount: 1,
    txnHash: TXN_HASH,
    payoutType: "fixed",
    createdAt: "2026-07-25T00:00:00Z",
    ...overrides,
  } as Payout
}

describe("PayoutHistoryTable", () => {
  it("renders each payout with round pill and USDC amount", () => {
    render(<PayoutHistoryTable payouts={[makePayout()]} />)
    expect(screen.getByText("#2")).toBeDefined()
    expect(screen.getByText("USDC · Arc")).toBeDefined()
  })

  it("links 0x receipts to the Arc explorer", () => {
    render(<PayoutHistoryTable payouts={[makePayout()]} />)
    const link = screen.getByRole("link", { name: /0x1234/i })
    expect(link.getAttribute("href")).toContain("/tx/0x1234")
  })

  it("renders non-Arc hashes as truncated text without a link", () => {
    render(<PayoutHistoryTable payouts={[makePayout({ txnHash: "legacy-hash" })]} />)
    expect(screen.queryByRole("link", { name: /legacy/ })).toBeNull()
    expect(screen.getByText("legacy...hash")).toBeDefined()
  })

  it("shows a settling state when no receipt exists yet", () => {
    render(<PayoutHistoryTable payouts={[makePayout({ txnHash: null })]} />)
    expect(screen.getByText("settling…")).toBeDefined()
  })

  it("shows the protocol fee when present", () => {
    render(<PayoutHistoryTable payouts={[makePayout({ feeAmount: 1 })]} />)
    expect(screen.getByText(/fee/)).toBeDefined()
  })
})
