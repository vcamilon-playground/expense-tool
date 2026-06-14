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
});
