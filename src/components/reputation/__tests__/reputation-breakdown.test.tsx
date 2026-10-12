import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ReputationBreakdown } from "../reputation-breakdown"

describe("ReputationBreakdown", () => {
  it("renders every score factor", () => {
    render(
      <ReputationBreakdown
        breakdown={{ streaks: 82, completions: 65, volume: 48, recency: 90 }}
      />,
    )

    expect(screen.getByText("Streaks")).toBeDefined()
    expect(screen.getByText("Completions")).toBeDefined()
    expect(screen.getByText("Volume")).toBeDefined()
    expect(screen.getByText("Recency")).toBeDefined()
    expect(screen.getByText(/35% weight/)).toBeDefined()
  })

  it("renders zero values without going blank", () => {
    render(
      <ReputationBreakdown
        breakdown={{ streaks: 0, completions: 0, volume: 0, recency: 0 }}
      />,
    )

    expect(screen.getAllByText("0")).toHaveLength(4)
    expect(screen.getByText("4 factors")).toBeDefined()
  })
})
