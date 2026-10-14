import { test, expect } from '@playwright/test'
import { createApiMocker } from '../helpers/api-mocks'

test.describe('User Registration Flow', () => {
  test('should show validation error for short password', async ({ page }: { page: any }) => {
    await page.goto('/register')

    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'short')

    const createButton = page.getByRole('button', { name: /create account/i })
    await expect(createButton).toBeDisabled()
 })

  test('should show validation error for invalid email', async ({ page }: { page: any }) => {
    await page.goto('/register')

    await page.fill('input[type="email"]', 'invalid-email')
    await page.fill('input[type="password"]', 'TestPassword123')

    const createButton = page.getByRole('button', { name: /create account/i })
    await expect(createButton).toBeDisabled()
  })

  test('should allow resending OTP code', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    await mocker.mockRegistration()

    await page.goto('/register')

    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'TestPassword123')
    
    const createButton = page.getByRole('button', { name: /create account/i })
    await createButton.click()

    // Wait for cooldown to expire
    await page.waitForTimeout(61000)

    const resendButton = page.getByRole('button', { name: /resend code/i })
    await expect(resendButton).toBeEnabled()
    await resendButton.click()
  })

  test('should navigate back to email step from OTP', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    await mocker.mockRegistration()

    await page.goto('/register')

    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'TestPassword123')
    
    const createButton = page.getByRole('button', { name: /create account/i })
    await createButton.click()

    await expect(page.getByText(/6-digit verification code/i)).toBeVisible()

    const backButton = page.getByRole('button', { name: /change email/i })
    await backButton.click()

    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toHaveValue('test@example.com')
  })
})
