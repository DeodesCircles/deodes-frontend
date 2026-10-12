import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommunityDetailPage from "./page";

const mockUseAuth = vi.fn();
const mockUseCommunity = vi.fn();
const mockUseCommunityMembers = vi.fn();
const mockUseCommunityAnnouncements = vi.fn();
const mockUseCommunityActivity = vi.fn();
const mockUseCommunityCircles = vi.fn();
const mockUseCommunityMembership = vi.fn();
const mockUseCommunityMutation = vi.fn();
const mockAddToast = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "community-1" }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/use-community", () => ({
  useCommunity: () => mockUseCommunity(),
  useCommunityMembers: () => mockUseCommunityMembers(),
  useCommunityAnnouncements: () => mockUseCommunityAnnouncements(),
  useCommunityActivity: () => mockUseCommunityActivity(),
  useCommunityCircles: () => mockUseCommunityCircles(),
  useCommunityMembership: () => mockUseCommunityMembership(),
  useCommunityMutation: () => mockUseCommunityMutation(),
}));

vi.mock("@/stores/ui-store", () => ({
  useUIStore: (selector: (state: { addToast: typeof mockAddToast }) => unknown) =>
    selector({ addToast: mockAddToast }),
}));

vi.mock("@/lib/clipboard", () => ({
  copyToClipboard: vi.fn(async () => true),
}));

describe("CommunityDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "user-3" } });
    mockUseCommunityMutation.mockReturnValue({
      join: { mutateAsync: vi.fn().mockResolvedValue(undefined) },
      togglePin: { mutateAsync: vi.fn().mockResolvedValue(undefined) },
      deleteAnnouncement: { mutateAsync: vi.fn().mockResolvedValue(undefined) },
      removeMember: { mutateAsync: vi.fn().mockResolvedValue(undefined) },
      transferOwnership: { mutateAsync: vi.fn().mockResolvedValue(undefined) },
      createAnnouncement: { mutateAsync: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("renders the community and joins when the visitor is not yet a member", async () => {
    const joinMutate = vi.fn().mockResolvedValue(undefined);
    mockUseCommunity.mockReturnValue({
      data: {
        id: "community-1",
        name: "Moistello Circle",
        description: "Financial discipline community",
        category: "finance",
        tags: ["savings"],
        ownerId: "user-1",
        memberCount: 42,
        totalSaved: 2500,
        isFeatured: true,
        createdAt: "2026-01-01T00:00:00Z",
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mockUseCommunityMembers.mockReturnValue({ data: [{ userId: "user-1", role: "admin", displayName: "Alice" }], isLoading: false });
    mockUseCommunityAnnouncements.mockReturnValue({ data: [{ id: "a-1", content: "Welcome!", authorId: "user-1", isPinned: false, likeCount: 3, createdAt: "2026-06-01T00:00:00Z" }], isLoading: false });
    mockUseCommunityActivity.mockReturnValue({ data: [{ id: "e-1", eventType: "member_join", metadata: { actorName: "Alice" }, createdAt: "2026-06-02T00:00:00Z" }], isLoading: false });
    mockUseCommunityCircles.mockReturnValue({ data: [{ id: "c-1", name: "Weekly Saver", status: "active", circleType: "public", contributionAmount: 20, currency: "USD", frequency: "weekly", maxMembers: 10, currentRound: 1 }], isLoading: false });
    mockUseCommunityMembership.mockReturnValue({ data: false, isLoading: false, refetch: vi.fn() });
    mockUseCommunityMutation.mockReturnValue({
      join: { mutateAsync: joinMutate },
      togglePin: { mutateAsync: vi.fn() },
      deleteAnnouncement: { mutateAsync: vi.fn() },
      removeMember: { mutateAsync: vi.fn() },
      transferOwnership: { mutateAsync: vi.fn() },
      createAnnouncement: { mutateAsync: vi.fn() },
    });

    render(<CommunityDetailPage />);

    fireEvent.click(screen.getByRole("button", { name: /join/i }));

    expect(joinMutate).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("Moistello Circle").length).toBeGreaterThan(0);
  });

  it("shows empty states when the community has no announcements or circles yet", () => {
    mockUseCommunity.mockReturnValue({
      data: {
        id: "community-1",
        name: "New Community",
        description: "Freshly created",
        category: "tech",
        tags: [],
        ownerId: "user-1",
        memberCount: 1,
        totalSaved: 0,
        isFeatured: false,
        createdAt: "2026-01-01T00:00:00Z",
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mockUseCommunityMembers.mockReturnValue({ data: [{ userId: "user-1", role: "admin", displayName: "Alice" }], isLoading: false });
    mockUseCommunityAnnouncements.mockReturnValue({ data: [], isLoading: false });
    mockUseCommunityActivity.mockReturnValue({ data: [], isLoading: false });
    mockUseCommunityCircles.mockReturnValue({ data: [], isLoading: false });
    mockUseCommunityMembership.mockReturnValue({ data: true, isLoading: false, refetch: vi.fn() });

    render(<CommunityDetailPage />);

    expect(screen.getByText("No announcements yet.")).toBeInTheDocument();
    expect(screen.getByText(/circles within this community will appear here/i)).toBeInTheDocument();
  });

  it("shows an error state when the community lookup fails", () => {
    mockUseCommunity.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    });
    mockUseCommunityMembers.mockReturnValue({ data: [], isLoading: false });
    mockUseCommunityAnnouncements.mockReturnValue({ data: [], isLoading: false });
    mockUseCommunityActivity.mockReturnValue({ data: [], isLoading: false });
    mockUseCommunityCircles.mockReturnValue({ data: [], isLoading: false });
    mockUseCommunityMembership.mockReturnValue({ data: false, isLoading: false, refetch: vi.fn() });

    render(<CommunityDetailPage />);

    expect(screen.getByText("Unable to load community")).toBeInTheDocument();
  });
});
