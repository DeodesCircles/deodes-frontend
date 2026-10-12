import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CircleJoinCodeModal } from "./circle-join-code-modal"

describe("CircleJoinCodeModal", () => {
  it("disables submit until a code is entered", () => {
    render(
      <CircleJoinCodeModal
        isOpen
        onClose={vi.fn()}
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
        error={null}
      />,
    )

    expect(screen.getByRole("button", { name: "Join Circle" })).toHaveProperty("disabled", true)
  })

  it("calls onChange as the user types", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <CircleJoinCodeModal
        isOpen
        onClose={vi.fn()}
        value=""
        onChange={onChange}
        onSubmit={vi.fn()}
        isLoading={false}
        error={null}
      />,
    )

    await user.type(screen.getByPlaceholderText("Paste invite code here..."), "X")
    expect(onChange).toHaveBeenCalledWith("X")
  })

  it("shows a validation error", () => {
    render(
      <CircleJoinCodeModal
        isOpen
        onClose={vi.fn()}
        value="bad-code"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
        error="Invalid invite code"
      />,
    )

    expect(screen.getByText("Invalid invite code")).toBeDefined()
  })

  it("calls onSubmit when the button is clicked with a value present", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <CircleJoinCodeModal
        isOpen
        onClose={vi.fn()}
        value="ABC123"
        onChange={vi.fn()}
        onSubmit={onSubmit}
        isLoading={false}
        error={null}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Join Circle" }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})
