import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeContent } from "./home-content";

let storeState = { isAuthenticated: false, isLoading: true, token: null as string | null };

// Stub the auth store: no provider needed, states are scripted per test.
vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: (s: typeof storeState) => unknown) => selector(storeState),
}));

describe("HomeContent host split", () => {
  it("never mounts the marketing tree on the app host while loading", async () => {
    storeState = { isAuthenticated: false, isLoading: true, token: null };
    const { container } = render(<HomeContent isAppHost />);
    // DashboardLayout (ssr:false) renders its blank loading fallback here;
    // the point is the marketing hero shell never mounts.
    await screen.findByLabelText("Loading");
    expect(container.querySelector("a")).toBeNull();
  });

  it("keeps the public shell for loading visitors on apex", async () => {
    storeState = { isAuthenticated: false, isLoading: true, token: null };
    render(<HomeContent isAppHost={false} />);
    // PublicLayout renders nav links even while the hero chunk loads.
    expect(await screen.findAllByRole("link")).not.toHaveLength(0);
    // Dashboard marker never appears on apex.
    expect(screen.queryByTestId("skeleton-table")).toBeNull();
  });
});
