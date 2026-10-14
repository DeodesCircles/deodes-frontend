import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContributionsPage from "../page";
import { useContributions } from "@/hooks/use-contributions";

vi.mock("@/hooks/use-contributions", () => ({
  useContributions: vi.fn(),
}));

const mocked = vi.mocked(useContributions);

function contribution(overrides: Record<string, unknown> = {}) {
  return {
    id: "c-1",
    circleId: "circle-1",
    userId: "user-1",
    roundNumber: 1,
    amount: 100,
    txnHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    status: "confirmed",
    onTime: true,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("ContributionsPage (GET /contributions)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeletons while fetching", () => {
    mocked.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() } as unknown as ReturnType<typeof useContributions>);
    render(<ContributionsPage />);
    expect(screen.getByTestId("contributions-loading")).toBeDefined();
  });

  it("shows the error state with retry", async () => {
    const refetch = vi.fn();
    mocked.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch } as unknown as ReturnType<typeof useContributions>);
    const user = userEvent.setup();
    render(<ContributionsPage />);
    expect(screen.getByText(/Failed to load contributions/i)).toBeDefined();
    await user.click(screen.getByRole("button", { name: /Retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("shows the empty state when there are no contributions", () => {
    mocked.mockReturnValue({
      data: { contributions: [], summary: null, meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useContributions>);
    render(<ContributionsPage />);
    expect(screen.getByText(/No contributions yet/i)).toBeDefined();
  });

  it("renders real data from GET /contributions with summary and timeline", () => {
    mocked.mockReturnValue({
      data: {
        contributions: [contribution(), contribution({ id: "c-2", amount: 50, status: "pending", roundNumber: 2 })],
        summary: null,
        meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useContributions>);
    render(<ContributionsPage />);
    // Summary totals the fetched records (100 + 50).
    expect(screen.getByText(/150\.00 USDC/)).toBeDefined();
    expect(screen.getAllByText(/Round #/)).toHaveLength(2);
    // Status pills + Arc explorer link for the 0x hash.
    expect(screen.getAllByText("confirmed").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link")[0].getAttribute("href")).toContain("/tx/0x");
  });

  it("filters client-side by status tabs", async () => {
    mocked.mockReturnValue({
      data: {
        contributions: [
          contribution({ roundNumber: 1, status: "confirmed" }),
          contribution({ id: "c-2", roundNumber: 2, status: "pending" }),
        ],
        summary: null,
        meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useContributions>);
    const user = userEvent.setup();
    render(<ContributionsPage />);
    await user.click(screen.getByRole("button", { name: "pending" }));
    await waitFor(() => {
      expect(screen.getAllByText(/Round #/)).toHaveLength(1);
    });
    expect(screen.getByText(/Round #2/)).toBeDefined();
  });
});
