import { describe, expect, it } from "vitest"
import { resolveExploreSource } from "../use-explore-circles"
import { MOCK_CIRCLES } from "@/lib/circles/mock-circles"
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
