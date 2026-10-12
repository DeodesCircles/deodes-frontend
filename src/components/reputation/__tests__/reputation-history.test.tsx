import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ReputationHistory } from "../reputation-history"

describe("ReputationHistory", () => {
  it("renders history data and its chart", () => {
    render(
      <ReputationHistory
        history={[
          { date: "2026-01-02T00:00:00.000Z", score: 420, reason: "On-time payment" },
          { date: "2026-02-02T00:00:00.000Z", score: 480, reason: "Circle completed" },
        ]}
      />,
    )

    expect(screen.getByLabelText("MoiScore history chart")).toBeDefined()
    expect(screen.getByText(/420 points/)).toBeDefined()
    expect(screen.getByText(/Circle completed/)).toBeDefined()
    expect(screen.getByText("2 events")).toBeDefined()
  })

  it("renders a clear empty-history state", () => {
    render(<ReputationHistory history={[]} />)

    expect(screen.getByText("Score history")).toBeDefined()
    expect(screen.getByText(/score changes will appear here/i)).toBeDefined()
  })
})
