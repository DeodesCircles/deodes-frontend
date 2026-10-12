import React from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { CircleMember } from "@/types"
import { CircleMembersPreview } from "./circle-members-preview"

function createMembers(count: number): CircleMember[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `member-${index + 1}`,
    circleId: "circle-1",
    userId: `user-${index + 1}`,
    userName: `Member ${index + 1}`,
    position: index + 1,
    status: "active",
    joinedAt: "2026-01-01T00:00:00.000Z",
  }))
}

describe("CircleMembersPreview", () => {
  it("shows 10 avatars and a toggle when there are more than 10 members", () => {
    render(<CircleMembersPreview members={createMembers(12)} />)

    expect(screen.getAllByTitle(/Member \d+/)).toHaveLength(10)
    expect(screen.getByRole("button", { name: "+2 more" })).toBeDefined()
  })

  it("does not show a toggle when there are 10 or fewer members", () => {
    render(<CircleMembersPreview members={createMembers(10)} />)

    expect(screen.queryByRole("button")).toBeNull()
  })

  it("expands to reveal all members", async () => {
    const user = userEvent.setup()
    render(<CircleMembersPreview members={createMembers(12)} />)

    await user.click(screen.getByRole("button", { name: "+2 more" }))

    expect(screen.getAllByTitle(/Member \d+/)).toHaveLength(12)
    expect(screen.getByRole("button", { name: "Show less" })).toBeDefined()
  })

  it("collapses back to the truncated preview", async () => {
    const user = userEvent.setup()
    render(<CircleMembersPreview members={createMembers(12)} />)

    await user.click(screen.getByRole("button", { name: "+2 more" }))
    await user.click(screen.getByRole("button", { name: "Show less" }))

    expect(screen.getAllByTitle(/Member \d+/)).toHaveLength(10)
    expect(screen.getByRole("button", { name: "+2 more" })).toBeDefined()
  })

  it("displays the member count", () => {
    render(<CircleMembersPreview members={createMembers(7)} />)

    expect(screen.getByText("7 members")).toBeDefined()
  })

  it("renders the empty member message", () => {
    render(<CircleMembersPreview members={[]} />)

    expect(screen.getByText("0 members")).toBeDefined()
    expect(screen.getByText("No members yet.")).toBeDefined()
  })
})
