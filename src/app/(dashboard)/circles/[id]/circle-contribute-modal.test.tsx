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

function modalProps(overrides: Partial<React.ComponentProps<typeof CircleContributeModal>> = {}) {
  return {
    circle,
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    isSubmitting: false,
    txnHash: "",
    onTxnHashChange: vi.fn(),
    txnHashError: null,
    ...overrides,
  } as React.ComponentProps<typeof CircleContributeModal>
}

describe("CircleContributeModal", () => {
  it("renders nothing when closed", () => {
    render(<CircleContributeModal {...modalProps({ isOpen: false })} />)

    expect(screen.queryByText("Confirm Contribution")).toBeNull()
  })

  it("shows the contribution details when open", () => {
    render(<CircleContributeModal {...modalProps()} />)

    expect(screen.getByText("Confirm Contribution")).toBeDefined()
    expect(screen.getByText("Test Circle")).toBeDefined()
  })

  it("calls onConfirm when the confirm button is clicked", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<CircleContributeModal {...modalProps({ onConfirm })} />)

    await user.click(screen.getByRole("button", { name: /Confirm & Sign/ }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("renders the Arc txn hash input and surfaces validation errors", async () => {
    const user = userEvent.setup()
    const onTxnHashChange = vi.fn()
    render(
      <CircleContributeModal
        {...modalProps({ onTxnHashChange, txnHashError: "Invalid transaction hash." })}
      />,
    )

    expect(screen.getByLabelText(/Arc transaction hash/i)).toBeDefined()
    expect(screen.getByText("Invalid transaction hash.")).toBeDefined()
    await user.type(screen.getByLabelText(/Arc transaction hash/i), "0xabc")
    expect(onTxnHashChange).toHaveBeenCalled()
  })
})
