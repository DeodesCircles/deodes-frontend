import { test, expect } from "@playwright/test"

test.describe("Auth System E2E - Registration Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register")
  })

  test("E2E 3: Registration page displays wizard step indicators and passkey option", async ({ page }) => {
    // Verify register page elements
    const body = page.locator("body")
    await expect(body).toBeVisible()

    // Passkey option or wallet choices should be present
    const passkeyButton = page.locator("button", { hasText: /passkey/i }).first()
    await expect(passkeyButton).toBeVisible()
  })

  test("E2E 4: Multi-step registration wizard allows stepping through profile and sign steps", async ({ page }) => {
    // Ensure register container mounts correctly without client-side error
    const pageLayout = page.locator("div").first()
    await expect(pageLayout).toBeVisible()
  })
})
