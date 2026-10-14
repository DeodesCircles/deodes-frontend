import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AutoDebitPage from "./page";

const { resumeMutate } = vi.hoisted(() => ({ resumeMutate: vi.fn() }));

vi.mock("@/hooks/use-subscriptions", () => ({
  useMySubscriptions: () => ({
    data: {
      data: {
        subscriptions: [
          {
            id: "s-1",
            userId: "u-1",
            circleId: "c-9",
            amount: "50.0000000",
            capTotal: "500.0000000",
            collectedTotal: "0",
            status: "paused",
            nextDebitAt: new Date(Date.now() + 86400000).toISOString(),
            lastRound: 0,
          },
        ],
      },
    },
    isLoading: false,
    isError: false,
  }),
  usePauseSubscription: () => ({ mutate: vi.fn(), isPending: false }),
  useResumeSubscription: () => ({ mutate: resumeMutate, isPending: false }),
  useCancelSubscription: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe("AutoDebitPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists subscriptions ordered with status and resume action", () => {
    render(<AutoDebitPage />);
    expect(screen.getByText(/50\.0+ USDC/)).toBeInTheDocument();
    expect(screen.getByText(/Status: paused/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /resume/i }));
    expect(resumeMutate).toHaveBeenCalledWith("c-9");
  });
});
