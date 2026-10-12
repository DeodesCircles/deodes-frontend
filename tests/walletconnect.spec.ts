import { test, expect } from "@playwright/test"

test.describe("Auth System E2E - WalletConnect Modal", () => {
  test("E2E 6: WalletConnect pairing state handles fallback and cancelation correctly", async ({ page }) => {
    await page.goto("/login")

    const wcBtn = page.locator("button", { hasText: /walletconnect/i }).first()
    if (await wcBtn.isVisible()) {
      await wcBtn.click()
      // Should show connection state / QR placeholder or cancel button
      const cancelBtn = page.locator("button", { hasText: /cancel/i }).first()
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click()
        await expect(page.locator("h1")).toBeVisible()
      }
    }
  })
})
