import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { post } from "@/lib/api-client"
import { CircleBrowseCard } from "../circle-browse-card"
import type { Circle } from "@/types"

vi.mock("@/lib/api-client", () => ({ get: vi.fn(), post: vi.fn() }))
vi.mock("@/stores/ui-store", () => ({
  useUIStore: (selector: (s: { addToast: unknown }) => unknown) =>
    selector({ addToast: vi.fn() }),
}))
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

const mockedPost = vi.mocked(post)

function circle(overrides: Partial<Circle> = {}): Circle {
  return {
    id: "c1",
    name: "Open Savers",
    description: "Weekly pool",
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
    status: "pending",
    currentRound: 0,
    totalContributions: 0,
    organizerId: "org-1",
    memberCount: 3,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

function renderCard(c: Circle, moiScore?: number | null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return render(<CircleBrowseCard circle={c} moiScore={moiScore} />, { wrapper: Wrapper })
}

function httpError(message: string, status = 400) {
  return Object.assign(new Error(message), {
    response: { status, data: { error: message } },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedPost.mockResolvedValue({ success: true, data: { success: true } })
})

describe("CircleBrowseCard — joinable circle", () => {
  it("posts the join and lands on the circle detail page", async () => {
    renderCard(circle())

    fireEvent.click(screen.getByRole("button", { name: /^join$/i }))

    await waitFor(() =>
      expect(mockedPost).toHaveBeenCalledWith("/circles/c1/join", {}),
    )
    await waitFor(() => expect(push).toHaveBeenCalledWith("/circles/c1"))
  })
})

describe("CircleBrowseCard — blocked circles", () => {
  it("badges a full circle and explains instead of posting", async () => {
    renderCard(circle({ memberCount: 10 }))

    expect(screen.getByText("Full")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^join$/i })).toBeNull()
    expect(screen.getByRole("note")).toHaveTextContent(/full \(10\/10\)/i)

    expect(mockedPost).not.toHaveBeenCalled()
  })

  it("offers the invite path for invite-only circles", async () => {
    renderCard(circle({ circleType: "private" }))

    expect(screen.getByText("Invite only")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /get invite/i }))

    expect(push).toHaveBeenCalledWith("/circles/c1")
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it("badges ended circles with no join action", () => {
    renderCard(circle({ status: "completed" }))

    expect(screen.getByText("Ended")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^join$/i })).toBeNull()
    expect(screen.getByRole("note")).toHaveTextContent(/ended/i)
  })

  it("explains the DeoScore gap without posting", async () => {
    renderCard(circle({ minMoiScore: 100 }), 20)

    expect(screen.getByText("DeoScore gated")).toBeInTheDocument()
    // No direct-join button at all: the persistent note carries the reason.
    expect(screen.queryByRole("button", { name: /^join$/i })).toBeNull()
    expect(screen.getByRole("note")).toHaveTextContent(/DeoScore 100.*you have 20/i)
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it("surfaces a server-side race (409 full) as an alert", async () => {
    mockedPost.mockRejectedValue(httpError("this circle is full", 409))
    renderCard(circle({ memberCount: 9 }))

    fireEvent.click(screen.getByRole("button", { name: /^join$/i }))

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/circle is full/i),
    )
    // The failed join stays on the browser — no navigation.
    expect(push).not.toHaveBeenCalled()
  })
})
