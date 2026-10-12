import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CircleDetailPage from "./page";

const mockUseAuth = vi.fn();
const mockUseCircle = vi.fn();
const mockUseCircleMembers = vi.fn();
const mockUseCirclePayouts = vi.fn();
const mockUseContribute = vi.fn();
const mockUseJoinCircle = vi.fn();
const mockUseStartCircle = vi.fn();
const mockAddToast = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "circle-42" }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/use-circles", () => ({
  useCircle: () => mockUseCircle(),
  useCircleMembers: () => mockUseCircleMembers(),
  useContribute: () => mockUseContribute(),
  useJoinCircle: () => mockUseJoinCircle(),
  useStartCircle: () => mockUseStartCircle(),
}));

vi.mock("@/hooks/use-payouts", () => ({
  useCirclePayouts: () => mockUseCirclePayouts(),
}));

vi.mock("@/stores/ui-store", () => ({
  useUIStore: (selector: (state: { addToast: typeof mockAddToast }) => unknown) =>
    selector({ addToast: mockAddToast }),
}));

vi.mock("./circle-members-preview", () => ({
  CircleMembersPreview: ({ members }: { members: Array<{ userId: string }> }) => (
    <div>{members.length} members</div>
  ),
}));

vi.mock("./circle-stat-cards", () => ({
  CircleStatCards: () => <div>circle stats</div>,
}));

vi.mock("./circle-round-timeline", () => ({
  CircleRoundTimeline: () => <div>round timeline</div>,
}));

vi.mock("./circle-payouts-list", () => ({
  CirclePayoutsList: () => <div>payout list</div>,
}));

vi.mock("./circle-contribute-modal", () => ({
  CircleContributeModal: () => null,
}));

vi.mock("./circle-invite-modal", () => ({
  CircleInviteModal: () => null,
}));

vi.mock("./circle-join-code-modal", () => ({
  CircleJoinCodeModal: () => null,
}));

vi.mock("./use-invite-generation", () => ({
  useInviteGeneration: () => ({
    isOpen: false,
    isLoading: false,
    isError: false,
    error: null,
    code: "",
    copied: false,
    generate: vi.fn(),
    close: vi.fn(),
    copy: vi.fn(),
  }),
}));

describe("CircleDetailPage", () => {
  let joinMutate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    joinMutate = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({ user: { id: "user-3" } });
    mockUseCircleMembers.mockReturnValue({ data: [{ userId: "user-1" }, { userId: "user-2" }] });
    mockUseCirclePayouts.mockReturnValue({ data: { payouts: [] }, isLoading: false, isError: false });
    mockUseContribute.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseJoinCircle.mockReturnValue({ mutateAsync: joinMutate });
    mockUseStartCircle.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it("renders a loaded circle and allows joining", async () => {
    mockUseCircle.mockReturnValue({
      data: {
        id: "circle-42",
        name: "Savers Guild",
        description: "A community of disciplined savers.",
        organizerId: "user-1",
        contributionAmount: 25,
        currency: "USD",
        circleType: "public",
        status: "active",
      },
      isLoading: false,
      isError: false,
    });

    render(<CircleDetailPage />);

    expect(screen.getAllByText("Savers Guild").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /join circle/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /join circle/i }));

    expect(joinMutate).toHaveBeenCalledWith({
      circleId: "circle-42",
    });
  });

  it("shows a not found state when the circle fails to load", () => {
    mockUseCircle.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
    });

    render(<CircleDetailPage />);

    expect(screen.getByText("Circle Not Found")).toBeInTheDocument();
    expect(screen.getByText("Circle not found")).toBeInTheDocument();
  });

  it("shows the loading skeleton while the circle is fetching", () => {
    mockUseCircle.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(<CircleDetailPage />);

    expect(screen.getByText("...")).toBeInTheDocument();
  });
});
