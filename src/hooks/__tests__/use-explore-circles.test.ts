import { describe, expect, it } from "vitest"
import { resolveExploreSource } from "../use-explore-circles"
import { MOCK_CIRCLES, getDynamicMockCircles } from "@/lib/circles/mock-circles"
import type { Circle } from "@/types"

const REQUIRED_KEYS: Array<keyof Circle> = [
  "id",
  "name",
  "circleType",
  "payoutType",
  "contributionAmount",
  "currency",
  "frequency",
  "maxMembers",
  "status",
  "currentRound",
  "organizerId",
  "createdAt",
];

describe("resolveExploreSource", () => {
  it("uses live circles when any exist", () => {
    expect(resolveExploreSource(3, "auto")).toBe("live")
  })

  it("falls back to mock when the API is empty", () => {
    expect(resolveExploreSource(0, "auto")).toBe("mock")
  })

  it("honors forced mock and live modes", () => {
    expect(resolveExploreSource(9, "mock")).toBe("mock")
    expect(resolveExploreSource(0, "live")).toBe("live")
  })

  it("forces live on mainnet even when mock is requested or empty", () => {
    expect(resolveExploreSource(0, "auto", "mainnet")).toBe("live")
    expect(resolveExploreSource(0, "mock", "mainnet")).toBe("live")
    expect(resolveExploreSource(9, "mock", "mainnet")).toBe("live")
  })
})

describe("MOCK_CIRCLES", () => {
  it("covers every circle type", () => {
    const types = new Set(MOCK_CIRCLES.map((c) => c.circleType))
    expect(types.has("public")).toBe(true)
    expect(types.has("private")).toBe(true)
    expect(types.has("community")).toBe(true)
    expect(types.has("premium")).toBe(true)
  })

  it("satisfies the Circle contract", () => {
    for (const circle of MOCK_CIRCLES) {
      for (const key of REQUIRED_KEYS) {
        expect(circle[key], `missing ${key}`).toBeDefined()
      }
    }
  })
})

describe("getDynamicMockCircles", () => {
  it("is deterministic for the same timestamp", () => {
    const a = getDynamicMockCircles(1_790_000_000_000)
    const b = getDynamicMockCircles(1_790_000_000_000)
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id))
    expect(a.map((c) => c.currentRound)).toEqual(b.map((c) => c.currentRound))
  })

  it("advances rounds and never exceeds caps", () => {
    const early = getDynamicMockCircles(Date.parse("2026-10-01T00:00:00.000Z"))
    const late = getDynamicMockCircles(Date.parse("2027-10-01T00:00:00.000Z"))
    for (const c of late) {
      expect(c.currentRound).toBeLessThanOrEqual(c.maxMembers)
      expect(c.memberCount ?? 0).toBeLessThanOrEqual(c.maxMembers)
    }
    const earlyRounds = early.reduce((n, c) => n + c.currentRound, 0)
    const lateRounds = late.reduce((n, c) => n + c.currentRound, 0)
    expect(lateRounds).toBeGreaterThanOrEqual(earlyRounds)
  })

  it("rotates order across days", () => {
    const orders = new Set(
      [0, 1, 2, 3, 4, 5, 6].map((d) =>
        getDynamicMockCircles(Date.parse("2026-10-01T00:00:00.000Z") + d * 86_400_000)
          .map((c) => c.id)
          .join(","),
      ),
    )
    expect(orders.size).toBeGreaterThan(1)
  })
})
