import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WithdrawPage from "./page";

describe("WithdrawPage (coming soon)", () => {
  it("announces cash-out as coming soon", () => {
    render(<WithdrawPage />);
    expect(screen.getByText(/cash-out is on the way/i)).toBeInTheDocument();
  });

  it("lists the upcoming local-currency rails", () => {
    render(<WithdrawPage />);
    expect(screen.getByText("NGN")).toBeInTheDocument();
    expect(screen.getByText("KES")).toBeInTheDocument();
    expect(screen.getByText("GHS")).toBeInTheDocument();
  });

  it("states the payout-only fee model", () => {
    render(<WithdrawPage />);
    expect(screen.getByText(/0\.5% payout fee/i)).toBeInTheDocument();
  });

  it("makes no network calls on render", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      render(<WithdrawPage />);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
