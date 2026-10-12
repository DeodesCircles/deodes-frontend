import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WithdrawPage from "./page";

const mockUseWithdrawWizard = vi.fn();

vi.mock("@/hooks/use-withdraw-wizard", () => ({
  useWithdrawWizard: () => mockUseWithdrawWizard(),
}));

describe("WithdrawPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders wallet selection and advances to the next step", () => {
    const setStep = vi.fn();
    mockUseWithdrawWizard.mockReturnValue({
      step: "wallet",
      wallets: [{ id: "usdc-wallet", label: "USDC Wallet", balance: 50, asset: "USDC" }],
      selectedWallet: "usdc-wallet",
      selectWallet: vi.fn(),
      setStep,
      errMsg: "",
      loading: false,
      quote: null,
      amountUsdc: "",
      selectedBank: "",
      accountNumber: "",
      accountName: "",
      asset: "USDC",
      otp: ["", "", "", "", "", ""],
      otpRefs: { current: [] },
      handleGetQuote: vi.fn(),
      handleConfirm: vi.fn(),
      handleVerifyOtp: vi.fn(),
      handleResendOtp: vi.fn(),
      resendCooldown: 0,
      handleOtpChange: vi.fn(),
      handleOtpKeyDown: vi.fn(),
      ngnEstimate: null,
      selectedWalletData: { id: "usdc-wallet", label: "USDC Wallet", balance: 50, asset: "USDC" },
    });

    render(<WithdrawPage />);

    const continueButton = screen.getByRole("button", { name: /continue/i });
    fireEvent.click(continueButton);

    expect(setStep).toHaveBeenCalledWith("amount");
  });

  it("shows the empty-wallet loading state", () => {
    mockUseWithdrawWizard.mockReturnValue({
      step: "wallet",
      wallets: [],
      selectedWallet: "",
      setStep: vi.fn(),
      errMsg: "",
      loading: false,
      quote: null,
      amountUsdc: "",
      selectedBank: "",
      accountNumber: "",
      accountName: "",
      asset: "USDC",
      otp: ["", "", "", "", "", ""],
      otpRefs: { current: [] },
      handleGetQuote: vi.fn(),
      handleConfirm: vi.fn(),
      handleVerifyOtp: vi.fn(),
      handleResendOtp: vi.fn(),
      resendCooldown: 0,
      handleOtpChange: vi.fn(),
      handleOtpKeyDown: vi.fn(),
      ngnEstimate: null,
      selectedWalletData: undefined,
    });

    render(<WithdrawPage />);

    expect(screen.getByText("Loading your wallets…")).toBeInTheDocument();
  });

  it("renders the success state after verification", () => {
    mockUseWithdrawWizard.mockReturnValue({
      step: "success",
      wallets: [{ id: "usdc-wallet", label: "USDC Wallet", balance: 50, asset: "USDC" }],
      selectedWallet: "usdc-wallet",
      setStep: vi.fn(),
      errMsg: "",
      loading: false,
      quote: {
        estimatedNgn: 850000,
        rate: 1450,
        spread: 1.5,
        yellowCardAddress: "GB3",
        withdrawId: "wd-1",
      },
      amountUsdc: "10",
      selectedBank: "GTB",
      accountNumber: "0123456789",
      accountName: "Jane Doe",
      asset: "USDC",
      otp: ["", "", "", "", "", ""],
      otpRefs: { current: [] },
      handleGetQuote: vi.fn(),
      handleConfirm: vi.fn(),
      handleVerifyOtp: vi.fn(),
      handleResendOtp: vi.fn(),
      resendCooldown: 0,
      handleOtpChange: vi.fn(),
      handleOtpKeyDown: vi.fn(),
      ngnEstimate: 1450000,
      selectedWalletData: { id: "usdc-wallet", label: "USDC Wallet", balance: 50, asset: "USDC" },
    });

    render(<WithdrawPage />);

    expect(screen.getAllByText(/withdrawal complete/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₦850,000/i).length).toBeGreaterThan(0);
  });
});
