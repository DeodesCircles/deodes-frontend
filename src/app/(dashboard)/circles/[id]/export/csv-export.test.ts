import { describe, it, expect } from "vitest"
import type { Contribution, Payout, CircleMember } from "@/types"
import {
  buildContributionsCSV,
  buildPayoutsCSV,
  buildMembersCSV,
  buildCombinedCSV,
  CONTRIBUTION_COLUMNS,
  PAYOUT_COLUMNS,
  MEMBER_COLUMNS,
} from "./csv-export"

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const contribution: Contribution = {
  id: "c1",
  circleId: "circle-1",
  userId: "user-1",
  roundNumber: 1,
  amount: 100,
  status: "confirmed",
  onTime: true,
  txnHash: "abc123",
  createdAt: "2026-06-15T10:00:00Z",
}

const contribution2: Contribution = {
  id: "c2",
  circleId: "circle-1",
  userId: "user-2",
  roundNumber: 2,
  amount: 200,
  status: "pending",
  onTime: false,
  txnHash: null,
  createdAt: "2026-07-20T10:00:00Z",
}

const payout: Payout = {
  id: "p1",
  circleId: "circle-1",
  recipientId: "user-1",
  roundNumber: 1,
  amount: 500,
  feeAmount: 2.5,
  payoutType: "fixed",
  txnHash: "def456",
  createdAt: "2026-06-16T10:00:00Z",
}

const member: CircleMember = {
  id: "m1",
  circleId: "circle-1",
  userId: "user-1",
  position: 1,
  status: "active",
  userName: "Alice",
  userAddress: "GABC",
  joinedAt: "2026-06-01T00:00:00Z",
}

const allContribCols = CONTRIBUTION_COLUMNS.map((c) => c.key)
const allPayoutCols = PAYOUT_COLUMNS.map((c) => c.key)
const allMemberCols = MEMBER_COLUMNS.map((c) => c.key)

// ─── buildContributionsCSV ────────────────────────────────────────────────────

describe("buildContributionsCSV", () => {
  it("generates header and one data row", () => {
    const csv = buildContributionsCSV([contribution], allContribCols)
    const lines = csv.split("\n")
    expect(lines[0]).toContain("ID")
    expect(lines[0]).toContain("Round")
    expect(lines[0]).toContain("Amount")
    expect(lines[1]).toContain("c1")
    expect(lines[1]).toContain("100")
    expect(lines[1]).toContain("confirmed")
  })

  it("escapes double quotes in values", () => {
    const tricky: Contribution = {
      ...contribution,
      id: 'id"with"quotes',
    }
    const csv = buildContributionsCSV([tricky], ["id"])
    expect(csv).toContain('"id""with""quotes"')
  })

  it("filters by dateFrom", () => {
    const csv = buildContributionsCSV([contribution, contribution2], allContribCols, "2026-07-01")
    const lines = csv.split("\n")
    // Only c2 (July 20) should be included
    expect(lines.length).toBe(2) // header + 1 row
    expect(csv).toContain("c2")
    expect(csv).not.toContain("c1")
  })

  it("filters by dateTo", () => {
    const csv = buildContributionsCSV([contribution, contribution2], allContribCols, undefined, "2026-06-30")
    expect(csv).toContain("c1")
    expect(csv).not.toContain("c2")
  })

  it("filters by both dateFrom and dateTo", () => {
    const csv = buildContributionsCSV([contribution, contribution2], allContribCols, "2026-07-01", "2026-07-31")
    expect(csv).not.toContain("c1")
    expect(csv).toContain("c2")
  })

  it("returns empty string when no columns selected", () => {
    const csv = buildContributionsCSV([contribution], [])
    expect(csv).toBe("")
  })

  it("respects column selection — only shows selected columns", () => {
    const csv = buildContributionsCSV([contribution], ["id", "amount"])
    const header = csv.split("\n")[0]
    expect(header).toContain("ID")
    expect(header).toContain("Amount")
    expect(header).not.toContain("Round")
    expect(header).not.toContain("Status")
  })

  it("handles null txnHash gracefully", () => {
    const csv = buildContributionsCSV([{ ...contribution, txnHash: null }], allContribCols)
    // Should not throw; the txnHash cell should be empty string
    const lines = csv.split("\n")
    expect(lines.length).toBeGreaterThanOrEqual(2)
  })
})

// ─── buildPayoutsCSV ──────────────────────────────────────────────────────────

