import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DepositPage from "./page";

describe("DepositPage (coming soon)", () => {
  it("announces fiat deposits as coming soon", () => {
    render(<DepositPage />);
    expect(screen.getAllByText(/coming soon/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/made simple/i)).toBeInTheDocument();
  });

  it("lists the upcoming local-currency rails", () => {
    render(<DepositPage />);
    expect(screen.getByText("NGN")).toBeInTheDocument();
    expect(screen.getByText("KES")).toBeInTheDocument();
    expect(screen.getByText("GHS")).toBeInTheDocument();
  });

  it("states Deodes charges nothing on deposits", () => {
    render(<DepositPage />);
    expect(screen.getByText(/charges nothing on deposits/i)).toBeInTheDocument();
  });

  it("makes no network calls on render", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      render(<DepositPage />);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("renders two long buttons: live Circle rail + coming-soon local rail", () => {
    render(<DepositPage />);
    // Local/bank button is always present but disabled (coming soon).
    expect(screen.getByRole("button", { name: /local bank transfer, coming soon/i })).toBeInTheDocument();
  });

  it("hides the Circle card rail when disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_ONRAMP_ENABLED", "false");
    try {
      render(<DepositPage />);
      expect(screen.queryByRole("button", { name: /buy usdc with card via circle/i })).not.toBeInTheDocument();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("offers the Circle rail with a testnet badge when enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_ONRAMP_ENABLED", "true");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ env: "sandbox", configured: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    try {
      render(<DepositPage />);
      fireEvent.click(screen.getByRole("button", { name: /buy usdc with card via circle/i }));
      expect(await screen.findByText(/testnet · play money/i)).toBeInTheDocument();
    } finally {
      fetchSpy.mockRestore();
      vi.unstubAllEnvs();
    }
  });
});
