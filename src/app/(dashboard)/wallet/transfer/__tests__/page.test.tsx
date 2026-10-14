import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import WalletTransferPage from "../page"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === "recipient" ? "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" : null),
  }),
}))

vi.mock("@/lib/api-client", () => ({
  post: vi.fn().mockResolvedValue({ txnHash: "tx_mock_123456789" }),
  get: vi.fn().mockResolvedValue({ data: {} }),
}))

describe("WalletTransferPage", () => {
  it("renders transfer page with initial recipient from query params", () => {
    render(<WalletTransferPage />)
    expect(screen.getByTestId("wallet-transfer-page")).toBeDefined()
    const recipientInput = screen.getByTestId("recipient-input") as HTMLInputElement
    expect(recipientInput.value).toBe("0x742d35Cc6634C0532925a3b844Bc454e4438f44e")
  })

  it("validates empty amount and displays alert", () => {
    render(<WalletTransferPage />)
    const reviewBtn = screen.getByTestId("review-transfer-button")
    fireEvent.click(reviewBtn)

    expect(screen.getByRole("alert")).toBeDefined()
    expect(screen.getByText(/Please enter a valid transfer amount/i)).toBeDefined()
  })

  it("advances to confirmation step upon valid inputs", () => {
    render(<WalletTransferPage />)
    const amountInput = screen.getByTestId("amount-input")
    fireEvent.change(amountInput, { target: { value: "50" } })

    const reviewBtn = screen.getByTestId("review-transfer-button")
    fireEvent.click(reviewBtn)

    expect(screen.getByTestId("confirm-transfer-step")).toBeDefined()
    expect(screen.getByText("Confirm Transfer")).toBeDefined()
  })
})
