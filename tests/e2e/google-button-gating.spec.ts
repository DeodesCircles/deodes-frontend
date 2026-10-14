import { test, expect } from '@playwright/test'

// Phase 2.3: the Google button must vanish when the backend reports
// google_enabled:false (no GOOGLE_CLIENT_ID → the endpoint 503s), and render
// otherwise. The backend is route-mocked, so no live API is needed.
test.describe('Google button backend gating', () => {
  async function mockBackendConfig(page: any, googleEnabled: boolean) {
    await page.route('**/v1/config', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            google_enabled: googleEnabled,
            arc: { chain_id: 5042002, circle_address: '', treasury_address: '', usdc_configured: false },
            fiat: { provider: 'mock' },
          },
        }),
      })
    })
  }

  test('hides the Google button when the backend disables Google', async ({ page }: { page: any }) => {
    await mockBackendConfig(page, false)
    await page.goto('/login')
    await expect(page.getByTestId('google-button')).toHaveCount(0)
  })

  test('shows the Google button when the backend enables Google', async ({ page }: { page: any }) => {
    await mockBackendConfig(page, true)
    await page.goto('/login')
    await expect(page.getByTestId('google-button')).toBeVisible()
    await expect(page.getByTestId('google-button')).toContainText(/continue with google/i)
  })
})
