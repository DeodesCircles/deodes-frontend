import React from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import type { Circle } from "@/types"
import { CircleRoundTimeline } from "./circle-round-timeline"

function makeCircle(maxMembers: number, currentRound: number): Circle {
  return {
    id: "circle-1",
    name: "Test Circle",
    maxMembers,
    currentRound,
  } as unknown as Circle
}

describe("CircleRoundTimeline", () => {
  it("renders one node per round", () => {
    render(<CircleRoundTimeline circle={makeCircle(4, 2)} />)

    // Round 1 is completed, so it renders a checkmark instead of its number.
    expect(screen.getByText("2")).toBeDefined()
    expect(screen.getByText("Current")).toBeDefined()
    expect(screen.getByText("R3")).toBeDefined()
    expect(screen.getByText("R4")).toBeDefined()
  })
})
