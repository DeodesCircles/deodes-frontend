import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { MoiScoreGauge } from "../moi-score-gauge"

describe("MoiScoreGauge", () => {
  it("renders a valid score", () => {
    render(<MoiScoreGauge score={742} />)

    expect(screen.getByText("742")).toBeDefined()
    expect(screen.getByLabelText("MoiScore 742 out of 1000")).toBeDefined()
  })

  it("renders a useful zero-score state", () => {
    render(<MoiScoreGauge score={0} />)

    expect(screen.getByLabelText("MoiScore 0 out of 1000")).toBeDefined()
    expect(screen.getAllByText("0").length).toBeGreaterThan(0)
    expect(screen.getByText("of 1000")).toBeDefined()
  })
})