describe("buildPayoutsCSV", () => {
  it("generates header and data row for a payout", () => {
    const csv = buildPayoutsCSV([payout], allPayoutCols)
    const lines = csv.split("\n")
    expect(lines[0]).toContain("Recipient ID")
    expect(lines[0]).toContain("Fee Amount")
    expect(lines[1]).toContain("p1")
    expect(lines[1]).toContain("500")
    expect(lines[1]).toContain("fixed")
  })

  it("applies date range filter", () => {
    const payout2: Payout = { ...payout, id: "p2", createdAt: "2026-08-01T00:00:00Z" }
    const csv = buildPayoutsCSV([payout, payout2], allPayoutCols, "2026-07-01")
    expect(csv).toContain("p2")
    expect(csv).not.toContain("p1")
  })

  it("returns empty string when no columns selected", () => {
    expect(buildPayoutsCSV([payout], [])).toBe("")
  })
})

// ─── buildMembersCSV ──────────────────────────────────────────────────────────

describe("buildMembersCSV", () => {
  it("generates header and data row for a member", () => {
    const csv = buildMembersCSV([member], allMemberCols)
    const lines = csv.split("\n")
    expect(lines[0]).toContain("User ID")
    expect(lines[0]).toContain("Name")
    expect(lines[0]).toContain("Position")
    expect(lines[1]).toContain("user-1")
    expect(lines[1]).toContain("Alice")
  })

  it("handles member with no userName", () => {
    const noName: CircleMember = { ...member, userName: null }
    const csv = buildMembersCSV([noName], allMemberCols)
    const lines = csv.split("\n")
    expect(lines.length).toBe(2)
  })

  it("returns empty string when no columns selected", () => {
    expect(buildMembersCSV([member], [])).toBe("")
  })
})

// ─── buildCombinedCSV ─────────────────────────────────────────────────────────

describe("buildCombinedCSV", () => {
  it("all scope includes members, contributions, and payouts sections", () => {
    const csv = buildCombinedCSV({
      scope: "all",
      contributions: [contribution],
      payouts: [payout],
      members: [member],
      contributionColumns: allContribCols,
      payoutColumns: allPayoutCols,
      memberColumns: allMemberCols,
    })
    expect(csv).toContain("user-1")    // member
    expect(csv).toContain("confirmed") // contribution
    expect(csv).toContain("fixed")     // payout
  })

  it("contributions scope omits members and payouts", () => {
    const csv = buildCombinedCSV({
      scope: "contributions",
      contributions: [contribution],
      payouts: [payout],
      members: [member],
      contributionColumns: allContribCols,
      payoutColumns: allPayoutCols,
      memberColumns: allMemberCols,
    })
    expect(csv).toContain("confirmed")
    expect(csv).not.toContain("fixed") // payout type
    // member userId would also appear in contributions, so check payout-specific field
    expect(csv).not.toContain("Fee Amount")
  })

  it("payouts scope includes only payouts", () => {
    const csv = buildCombinedCSV({
      scope: "payouts",
      contributions: [contribution],
      payouts: [payout],
      members: [member],
      contributionColumns: allContribCols,
      payoutColumns: allPayoutCols,
      memberColumns: allMemberCols,
    })
    expect(csv).toContain("Recipient ID")
    expect(csv).not.toContain("On Time") // contribution-only column
    expect(csv).not.toContain("Position") // member-only column
  })

  it("members scope includes only members", () => {
    const csv = buildCombinedCSV({
      scope: "members",
      contributions: [contribution],
      payouts: [payout],
      members: [member],
      contributionColumns: allContribCols,
      payoutColumns: allPayoutCols,
      memberColumns: allMemberCols,
    })
    expect(csv).toContain("Position")
    expect(csv).not.toContain("On Time")
    expect(csv).not.toContain("Recipient ID")
  })

  it("passes date range to contributions and payouts", () => {
    const csv = buildCombinedCSV({
      scope: "all",
      contributions: [contribution, contribution2],
      payouts: [payout],
      members: [member],
      contributionColumns: allContribCols,
      payoutColumns: allPayoutCols,
      memberColumns: allMemberCols,
      dateFrom: "2026-07-01",
    })
    // contribution (June 15) should be filtered out
    expect(csv).not.toContain('"c1"')
    // contribution2 (July 20) should be present
    expect(csv).toContain("c2")
    // payout (June 16) should be filtered out too
    expect(csv).not.toContain('"p1"')
  })

  it("returns empty string when all sections produce no data", () => {
    const csv = buildCombinedCSV({
      scope: "contributions",
      contributions: [],
      payouts: [],
      members: [],
      contributionColumns: [],
      payoutColumns: [],
      memberColumns: [],
    })
    expect(csv).toBe("")
  })
})
