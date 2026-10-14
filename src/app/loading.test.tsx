import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

let currentHost: string | null = "deodes.com";

vi.mock("next/headers", () => ({
  headers: () => ({
    get: (name: string) => (name === "host" ? currentHost : null),
  }),
}));

// Import after mock registration.
const Loading = (await import("./loading")).default;

describe("root Loading", () => {
  it("shows the dashboard skeleton on the app host", () => {
    currentHost = "app.deodes.com";
    render(<Loading />);
    // Dashboard-only marker: stat table. Marketing hero has no table.
    expect(screen.getByTestId("skeleton-table")).toBeInTheDocument();
  });

  it("shows the marketing skeleton on the apex host", () => {
    currentHost = "deodes.com";
    const { queryByTestId } = render(<Loading />);
    expect(queryByTestId("skeleton-table")).not.toBeInTheDocument();
    expect(queryByTestId("skeleton-card-grid")).toBeInTheDocument();
  });

  it("falls back to marketing skeleton without a host header", () => {
    currentHost = null;
    const { queryByTestId } = render(<Loading />);
    expect(queryByTestId("skeleton-table")).not.toBeInTheDocument();
    expect(queryByTestId("skeleton-card-grid")).toBeInTheDocument();
  });
});
