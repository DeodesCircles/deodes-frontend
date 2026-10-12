import React from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import ReputationPage from "../page"

const mockUseAuth = vi.fn()
const mockUseReputation = vi.fn()

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock("@/hooks/use-reputation", () => ({
  useReputation: (userId: string) => mockUseReputation(userId),
}))

vi.mock("@/components/reputation/tier-card", () => ({
  TierCard: () => <div data-testid="tier-card">Tier card</div>,
}))

describe("ReputationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: { id: "user-46" },
      isLoading: false,
    })
  })

  it("renders the loading state", () => {
    mockUseReputation.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    })

    render(<ReputationPage />)

    expect(screen.getByLabelText("Loading reputation")).toBeDefined()
  })

  it("renders the error state", () => {
    mockUseReputation.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    })

    render(<ReputationPage />)

    expect(screen.getByText("Failed to load reputation")).toBeDefined()
  })

  it("renders the full reputation experience", () => {
    mockUseReputation.mockReturnValue({
      data: {
        score: 742,
        breakdown: { streaks: 80, completions: 65, volume: 50, recency: 90 },
        history: [
          { date: "2026-06-12T00:00:00.000Z", score: 700, reason: "On-time payment" },
          { date: "2026-07-12T00:00:00.000Z", score: 742, reason: "Circle completed" },
        ],
      },
      isLoading: false,
      isError: false,
    })

    render(<ReputationPage />)

    expect(mockUseReputation).toHaveBeenCalledWith("user-46")
    expect(screen.getByTestId("moi-score-gauge")).toBeDefined()
    expect(screen.getByTestId("reputation-breakdown")).toBeDefined()
    expect(screen.getByTestId("reputation-history")).toBeDefined()
    expect(screen.getByTestId("tier-card")).toBeDefined()
  })
})
