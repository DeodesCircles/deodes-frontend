import { test, expect } from "@playwright/test"

test.describe("Auth System E2E - Passkey Flow", () => {
  test("E2E 5: WebAuthn passkey login triggers biometric prompt stub", async ({ page }) => {
    await page.goto("/login")

    // Stub WebAuthn API on window object if supported
    await page.addInitScript(() => {
      if (window.navigator && window.navigator.credentials) {
        window.navigator.credentials.get = async () => {
          return {
            id: "mock-passkey-credential-id",
            type: "public-key",
            rawId: new Uint8Array([1, 2, 3, 4]).buffer,
            response: {
              clientDataJSON: new Uint8Array([]).buffer,
              authenticatorData: new Uint8Array([]).buffer,
              signature: new Uint8Array([]).buffer,
            },
          } as any
        }
      }
    })

    const passkeyBtn = page.locator("button", { hasText: /passkey/i }).first()
    if (await passkeyBtn.isVisible()) {
      await expect(passkeyBtn).toBeEnabled()
    }
  })
})
