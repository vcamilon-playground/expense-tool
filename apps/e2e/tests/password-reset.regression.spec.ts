import { test, expect } from '@playwright/test';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/PasswordResetPage';

test.describe('Password reset — regression', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('forgot-password rejects an invalid email inline', async ({ page }) => {
    const forgot = new ForgotPasswordPage(page);
    await forgot.goto();
    await forgot.request('not-an-email');
    await expect(forgot.fieldError).toBeVisible();
    // Stays on the page — no request sent.
    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(forgot.successBanner).toHaveCount(0);
  });

  test('forgot-password returns a generic success for any valid email (no enumeration)', async ({
    page,
  }) => {
    const forgot = new ForgotPasswordPage(page);
    await forgot.goto();
    // A random, almost-certainly-unregistered address still yields the generic
    // confirmation — the endpoint never reveals whether an account exists.
    await forgot.request(`nobody-${Date.now()}@example.com`);
    await expect(forgot.successBanner).toBeVisible();
    await expect(forgot.successBanner).toContainText(/reset link is on its way/i);
  });

  test('reset-password rejects mismatched passwords inline', async ({ page }) => {
    const reset = new ResetPasswordPage(page);
    await reset.goto('any-token-value');
    await reset.submit('password123', 'password124');
    await expect(reset.fieldError).toBeVisible();
    await expect(reset.fieldError).toContainText(/do not match/i);
  });

  test('reset-password rejects an invalid/expired token', async ({ page }) => {
    const reset = new ResetPasswordPage(page);
    await reset.goto('deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef');
    await reset.submit('newpassword123', 'newpassword123');
    await expect(reset.errorBanner).toBeVisible();
    await expect(reset.errorBanner).toContainText(/invalid or expired/i);
  });
});
