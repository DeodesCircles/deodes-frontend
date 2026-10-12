import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useWithdrawWizard } from "@/hooks/use-withdraw-wizard"

vi.mock("@/lib/api-client", () => ({
  get: vi.fn().mockResolvedValue({ data: { usdc: "100", xlm: "50" } }),
  post: vi.fn().mockResolvedValue({ data: {} }),
}))

vi.mock("@/stores/ui-store", () => ({
  useUIStore: vi.fn(() => vi.fn()),
}))

describe("useWithdrawWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("starts on wallet step", () => {
    const { result } = renderHook(() => useWithdrawWizard())
    expect(result.current.step).toBe("wallet")
  })

  it("can navigate to amount step", () => {
    const { result } = renderHook(() => useWithdrawWizard())
    act(() => { result.current.setStep("amount") })
    expect(result.current.step).toBe("amount")
  })

  it("handleOtpChange updates otp array", () => {
    const { result } = renderHook(() => useWithdrawWizard())
    act(() => { result.current.handleOtpChange("512") })
    expect(result.current.otp[0]).toBe("5")
    expect(result.current.otp[2]).toBe("2")
  })

  it("handleOtpChange ignores non-digit input", () => {
    const { result } = renderHook(() => useWithdrawWizard())
    act(() => { result.current.handleOtpChange("") })
    expect(result.current.otp[1]).toBe("")
  })

  it("ngnEstimate is positive when amountUsdc > 0", () => {
    const { result } = renderHook(() => useWithdrawWizard())
    act(() => { result.current.setAmountUsdc("1") })
    expect(result.current.ngnEstimate).toBeGreaterThan(0)
  })

  it("ngnEstimate is null when amountUsdc is empty", () => {
    const { result } = renderHook(() => useWithdrawWizard())
    expect(result.current.ngnEstimate).toBeNull()
  })

  it("selectWallet updates selectedWallet and asset", () => {
    const { result } = renderHook(() => useWithdrawWizard())
    act(() => { result.current.selectWallet("xlm-wallet", "XLM") })
    expect(result.current.selectedWallet).toBe("xlm-wallet")
    expect(result.current.asset).toBe("XLM")
  })

  it("resendCooldown starts at 0", () => {
    const { result } = renderHook(() => useWithdrawWizard())
    expect(result.current.resendCooldown).toBe(0)
  })
})
