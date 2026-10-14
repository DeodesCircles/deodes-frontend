import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { GoalForm } from "./GoalForm"

function renderForm(props: Partial<React.ComponentProps<typeof GoalForm>> = {}) {
  return render(
    <GoalForm pending={false} onCancel={() => {}} onCreate={vi.fn()} {...props} />,
  )
}

describe("GoalForm — inline validation", () => {
  it("shows a name error for short names", async () => {
    renderForm()
    const nameInput = screen.getByPlaceholderText(/Emergency fund/i)
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, "AB")
    expect(await screen.findByText(/at least 3 characters/)).toBeDefined()
  })

  it("shows a target error for zero amounts and caps at 1,000,000", async () => {
    renderForm()
    const targetInput = screen.getByPlaceholderText("500.00")
    await userEvent.clear(targetInput)
    await userEvent.type(targetInput, "0")
    expect(await screen.findByText(/above 0 USDC/)).toBeDefined()

    await userEvent.clear(targetInput)
    await userEvent.type(targetInput, "2000000")
    expect(await screen.findByText(/1,000,000/)).toBeDefined()
  })

  it("rejects past deadlines", async () => {
    renderForm()
    const deadline = screen.getByLabelText(/Deadline/i)
    fireEvent.change(deadline, { target: { value: "2020-01-01" } })
    expect(await screen.findByText(/future date/)).toBeDefined()
  })

  it("disables submit until the form is valid", async () => {
    renderForm()
    const submit = screen.getByRole("button", { name: /Create vault/ })
    // Empty name + empty target → invalid on first render (touched=false but
    // isValid derives from client errors, so the button is disabled).
    expect(submit.hasAttribute("disabled")).toBe(true)

    await userEvent.type(screen.getByPlaceholderText(/Emergency fund/i), "Emergency fund")
    await userEvent.type(screen.getByPlaceholderText("500.00"), "500")
    expect(submit.hasAttribute("disabled")).toBe(false)
  })

  it("blocks submit when invalid and calls onCreate when valid", async () => {
    const onCreate = vi.fn()
    renderForm({ onCreate })
    const submit = screen.getByRole("button", { name: /Create vault/ })
    // Invalid from the start: the button is disabled, so no submit can happen.
    expect(submit.hasAttribute("disabled")).toBe(true)
    fireEvent.click(submit)
    expect(onCreate).not.toHaveBeenCalled()

    await userEvent.type(screen.getByPlaceholderText(/Emergency fund/i), "Emergency fund")
    await userEvent.type(screen.getByPlaceholderText("500.00"), "250")
    fireEvent.click(screen.getByRole("button", { name: /Create vault/ }))
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Emergency fund", targetAmount: 250 }),
    )
  })
})

describe("GoalForm — server errors", () => {
  it("maps API field names to form fields and shows a top-level alert", () => {
    renderForm({
      serverFieldErrors: { targetAmount: "Must be positive." },
      serverError: "Validation failed.",
    })
    expect(screen.getByText("Must be positive.")).toBeDefined()
    expect(screen.getByTestId("goal-form-server-error")).toBeDefined()
  })
})
