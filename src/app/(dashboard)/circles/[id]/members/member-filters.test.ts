import { describe, expect, it } from "vitest"
import type { CircleMember } from "@/types"
import { filterCircleMembers } from "./member-filters"

const members: CircleMember[] = [
  {
    id: "member-1",
    circleId: "circle-1",
    userId: "user-alpha-123",
    position: 1,
    status: "active",
    joinedAt: "2026-07-23T12:00:00.000Z",
  },
  {
    id: "member-2",
    circleId: "circle-1",
    userId: "user-beta-456",
    position: 2,
    status: "removed",
    joinedAt: "2026-05-01T12:00:00.000Z",
  },
]

describe("filterCircleMembers", () => {
  it("searches only the available user ID and position fields", () => {
    expect(
      filterCircleMembers(members, {
        search: "ALPHA",
        status: "",
        position: "",
        joined: "",
      }),
    ).toEqual([members[0]])

    expect(
      filterCircleMembers(members, {
        search: "456",
        status: "",
        position: "",
        joined: "",
      }),
    ).toEqual([members[1]])
  })

  it("combines status, position, and joined-date filters", () => {
    expect(
      filterCircleMembers(
        members,
        {
          search: "",
          status: "active",
          position: "1",
          joined: "7d",
        },
        new Date("2026-07-25T12:00:00.000Z"),
      ),
    ).toEqual([members[0]])

    expect(
      filterCircleMembers(
        members,
        {
          search: "",
          status: "removed",
          position: "",
          joined: "30d",
        },
        new Date("2026-07-25T12:00:00.000Z"),
      ),
    ).toEqual([])
  })
})
