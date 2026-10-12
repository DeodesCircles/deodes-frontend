import { expect, test } from "@playwright/test"

import { buildMockFixtures, createMockCalls, installMockApi, seedAuthCookie } from "./helpers/mock-app"

test.describe("Moistello core journeys", () => {
  test("registers a new account and finishes wallet setup", async ({ page }) => {
    const fixtures = buildMockFixtures()
    const calls = createMockCalls()
    await installMockApi(page, fixtures, calls)

    await page.goto("/register")

    await page.getByLabel("Email address").fill("new.member@example.com")
    await page.getByLabel("Password").fill("supersecret1")
    await page.getByRole("button", { name: "Create Account" }).click()

    await expect(page.getByText("Code sent to")).toBeVisible()
    await page.getByLabel("6-digit verification code").fill(fixtures.verificationCode ?? "123456")
    await page.getByRole("button", { name: "Verify & Continue" }).click()

    await expect(page.getByText(fixtures.user.displayName ?? "Amina Okafor")).toBeVisible()
    await page.getByRole("button", { name: "Continue" }).click()

    await expect(page.getByText("Verify Your Email")).toBeVisible()
    await page.getByLabel("Email address").fill("new.member@example.com")
    await page.getByRole("button", { name: "Send Code" }).click()
    await expect(page.getByLabel("6-digit verification code")).toBeVisible()
    await page.getByLabel("6-digit verification code").fill(fixtures.verificationCode ?? "123456")
    await page.getByRole("button", { name: "Verify Code" }).click()

    await expect(page.getByText("Create your Stellar wallet")).toBeVisible()
    await page.getByRole("button", { name: "Create Stellar Wallet" }).click()
    await expect(page.getByText("Stellar public key")).toBeVisible()
    await page.getByRole("button", { name: "Continue" }).click()

    await expect(page.getByText("Faster Login with Passkey")).toBeVisible()
    await page.getByRole("button", { name: /skip/i }).click()

    await expect(page).toHaveURL("/")
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
    await expect(page.getByText("Welcome to your dashboard.")).toBeVisible()

    expect(calls.registerRequests).toHaveLength(1)
    expect(calls.verificationSends).toHaveLength(1)
    expect(calls.verificationChecks.length).toBeGreaterThanOrEqual(2)
    expect(calls.profileUpdates).toHaveLength(1)
    expect(calls.walletCreations).toHaveLength(1)
  })

  test("signs in with password and reaches the dashboard", async ({ page }) => {
    const fixtures = buildMockFixtures()
    const calls = createMockCalls()
    await installMockApi(page, fixtures, calls)

    await page.goto("/login")
    await page.getByRole("button", { name: "Password" }).click()
    await page.getByLabel("Email").fill("amina@example.com")
    await page.getByLabel("Password").fill("supersecret1")
    await page.getByRole("button", { name: "Sign In" }).click()

    await expect(page).toHaveURL("/")
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
    await expect(page.getByText("No upcoming savings goals")).toBeVisible()

    expect(calls.authLogins).toHaveLength(1)
  })

  test("opens the WalletConnect chooser from the login screen", async ({ page }) => {
    const fixtures = buildMockFixtures()
    const calls = createMockCalls()
    await installMockApi(page, fixtures, calls)

    await page.goto("/login")
    await expect(page.getByRole("button", { name: "Connect Wallet" })).toBeVisible()
    await page.getByRole("button", { name: "Connect Wallet" }).click()

    await expect(page.getByRole("button", { name: /WalletConnect/ })).toBeVisible()
    await expect(page.getByText("Lobstr, Coinbase Wallet, Trust Wallet, MetaMask")).toBeVisible()
  })

  test("creates a new circle and lands on its detail page", async ({ page, context }) => {
    const fixtures = buildMockFixtures()
    const calls = createMockCalls()
    await seedAuthCookie(context, fixtures.token)
    await installMockApi(page, fixtures, calls)

    await page.goto("/circles/create")
    await page.getByLabel("Circle Name").fill("Neighborhood Savings Circle")
    await page.getByLabel("Description (optional)").fill("A monthly circle for neighbors.")
    await page.getByLabel("Max Members").fill("5")
    await page.getByRole("button", { name: "Next" }).click()

    await page.getByLabel("Contribution Amount").fill("250")
    await page.getByRole("button", { name: "Fixed Order" }).click()
    await page.getByRole("button", { name: "Next" }).click()

    await expect(page.getByText("Review Your Circle")).toBeVisible()
    await page.getByRole("button", { name: "Create Circle" }).click()

    await expect(page).toHaveURL(`/circles/${fixtures.createdCircle.id}`)
    await expect(page.getByRole("heading", { name: fixtures.createdCircle.name })).toBeVisible()
    await expect(page.getByRole("button", { name: `Contribute $${fixtures.createdCircle.contributionAmount.toFixed(2)}` })).toBeVisible()

    expect(calls.circleCreates).toHaveLength(1)
    expect(calls.circleCreates[0]).toMatchObject({
      name: "Neighborhood Savings Circle",
      contributionAmount: 250,
      payoutType: "fixed",
    })
  })

  test("submits a contribution from the circle detail page", async ({ page, context }) => {
    const fixtures = buildMockFixtures()
    const calls = createMockCalls()
    await seedAuthCookie(context, fixtures.token)
    await installMockApi(page, fixtures, calls)

    await page.goto(`/circles/${fixtures.createdCircle.id}`)
    await expect(page.getByRole("button", { name: `Contribute $${fixtures.createdCircle.contributionAmount.toFixed(2)}` })).toBeVisible()
    await page.getByRole("button", { name: `Contribute $${fixtures.createdCircle.contributionAmount.toFixed(2)}` }).click()

    await expect(page.getByText("Confirm Contribution")).toBeVisible()
    await page.getByRole("button", { name: "Confirm & Sign" }).click()

    await expect(page.getByText("Confirm Contribution")).toBeHidden()
    expect(calls.contributionPosts).toHaveLength(1)
    expect(calls.contributionPosts[0]).toMatchObject({
      amount: fixtures.createdCircle.contributionAmount,
    })
  })

  test("shows received payouts on the payouts page", async ({ page, context }) => {
    const fixtures = buildMockFixtures()
    const calls = createMockCalls()
    await seedAuthCookie(context, fixtures.token)
    await installMockApi(page, fixtures, calls)

    await page.goto("/payouts")

    await expect(page.getByRole("heading", { name: "Payouts Received" })).toBeVisible()
    await expect(page.getByText(fixtures.createdCircle.name)).toBeVisible()
    await expect(page.getByText(`+$${fixtures.payouts[0].amount.toFixed(2)}`)).toBeVisible()
    await expect(page.locator('a[href*="stellar.expert/explorer/testnet/tx/"]')).toBeVisible()
  })
})
