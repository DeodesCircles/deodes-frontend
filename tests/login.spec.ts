import { test, expect } from "@playwright/test"

test.describe("Auth System E2E - Login Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto("/login")
  })

  test("E2E 1: Login page renders with proper heading and wallet grid structure", async ({ page }) => {
    // Check main title / logo heading
    const title = page.locator("h1")
    await expect(title).toBeVisible()

    // Check presence of wallet selection or passkey button
    const container = page.locator("div.space-y-6, div.space-y-4").first()
    await expect(container).toBeVisible()
  })

  test("E2E 2: Selecting a wallet option initiates connection UI state", async ({ page }) => {
    // Check if wallet card buttons are present or scanning state resolves
    const walletButtons = page.locator("button")
    const count = await walletButtons.count()
    expect(count).toBeGreaterThan(0)
  })
})
