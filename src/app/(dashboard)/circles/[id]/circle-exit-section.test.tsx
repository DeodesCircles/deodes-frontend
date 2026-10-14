import React from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { CircleExitSection } from "./circle-exit-section"
import { get, post } from "@/lib/api-client"
import { createQueryWrapper } from "@/hooks/__tests__/test-utils"
import type { Circle, CircleMember, Payout } from "@/types"

vi.mock("@/lib/api-client", () => ({
  get: vi.fn(),
  post: vi.fn(),
  getErrorMessage: (err: unknown) =>
    (err as { message?: string })?.message ?? "Request failed",
}))

const mockedGet = vi.mocked(get)
const mockedPost = vi.mocked(post)

const circle = {
  id: "circle-1",
  name: "Test Circle",
  status: "active",
  currency: "USDC",
} as unknown as Circle

const members = [
  { userId: "user-1", circleId: "circle-1", status: "active", userName: "Alice" },
  { userId: "user-2", circleId: "circle-1", status: "active", userName: "Bob" },
  { userId: "user-3", circleId: "circle-1", status: "active", userName: "Cara" },
] as unknown as CircleMember[]

const payoutTo = (recipientId: string, roundNumber: number) =>
  ({ id: `payout-${roundNumber}`, circleId: "circle-1", recipientId, roundNumber }) as Payout

function mockPayouts(payouts: Payout[]) {
  mockedGet.mockResolvedValue({
    success: true,
    data: { payouts },
    meta: { page: 1, limit: 100, total: payouts.length, totalPages: 1 },
  })
}

function renderSection(overrides: Partial<React.ComponentProps<typeof CircleExitSection>> = {}) {
  const { QueryWrapper } = createQueryWrapper()
  return render(
    <QueryWrapper>
      <CircleExitSection circle={circle} members={members} isMember isOrganizer={false} {...overrides} />
    </QueryWrapper>,
  )
}

describe("CircleExitSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders nothing for organizers and non-members", () => {
    const { QueryWrapper } = createQueryWrapper()
    const { container, rerender } = render(
      <QueryWrapper>
        <CircleExitSection circle={circle} members={members} isMember isOrganizer />
      </QueryWrapper>,
    )
    expect(container.firstChild).toBeNull()
    rerender(
      <QueryWrapper>
        <CircleExitSection circle={circle} members={members} isMember={false} isOrganizer={false} />
      </QueryWrapper>,
    )
    expect(container.firstChild).toBeNull()
  })

  it("shows the lock state with paid counts while rounds are outstanding", async () => {
    mockPayouts([payoutTo("user-1", 1)])
    renderSection()

    expect(await screen.findByText(/1 of 3 rounds paid so far/)).toBeDefined()
    expect(screen.getByText(/Withdrawals unlock after every member has been paid/)).toBeDefined()
    expect(screen.queryByRole("button", { name: /Leave circle/ })).toBeNull()
    // Per-member pills surface who is still waiting.
    expect(screen.getAllByText("waiting")).toHaveLength(2)
    expect(screen.getByText("paid")).toBeDefined()
  })

  it("offers withdrawal once every member has been paid", async () => {
    mockPayouts([payoutTo("user-1", 1), payoutTo("user-2", 2), payoutTo("user-3", 3)])
    mockedPost.mockResolvedValue({ success: true, data: { success: true } })
    renderSection()

    const button = await screen.findByRole("button", { name: /Leave circle/ })
    expect(screen.getByText(/All rounds paid/)).toBeDefined()
    fireEvent.click(button)

    await waitFor(() =>
      expect(mockedPost).toHaveBeenCalledWith("/circles/circle-1/exit", {}),
    )
  })

  it("surfaces the server lock message when exit is rejected", async () => {
    mockPayouts([payoutTo("user-1", 1), payoutTo("user-2", 2), payoutTo("user-3", 3)])
    mockedPost.mockRejectedValue(new Error("withdrawals unlock after every member has been paid"))
    renderSection()

    fireEvent.click(await screen.findByRole("button", { name: /Leave circle/ }))
    expect(await screen.findByRole("alert")).toBeDefined()
  })

  it("shows the button directly for pending circles with nothing to pay", async () => {
    mockPayouts([])
    renderSection({ circle: { ...circle, status: "pending" } as Circle })

    expect(await screen.findByRole("button", { name: /Leave circle/ })).toBeDefined()
    expect(screen.queryByText(/rounds paid so far/)).toBeNull()
  })
})
