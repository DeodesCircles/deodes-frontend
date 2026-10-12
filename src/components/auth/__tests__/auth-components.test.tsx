import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import React from "react"
import { AuthLayout } from "../auth-layout"
import { AuthStepIndicator } from "../auth-step-indicator"
import { AuthWalletCard } from "../auth-wallet-card"
import { WalletGrid } from "../wallet-grid"
import { ConnectedBadge } from "../connected-badge"
import { ErrorDisplay } from "../error-display"

describe("AuthLayout", () => {
  it("renders title and children correctly", () => {
    render(
      <AuthLayout title="Custom Auth Title">
        <div data-testid="child-content">Child Form</div>
      </AuthLayout>
    )

    expect(screen.getByText("Custom Auth Title")).toBeInTheDocument()
    expect(screen.getByTestId("child-content")).toBeInTheDocument()
  })

  it("renders default title when omitted", () => {
    render(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    )

    expect(screen.getByText("Moistello")).toBeInTheDocument()
  })

  it("renders footer links when provided", () => {
    const links = [
      { label: "Already registered?", href: "/login", text: "Sign In" },
      { label: "Need help?", href: "/support", text: "Support" },
    ]

    render(
      <AuthLayout footerLinks={links}>
        <div>Content</div>
      </AuthLayout>
    )

    expect(screen.getByText("Already registered?")).toBeInTheDocument()
    expect(screen.getByText("Sign In")).toBeInTheDocument()
    expect(screen.getByText("Support")).toBeInTheDocument()
  })
})

describe("AuthStepIndicator", () => {
  const steps = [
    { key: "choose", label: "Select Wallet", number: 1 },
    { key: "profile", label: "Profile", number: 2 },
    { key: "sign", label: "Signature", number: 3 },
  ]

  it("renders all steps with labels and step numbers", () => {
    render(<AuthStepIndicator steps={steps} currentStep="choose" />)

    expect(screen.getByText("Select Wallet")).toBeInTheDocument()
    expect(screen.getByText("Profile")).toBeInTheDocument()
    expect(screen.getByText("Signature")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
  })

  it("marks past steps as completed", () => {
    render(<AuthStepIndicator steps={steps} currentStep="sign" />)

    // First two steps should have completed checkmarks instead of step numbers
    expect(screen.queryByText("1")).toBeNull()
    expect(screen.queryByText("2")).toBeNull()
    expect(screen.getByText("3")).toBeInTheDocument()
  })
})

describe("AuthWalletCard", () => {
  const sampleWallet = {
    id: "freighter",
    name: "Freighter",
    category: "extension",
    icon: <span data-testid="freighter-icon">F</span>,
    description: "Browser extension wallet",
    status: "detected" as const,
    isRecommended: true,
  }

  it("renders wallet name, description, and recommended badge", () => {
    render(<AuthWalletCard wallet={sampleWallet} />)

    expect(screen.getByText("Freighter")).toBeInTheDocument()
    expect(screen.getByText("Browser extension wallet")).toBeInTheDocument()
    expect(screen.getByText("Recommended")).toBeInTheDocument()
    expect(screen.getByTestId("freighter-icon")).toBeInTheDocument()
  })

  it("triggers onSelect callback when clicked", () => {
    const handleSelect = vi.fn()
    render(<AuthWalletCard wallet={sampleWallet} onSelect={handleSelect} />)

    fireEvent.click(screen.getByRole("button"))
    expect(handleSelect).toHaveBeenCalledTimes(1)
  })

  it("is disabled when wallet status is not_detected", () => {
    const notDetectedWallet = {
      ...sampleWallet,
      status: "not_detected" as const,
      isRecommended: false,
    }
    render(<AuthWalletCard wallet={notDetectedWallet} />)

    const button = screen.getByRole("button")
    expect(button).toBeDisabled()
    expect(screen.getByText("Not installed")).toBeInTheDocument()
  })
})

describe("WalletGrid", () => {
  const wallets = [
    {
      id: "freighter",
      name: "Freighter",
      category: "extension",
      icon: <span>F</span>,
      description: "Freighter extension",
      status: "detected" as const,
    },
    {
      id: "rabet",
      name: "Rabet",
      category: "extension",
      icon: <span>R</span>,
      description: "Rabet extension",
      status: "detected" as const,
    },
  ]

  it("renders a grid of wallet cards", () => {
    render(<WalletGrid wallets={wallets} connectingWalletId={null} onSelect={vi.fn()} />)

    expect(screen.getByText("Freighter")).toBeInTheDocument()
    expect(screen.getByText("Rabet")).toBeInTheDocument()
  })

  it("calls onSelect with selected wallet id", () => {
    const handleSelect = vi.fn()
    render(<WalletGrid wallets={wallets} connectingWalletId={null} onSelect={handleSelect} />)

    fireEvent.click(screen.getByText("Freighter"))
    expect(handleSelect).toHaveBeenCalledWith("freighter")
  })
})

describe("ConnectedBadge", () => {
  it("renders wallet name and truncated address", () => {
    render(
      <ConnectedBadge
        walletName="Freighter Wallet"
        address="GAAXEXAMPLEKEY1234567890TESTNETADDRESS"
      />
    )

    expect(screen.getByText("Freighter Wallet")).toBeInTheDocument()
    expect(screen.getByText("GAAXEX...RESS")).toBeInTheDocument()
  })

  it("calls onDisconnect when disconnect button clicked", () => {
    const handleDisconnect = vi.fn()
    render(
      <ConnectedBadge
        walletName="Freighter Wallet"
        address="GAAXEXAMPLEKEY1234567890TESTNETADDRESS"
        onDisconnect={handleDisconnect}
      />
    )

    const disconnectBtn = screen.getByRole("button", { name: /disconnect wallet/i })
    fireEvent.click(disconnectBtn)
    expect(handleDisconnect).toHaveBeenCalledTimes(1)
  })
})

describe("ErrorDisplay", () => {
  it("returns null when no code or message is provided", () => {
    const { container } = render(<ErrorDisplay code={null} message={null} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders mapped error title and custom message", () => {
    render(
      <ErrorDisplay
        code="connection_timeout"
        message="Wallet did not respond in time"
      />
    )

    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(screen.getByText("Connection Timeout")).toBeInTheDocument()
    expect(screen.getByText("Wallet did not respond in time")).toBeInTheDocument()
  })

  it("renders retry button when canRetry is true and onRetry is provided", () => {
    const handleRetry = vi.fn()
    render(
      <ErrorDisplay
        code="auth_server_error"
        message="Failed to contact server"
        canRetry={true}
        onRetry={handleRetry}
      />
    )

    const retryBtn = screen.getByRole("button", { name: /retry/i })
    expect(retryBtn).toBeInTheDocument()
    fireEvent.click(retryBtn)
    expect(handleRetry).toHaveBeenCalledTimes(1)
  })
})
