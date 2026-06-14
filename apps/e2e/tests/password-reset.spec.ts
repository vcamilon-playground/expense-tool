import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/PasswordResetPage';

test.describe('Password reset — smoke', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login page links to the forgot-password page', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await expect(login.forgotPasswordLink()).toBeVisible();
    await login.forgotPasswordLink().click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test('register page offers an optional email field', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
  });

  test('forgot-password page renders its form', async ({ page }) => {
    const forgot = new ForgotPasswordPage(page);
    await forgot.goto();
    await expect(forgot.heading()).toBeVisible();
    await expect(forgot.emailInput).toBeVisible();
    await expect(forgot.submitButton).toBeVisible();
    await expect(forgot.backToSignInLink()).toBeVisible();
  });

  test('reset-password page rejects a missing token', async ({ page }) => {
    const reset = new ResetPasswordPage(page);
    await reset.goto();
    await expect(reset.errorBanner).toBeVisible();
    await expect(reset.errorBanner).toContainText(/invalid or incomplete/i);
  });

  test('forgot/reset pages render without the app chrome at desktop + mobile widths', async ({
    page,
  }) => {
    // The .app-layout wrapper carries the NavBar (desktop sidebar + mobile
    // bottom-nav) + header + footer; auth pages must not show it while logged
    // out, at any viewport.
    for (const size of [
      { width: 1280, height: 800 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(size);
      await page.goto('/forgot-password');
      await expect(page.locator('.app-layout')).toHaveCount(0);
      await page.goto('/reset-password?token=x');
      await expect(page.locator('.app-layout')).toHaveCount(0);
    }
  });
});
