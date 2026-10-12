import type { CircleMember } from "@/types"

export type JoinedFilter = "" | "7d" | "30d" | "1y"

interface MemberFilterValues {
  search: string
  status: string
  position: string
  joined: JoinedFilter
}

const joinedWindowDays: Record<Exclude<JoinedFilter, "">, number> = {
  "7d": 7,
  "30d": 30,
  "1y": 365,
}

export function filterCircleMembers(
  members: CircleMember[],
  filters: MemberFilterValues,
  now = new Date(),
): CircleMember[] {
  const query = filters.search.trim().toLowerCase()
  const minimumJoinedAt = filters.joined
    ? now.getTime() - joinedWindowDays[filters.joined] * 24 * 60 * 60 * 1000
    : null

  return members.filter((member) => {
    const matchesSearch =
      !query ||
      member.userId.toLowerCase().includes(query) ||
      String(member.position).includes(query)
    const matchesStatus = !filters.status || member.status === filters.status
    const matchesPosition =
      !filters.position || String(member.position) === filters.position
    const joinedAt = new Date(member.joinedAt).getTime()
    const matchesJoined =
      minimumJoinedAt === null ||
      (Number.isFinite(joinedAt) && joinedAt >= minimumJoinedAt && joinedAt <= now.getTime())

    return matchesSearch && matchesStatus && matchesPosition && matchesJoined
  })
}
