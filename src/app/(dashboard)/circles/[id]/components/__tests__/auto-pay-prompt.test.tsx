import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { AutoPayPrompt } from "../auto-pay-prompt"

const subscribeMutate = vi.fn()

vi.mock("@/hooks/use-subscriptions", () => ({
  useSubscribe: () => ({ mutateAsync: subscribeMutate, isPending: false }),
  useMySubscriptions: () => ({ data: mockSubs(), isLoading: false }),
}))

// Swapped per test: undefined = manual member, object = subscribed.
let currentSubs: { subscriptions: { circleId: string }[] } | undefined

function mockSubs() {
  return currentSubs === undefined
    ? undefined
    : { data: currentSubs };
}

function props() {
  return {
    circleId: "circle-9",
    contributionAmount: 25,
    maxMembers: 10,
    currency: "USDC",
    frequency: "weekly",
  }
}

describe("AutoPayPrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentSubs = { subscriptions: [] }
    window.localStorage.clear()
  })

  it("enrolls auto-pay with a full-circle cap", async () => {
    render(<AutoPayPrompt {...props()} />)

    fireEvent.click(screen.getByRole("button", { name: /auto-pay from my deodes balance/i }))
    await waitFor(() => {
      expect(subscribeMutate).toHaveBeenCalledWith({
        circleId: "circle-9",
        amount: 25,
        capTotal: 250,
      })
    })
  })

  it("dismisses to manual and stays dismissed", () => {
    const { rerender } = render(<AutoPayPrompt {...props()} />)

    fireEvent.click(screen.getByRole("button", { name: /i'll pay manually/i }))
    expect(
      window.localStorage.getItem("deodes-autopay-prompt-dismissed:circle-9"),
    ).toBe("1")

    rerender(<AutoPayPrompt {...props()} />)
    expect(screen.queryByText(/paying manually/i)).not.toBeInTheDocument()
  })

  it("renders nothing when already subscribed", () => {
    currentSubs = { subscriptions: [{ circleId: "circle-9" }] }
    const { container } = render(<AutoPayPrompt {...props()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
