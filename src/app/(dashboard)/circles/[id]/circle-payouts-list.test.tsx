import React from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import type { Circle, Payout } from "@/types"
import { CirclePayoutsList } from "./circle-payouts-list"

const circle = { id: "circle-1", currency: "USD" } as unknown as Circle

function makePayout(overrides: Partial<Payout> = {}): Payout {
  return {
    id: "payout-1",
    circleId: circle.id,
    recipientId: "user-1",
    roundNumber: 1,
    amount: 250,
    payoutType: "rotating",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as Payout
}

describe("CirclePayoutsList", () => {
  it("shows loading skeletons while fetching", () => {
    const { container } = render(
      <CirclePayoutsList
        circle={circle}
        circleId={circle.id}
        payouts={[]}
        isLoading
        isError={false}
      />,
    )

    expect(container.querySelectorAll('[class*="animate-shimmer"]').length).toBeGreaterThan(0)
  })

  it("shows an error state when loading fails", () => {
    render(
      <CirclePayoutsList
        circle={circle}
        circleId={circle.id}
        payouts={[]}
        isLoading={false}
        isError
      />,
    )

    expect(screen.getByText("Failed to load payouts")).toBeDefined()
  })

  it("shows an empty state when there are no payouts", () => {
    render(
      <CirclePayoutsList
        circle={circle}
        circleId={circle.id}
        payouts={[]}
        isLoading={false}
        isError={false}
      />,
    )

    expect(screen.getByText(/No payouts yet/)).toBeDefined()
  })

  it("renders each payout's round and amount", () => {
    render(
      <CirclePayoutsList
        circle={circle}
        circleId={circle.id}
        payouts={[makePayout({ roundNumber: 3, amount: 500 })]}
        isLoading={false}
        isError={false}
      />,
    )

    expect(screen.getByText("Round 3 Payout")).toBeDefined()
  })
})
