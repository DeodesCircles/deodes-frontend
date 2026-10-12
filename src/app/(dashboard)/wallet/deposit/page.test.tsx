import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DepositPage from "./page";

const mockAddToast = vi.fn();
const mockPost = vi.fn();
const mockGet = vi.fn();

vi.mock("@/stores/ui-store", () => ({
  useUIStore: (selector: (state: { addToast: typeof mockAddToast }) => unknown) =>
    selector({ addToast: mockAddToast }),
}));

vi.mock("@/lib/api-client", () => ({
  post: (...args: unknown[]) => mockPost(...args),
  get: (...args: unknown[]) => mockGet(...args),
}));

describe("DepositPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddToast.mockReset();
  });

  it("disables the action when the amount is below the minimum deposit", () => {
    render(<DepositPage />);

    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "50" } });

    expect(screen.getByRole("button", { name: /get payment details/i })).toBeDisabled();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("creates payment instructions and shows the bank transfer details on success", async () => {
    mockPost.mockResolvedValue({
      depositId: "dep-123",
      bankName: "Access Bank",
      accountNumber: "0123456789",
      accountName: "Moistello Payments",
      amountNgn: 10000,
      reference: "MOIST-123",
      quote: {
        estimatedUsdc: 6.45,
        rate: 1550,
        spread: 1.3,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    });

    render(<DepositPage />);

    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "10000" } });
    fireEvent.click(screen.getByRole("button", { name: /get payment details/i }));

    expect(await screen.findByText("Transfer to")).toBeInTheDocument();
    expect(screen.getByText("Access Bank")).toBeInTheDocument();
    expect(screen.getByText(/MOIST-123/i)).toBeInTheDocument();
  });

  it("surfaces the backend error when the quote request fails", async () => {
    mockPost.mockRejectedValue(new Error("Service unavailable"));

    render(<DepositPage />);

    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "10000" } });
    fireEvent.click(screen.getByRole("button", { name: /get payment details/i }));

    expect(await screen.findAllByText("Service unavailable")).toHaveLength(2);
  });
});
