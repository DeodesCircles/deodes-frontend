import { describe, expect, it } from "vitest"
import {
  daysUntil,
  formatUsdc,
  isOverdue,
  progressPercent,
  remainingAmount,
  sortGoals,
} from "./savings-helpers"
import type { SavingsGoal } from "@/hooks/use-savings"

function makeGoal(overrides: Partial<SavingsGoal> = {}): SavingsGoal {
  return {
    id: "g1",
    userId: "u1",
    name: "Test",
    description: "",
    targetAmount: 1000,
    currentAmount: 250,
    targetDate: null,
    circleId: null,
    autoReserve: false,
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

describe("progressPercent", () => {
  it("computes 25% for 250 of 1000", () => {
    expect(progressPercent(makeGoal())).toBe(25)
  })

  it("clamps over-saving to 100 and guards zero targets", () => {
    expect(progressPercent(makeGoal({ currentAmount: 1500 }))).toBe(100)
    expect(progressPercent(makeGoal({ targetAmount: 0 }))).toBe(0)
    expect(progressPercent(makeGoal({ currentAmount: -50 }))).toBe(0)
  })
})

describe("remainingAmount", () => {
  it("returns the shortfall and never goes negative", () => {
    expect(remainingAmount(makeGoal())).toBe(750)
    expect(remainingAmount(makeGoal({ currentAmount: 1200 }))).toBe(0)
  })
})

describe("daysUntil / isOverdue", () => {
  const now = new Date("2026-06-15T12:00:00Z").getTime()

  it("returns null without a deadline and counts whole days otherwise", () => {
    expect(daysUntil(null, now)).toBeNull()
    expect(daysUntil(undefined, now)).toBeNull()
    expect(daysUntil("bad-date", now)).toBeNull()
    expect(daysUntil("2026-06-20", now)).toBe(6) // noon Jun 15 → end of Jun 20, rounded up
    expect(daysUntil("2026-06-10", now)).toBeLessThan(0)
  })

  it("flags only active goals past their deadline", () => {
    expect(isOverdue(makeGoal({ targetDate: "2026-06-10" }), now)).toBe(true)
    expect(isOverdue(makeGoal({ targetDate: "2026-06-20" }), now)).toBe(false)
    expect(isOverdue(makeGoal({ targetDate: "2026-06-10", status: "completed" }), now)).toBe(false)
    expect(isOverdue(makeGoal({ targetDate: null }), now)).toBe(false)
  })
})

describe("formatUsdc", () => {
  it("renders Arc USDC with two decimals and no XLM", () => {
    expect(formatUsdc(1250)).toBe("1,250.00 USDC")
    expect(formatUsdc(0)).toBe("0.00 USDC")
    expect(formatUsdc(99.9)).toContain("USDC")
    expect(formatUsdc(99.9)).not.toContain("XLM")
  })
})

describe("sortGoals", () => {
  it("orders active first, then nearest deadline, then newest", () => {
    const completed = makeGoal({ id: "c", status: "completed", targetDate: "2026-05-01" })
    const far = makeGoal({ id: "far", targetDate: "2027-01-01", createdAt: "2026-02-01T00:00:00Z" })
    const near = makeGoal({ id: "near", targetDate: "2026-07-01", createdAt: "2026-01-05T00:00:00Z" })
    const noDate = makeGoal({ id: "nodate", targetDate: null, createdAt: "2026-03-01T00:00:00Z" })

    expect(sortGoals([completed, noDate, far, near]).map((g) => g.id)).toEqual([
      "near",
      "far",
      "nodate",
      "c",
    ])
  })
})
