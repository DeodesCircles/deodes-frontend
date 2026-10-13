import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { WalletConnectDeepLink } from "../walletconnect-deeplink"

describe("WalletConnectDeepLink", () => {
  const defaultProps = {
    uri: null,
    pairingState: "idle",
    error: null,
    onRetry: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // WalletConnectQR draws to a real canvas on mount; jsdom has no 2d
    // context, so mock it (same shape as the QR suite's mock).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(HTMLCanvasElement.prototype as any).getContext = () => ({
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      fillText: vi.fn(),
      measureText: () => ({ width: 0 }),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      translate: vi.fn(),
      setTransform: vi.fn(),
      createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
      getImageData: (x: number, y: number, w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: vi.fn(),
      createLinearGradient: () => ({ addColorStop: vi.fn() }),
      createPattern: () => null,
    })
  })

  describe("loading state", () => {
    it("renders spinner when uri is null", () => {
      render(<WalletConnectDeepLink {...defaultProps} />)
      expect(screen.getByText("Preparing connection...")).toBeDefined()
    })

    it("shows loading message in all idle states with no uri", () => {
      render(<WalletConnectDeepLink {...defaultProps} pairingState="pairing" />)
      expect(screen.getByText("Preparing connection...")).toBeDefined()
    })
  })

  describe("mobile detection", () => {
    it("shows wallet app button on mobile", () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Android 13; Mobile) AppleWebKit/537.36",
        configurable: true,
      })

      render(
        <WalletConnectDeepLink
          {...defaultProps}
          uri="wc:abc123@2"
          pairingState="pairing"
        />,
      )
      expect(screen.getByText("Open Wallet App")).toBeDefined()
    })

    it("shows EVM install links on mobile", () => {      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
        configurable: true,
      })

      render(
        <WalletConnectDeepLink
          {...defaultProps}
          uri="wc:abc123@2"
          pairingState="pairing"
        />,
      )
      expect(screen.getByText("Install MetaMask")).toBeDefined()
      expect(screen.getByText("Install Rabby")).toBeDefined()
      expect(screen.getByText("Install Coinbase Wallet")).toBeDefined()
    })
  })

  describe("desktop state", () => {
    it("shows connect button on desktop", () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        configurable: true,
      })

      render(
        <WalletConnectDeepLink
          {...defaultProps}
          uri="wc:abc123@2"
          pairingState="pairing"
        />,
      )
      expect(screen.getByText("Open WalletConnect")).toBeDefined()
    })

    it("shows copy link section", () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        configurable: true,
      })

      render(
        <WalletConnectDeepLink
          {...defaultProps}
          uri="wc:abc123@2"
          pairingState="pairing"
        />,
      )
      expect(screen.getByText("Or copy the link:")).toBeDefined()
    })
  })

  describe("approved state", () => {
    it("shows success message", () => {
      render(
        <WalletConnectDeepLink
          {...defaultProps}
          pairingState="approved"
        />,
      )
      expect(screen.getByText("Connected!")).toBeDefined()
      expect(screen.getByText(/Wallet linked successfully/)).toBeDefined()
    })
  })

  describe("rejected state", () => {
    it("shows cancellation message", () => {
      render(
        <WalletConnectDeepLink
          {...defaultProps}
          pairingState="rejected"
        />,
      )
      expect(screen.getByText("Connection Cancelled")).toBeDefined()
    })

    it("shows retry button", () => {
      render(
        <WalletConnectDeepLink
          {...defaultProps}
          pairingState="rejected"
        />,
      )
      const retryBtn = screen.getByText("Try Again")
      expect(retryBtn).toBeDefined()
      fireEvent.click(retryBtn)
      expect(defaultProps.onRetry).toHaveBeenCalled()
    })
  })

  describe("error state", () => {
    it("shows error message", () => {
      render(
        <WalletConnectDeepLink
          {...defaultProps}
          pairingState="error"
          error="Connection failed"
        />,
      )
      expect(screen.getByText("Connection Error")).toBeDefined()
      expect(screen.getByText("Connection failed")).toBeDefined()
    })

    it("shows retry button on error", () => {
      render(
        <WalletConnectDeepLink
          {...defaultProps}
          pairingState="error"
          error="Something broke"
        />,
      )
      fireEvent.click(screen.getByText("Try Again"))
      expect(defaultProps.onRetry).toHaveBeenCalled()
    })
  })

  describe("copy functionality", () => {
    it("copies URI to clipboard", async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      })

      render(
        <WalletConnectDeepLink
          {...defaultProps}
          uri="wc:abc123@2"
          pairingState="pairing"
        />,
      )

      const copyBtn = screen.getByLabelText("Copy connection link")
      expect(copyBtn).toBeDefined()
      fireEvent.click(copyBtn)
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith("wc:abc123@2")
      })
    })

    it("shows copied confirmation", async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      })

      render(
        <WalletConnectDeepLink
          {...defaultProps}
          uri="wc:abc123@2"
          pairingState="pairing"
        />,
      )

      fireEvent.click(screen.getByLabelText("Copy connection link"))
      await waitFor(() => {
        expect(document.querySelector(".text-emerald-400")).toBeDefined()
      })
    })
  })

  describe("error boundary states", () => {
    it("handles null uri without crashing", () => {
      render(<WalletConnectDeepLink {...defaultProps} />)
      expect(screen.getByText("Preparing connection...")).toBeDefined()
    })

    it("handles rejected without uri", () => {
      render(
        <WalletConnectDeepLink
          {...defaultProps}
          pairingState="rejected"
        />,
      )
      expect(screen.getByText("Connection Cancelled")).toBeDefined()
    })

    it("handles approved without uri", () => {
      render(
        <WalletConnectDeepLink
          {...defaultProps}
          pairingState="approved"
        />,
      )
      expect(screen.getByText("Connected!")).toBeDefined()
    })
  })

  describe("mobile QR option", () => {
    const mobileProps = {
      uri: "wc:abc123@2",
      pairingState: "pairing",
      error: null,
      onRetry: vi.fn(),
    }

    beforeEach(() => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Android 13; Mobile) AppleWebKit/537.36",
        configurable: true,
      })
    })

    it("offers a QR toggle alongside Open Wallet App", () => {
      render(<WalletConnectDeepLink {...mobileProps} />)
      expect(screen.getByText("Open Wallet App")).toBeDefined()
      expect(
        screen.getByRole("button", { name: "Show QR code instead" }),
      ).toBeDefined()
    })

    it("swaps to the QR view and back", async () => {
      render(<WalletConnectDeepLink {...mobileProps} />)
      fireEvent.click(screen.getByRole("button", { name: "Show QR code instead" }))
      expect(
        await screen.findByRole("img", { name: "QR code for wallet connection" }),
      ).toBeDefined()
      expect(screen.queryByText("Open Wallet App")).toBeNull()
      fireEvent.click(
        screen.getByRole("button", { name: /back to open wallet app/i }),
      )
      expect(screen.getByText("Open Wallet App")).toBeDefined()
    })
  })
})
