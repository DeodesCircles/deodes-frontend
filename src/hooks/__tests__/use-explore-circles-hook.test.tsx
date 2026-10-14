import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { get } from "@/lib/api-client"
import { useExploreCircles } from "../use-explore-circles"
import type { Circle } from "@/types"

vi.mock("@/lib/api-client", () => ({ get: vi.fn() }))

const mockedGet = vi.mocked(get)

function circle(overrides: Partial<Circle> = {}): Circle {
  return {
    id: "live-open",
    name: "Open Savers",
    description: "A public pool",
    circleType: "public",
    payoutType: "fixed",
    contributionAmount: 25,
    currency: "USDC",
    frequency: "weekly",
    maxMembers: 10,
    minMoiScore: 0,
    collateralPercent: 0,
    lateFeePercent: 5,
    gracePeriodHours: 24,
    maxStrikes: 3,
    autoDebit: false,
    requiresInvite: false,
    status: "active",
    currentRound: 2,
    totalContributions: 500,
    organizerId: "org-1",
    organizerName: "Ada",
    memberCount: 5,
    createdAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  }
}

const LIVE = [
  circle({ id: "live-ended", name: "Done Deal", status: "completed" }),
  circle({ id: "live-full", name: "Packed Pool", memberCount: 10 }),
  circle({ id: "live-invite", name: "Secret Society", circleType: "private" }),
  circle({ id: "live-open", name: "Open Savers" }),
]

function renderExplore(search = "", type = "all") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(() => useExploreCircles(search, type), { wrapper })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedGet.mockResolvedValue({ success: true, data: { circles: LIVE } })
})

describe("useExploreCircles — discovery ordering", () => {
  it("reports the live source when the API returns circles", async () => {
    const { result } = renderExplore()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.source).toBe("live")
  })

  it("lists joinable circles before invite-only, full and ended ones", async () => {
    const { result } = renderExplore()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const ids = result.current.circles.map((c) => c.id)
    expect(ids[0]).toBe("live-open")
    expect(ids[1]).toBe("live-invite")
    expect(ids.slice(2).sort()).toEqual(["live-ended", "live-full"])
  })

  it("filters by search across name, description and organizer", async () => {
    const { result } = renderExplore("secret")
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.circles.map((c) => c.id)).toEqual(["live-invite"])
  })

  it("filters by circle type", async () => {
    const { result } = renderExplore("", "private")
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.circles.map((c) => c.id)).toEqual(["live-invite"])
  })
})
