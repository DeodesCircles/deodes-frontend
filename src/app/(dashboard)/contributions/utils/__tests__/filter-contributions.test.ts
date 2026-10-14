import { describe, expect, it } from "vitest";
import { filterContributions } from "../filter-contributions";
import type { Contribution } from "@/types";

function c(overrides: Partial<Contribution> = {}): Contribution {
  return {
    id: "c-1",
    circleId: "circle-1",
    userId: "user-1",
    roundNumber: 1,
    amount: 100,
    status: "confirmed",
    onTime: true,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Contribution;
}

describe("filterContributions", () => {
  it("filters by status", () => {
    const list = [c({ id: "a", status: "confirmed" }), c({ id: "b", status: "pending" })];
    expect(filterContributions(list, "", "confirmed").map((x) => x.id)).toEqual(["a"]);
    expect(filterContributions(list, "", "all")).toHaveLength(2);
  });

  it("searches id, circle, round and tx hash case-insensitively", () => {
    const list = [
      c({ id: "abc-1", circleId: "circle-1", roundNumber: 2, txnHash: "0xDEAD" }),
      c({ id: "xyz-2", circleId: "circle-9", roundNumber: 5 }),
    ];
    expect(filterContributions(list, "dead", "all").map((x) => x.id)).toEqual(["abc-1"]);
    expect(filterContributions(list, "CIRCLE-9", "all").map((x) => x.id)).toEqual(["xyz-2"]);
    expect(filterContributions(list, "5", "all").map((x) => x.id)).toEqual(["xyz-2"]);
  });
});
