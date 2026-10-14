import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AutoDebitCard } from "./auto-debit-card";

const pauseMutate = vi.fn();
const resumeMutate = vi.fn();
const cancelMutate = vi.fn();

vi.mock("@/hooks/use-subscriptions", () => ({
  useMySubscriptions: () => ({
    data: {
      data: {
        subscriptions: [
          {
            id: "s-1",
            userId: "u-1",
            circleId: "c-1",
            amount: "100.0000000",
            capTotal: "1000.0000000",
            collectedTotal: "200.0000000",
            status: "active",
            nextDebitAt: new Date(Date.now() + 86400000).toISOString(),
            lastRound: 2,
          },
        ],
      },
    },
    isLoading: false,
  }),
  usePauseSubscription: () => ({ mutate: pauseMutate, isPending: false }),
  useResumeSubscription: () => ({ mutate: resumeMutate, isPending: false }),
  useCancelSubscription: () => ({ mutate: cancelMutate, isPending: false }),
}));

const props = {
  circleId: "c-1",
  contributionAmount: 100,
  currency: "USDC",
  frequency: "weekly" as const,
};

describe("AutoDebitCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows status, next debit, and cap progress", () => {
    render(<AutoDebitCard {...props} />);
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText(/200 \/ 1000 USDC/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "20");
  });

  it("pauses and cancels through the mutations", () => {
    render(<AutoDebitCard {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /pause/i }));
    expect(pauseMutate).toHaveBeenCalledWith("c-1");
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(cancelMutate).toHaveBeenCalledWith("c-1");
  });
});
