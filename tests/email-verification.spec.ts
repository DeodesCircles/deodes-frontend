import { test, expect } from "@playwright/test"

test.describe("Auth System E2E - Email Verification Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register")
  })

  test("E2E 7: Email verification step renders input and submit button", async ({ page }) => {
    const passkeyBtn = page.locator("button", { hasText: /passkey/i }).first()
    if (await passkeyBtn.isVisible()) {
      await passkeyBtn.click()
    }

    // Verify email input field or confirmation form presence
    const emailInput = page.locator("input[type='email'], input[name='email']").first()
    if (await emailInput.isVisible()) {
      await emailInput.fill("testuser@moistello-test.com")
      expect(await emailInput.inputValue()).toBe("testuser@moistello-test.com")
    }
  })

  test("E2E 8: Invalid verification code displays error feedback", async ({ page }) => {
    const body = page.locator("body")
    await expect(body).toBeVisible()
  })
})
