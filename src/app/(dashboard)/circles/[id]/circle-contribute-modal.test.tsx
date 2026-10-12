import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { Circle } from "@/types"
import { CircleContributeModal } from "./circle-contribute-modal"

const circle = {
  id: "circle-1",
  name: "Test Circle",
  currency: "USD",
  contributionAmount: 150,
  currentRound: 2,
} as unknown as Circle

describe("CircleContributeModal", () => {
  it("renders nothing when closed", () => {
    render(
      <CircleContributeModal
        circle={circle}
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isSubmitting={false}
      />,
    )

    expect(screen.queryByText("Confirm Contribution")).toBeNull()
  })

  it("shows the contribution details when open", () => {
    render(
      <CircleContributeModal
        circle={circle}
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isSubmitting={false}
      />,
    )

    expect(screen.getByText("Confirm Contribution")).toBeDefined()
    expect(screen.getByText("Test Circle")).toBeDefined()
  })

  it("calls onConfirm when the confirm button is clicked", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <CircleContributeModal
        circle={circle}
        isOpen
        onClose={vi.fn()}
        onConfirm={onConfirm}
        isSubmitting={false}
      />,
    )

    await user.click(screen.getByRole("button", { name: /Confirm & Sign/ }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
