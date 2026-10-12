import { test, expect } from '@playwright/test'
import { createApiMocker } from '../helpers/api-mocks'

test.describe('User Registration Flow', () => {
  test('should complete full registration flow with mocked API', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)

    // Mock all registration-related API calls
    await mocker.mockRegistration()
    await mocker.mockWalletCreation()
    await mocker.mockPasskeyLink()
    await mocker.mockSession()

    // Navigate to registration page
    await page.goto('/register')

    // Step 1: Email and password
    await expect(page.locator('h1, h2')).toContainText('Create Account')
    
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'TestPassword123')
    
    const createButton = page.getByRole('button', { name: /create account/i })
    await createButton.click()

    // Step 2: OTP verification
    await expect(page.getByText(/6-digit verification code/i)).toBeVisible()
    await page.fill('input[placeholder*="000000"]', '123456')
    
    const verifyButton = page.getByRole('button', { name: /verify & continue/i })
    await verifyButton.click()

    // Step 3: Profile setup
    await expect(page.getByText(/display name/i)).toBeVisible()
    
    // Display name should be pre-filled from claim-name mock
    const displayNameInput = page.getByLabel(/display name/i)
    await expect(displayNameInput).toHaveValue('Test User')
    
    const continueButton = page.getByRole('button', { name: /continue/i })
    await continueButton.click()

    // Step 4: Verify email (skip for E2E)
    await expect(page.getByText(/verify your email/i)).toBeVisible()
    const verifyEmailButton = page.getByRole('button', { name: /verified/i })
    await verifyEmailButton.click()

    // Step 5: Wallet creation
    await expect(page.getByText(/create your stellar wallet/i)).toBeVisible()
    
    const createWalletButton = page.getByRole('button', { name: /create stellar wallet/i })
    await createWalletButton.click()

    // Wait for wallet creation to complete
    await expect(page.getByText(/stellar public key/i)).toBeVisible()
    await expect(page.getByText(/funded/i)).toBeVisible()
    
    const walletContinueButton = page.getByRole('button', { name: /continue/i })
    await walletContinueButton.click()

    // Step 6: Passkey setup (skip)
    await expect(page.getByText(/faster login with passkey/i)).toBeVisible()
    
    const skipButton = page.getByRole('button', { name: /skip/i })
    await skipButton.click()

    // Step 7: Completion
    await expect(page.getByText(/all set!/i)).toBeVisible()
    await expect(page.getByText(/redirecting to your dashboard/i)).toBeVisible()

    // Should redirect to home/dashboard
    await page.waitForURL('/', { timeout: 5000 })
  })

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
