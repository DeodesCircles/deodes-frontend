import React from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import type { Circle, CircleMember } from "@/types"
import { CircleStatCards } from "./circle-stat-cards"

const circle: Circle = {
  id: "circle-1",
  name: "Test Circle",
  description: null,
  organizerId: "user-1",
  contributionAmount: 100,
  currency: "USD",
  frequency: "weekly",
  payoutType: "rotating",
  status: "active",
  circleType: "public",
  maxMembers: 5,
  memberCount: 3,
  currentRound: 2,
} as unknown as Circle

function createMembers(count: number): CircleMember[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `member-${index + 1}`,
    circleId: circle.id,
    userId: `user-${index + 1}`,
    userName: `Member ${index + 1}`,
    position: index + 1,
    status: "active",
    joinedAt: "2026-01-01T00:00:00.000Z",
  }))
}

describe("CircleStatCards", () => {
  it("renders the circle's contribution, frequency, and payout type", () => {
    render(
      <CircleStatCards
        circle={circle}
        members={createMembers(3)}
        isMember={false}
        currentUserId="user-99"
      />,
    )

    expect(screen.getByText("Weekly")).toBeDefined()
    expect(screen.getByText("Rotating")).toBeDefined()
    expect(screen.getByText("3/5")).toBeDefined()
    expect(screen.getByText("Round 2/5")).toBeDefined()
  })

  it("shows the member's position when they are a member", () => {
    render(
      <CircleStatCards
        circle={circle}
        members={createMembers(3)}
        isMember
        currentUserId="user-2"
      />,
    )

    expect(screen.getByText("#2")).toBeDefined()
  })

  it("shows 'Not a member' when the viewer has not joined", () => {
    render(
      <CircleStatCards
        circle={circle}
        members={createMembers(3)}
        isMember={false}
        currentUserId="user-99"
      />,
    )

    expect(screen.getByText("Not a member")).toBeDefined()
  })
})
