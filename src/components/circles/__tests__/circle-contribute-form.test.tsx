import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CircleContributeForm } from "../circle-contribute-form";

const ADDR = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
const HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

const mockSignMessage = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock("@/hooks/use-multi-wallet", () => ({
  useMultiWallet: () => ({ address: ADDR, signMessage: mockSignMessage }),
}));

vi.mock("@/hooks/use-circles", () => ({
  useContribute: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

function renderForm(props: Partial<React.ComponentProps<typeof CircleContributeForm>> = {}) {
  return render(
    <CircleContributeForm
      circleId="circle-1"
      circleName="Savers"
      contributionAmount={100}
      currency="USDC"
      roundNumber={2}
      onSuccess={vi.fn()}
      onCancel={vi.fn()}
      {...props}
    />,
  );
}

describe("CircleContributeForm (Arc USDC)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignMessage.mockResolvedValue("0xsig");
    mockMutateAsync.mockResolvedValue({ id: "c-1" });
  });

  it("rejects non-USDC currency without touching the wallet", async () => {
    const user = userEvent.setup();
    renderForm({ currency: "XLM" });
    await user.click(screen.getByRole("button", { name: /Confirm & Sign/ }));
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByRole("alert").textContent).toMatch(/Only USDC on Arc/i);
    expect(mockSignMessage).not.toHaveBeenCalled();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("requires an Arc transaction hash when no treasury auto-pay is configured", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: /Confirm & Sign/ }));
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByRole("alert").textContent).toMatch(/Transaction hash is required/i);
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("signs the intent then submits amount/round/txnHash", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderForm({ onSuccess });
    await user.type(screen.getByLabelText(/Arc transaction hash/i), HASH);
    await user.click(screen.getByRole("button", { name: /Confirm & Sign/ }));
    await waitFor(() => expect(mockSignMessage).toHaveBeenCalledTimes(1));
    expect(mockSignMessage.mock.calls[0][0]).toContain("circle-1");
    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({ amount: 100, roundNumber: 2, txnHash: HASH }),
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("surfaces wallet signature rejection", async () => {
    const user = userEvent.setup();
    mockSignMessage.mockRejectedValueOnce(new Error("Signature rejected."));
    renderForm();
    await user.type(screen.getByLabelText(/Arc transaction hash/i), HASH);
    await user.click(screen.getByRole("button", { name: /Confirm & Sign/ }));
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByRole("alert").textContent).toMatch(/Signature rejected/i);
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});
