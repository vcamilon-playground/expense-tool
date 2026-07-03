import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';

test.describe('Login page', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('login page renders all required elements', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await expect(login.heading()).toBeVisible();
    await expect(login.usernameInput).toBeVisible();
    await expect(login.passwordInput).toBeVisible();
    await expect(login.submitButton).toBeVisible();
    await expect(login.registerLink()).toBeVisible();
  });

  test('invalid credentials show an error', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login('nonexistent_user_xyz', 'wrongpassword');
    await expect(login.errorBanner).toBeVisible();
  });
});

test.describe('Register page', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('register page renders all required elements', async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();
    await expect(register.heading()).toBeVisible();
    await expect(register.firstNameInput()).toBeVisible();
    await expect(register.lastNameInput()).toBeVisible();
    await expect(register.usernameInput()).toBeVisible();
    await expect(register.createAccountButton()).toBeVisible();
    await expect(register.signInLink()).toBeVisible();
  });
});

test.describe('Auth — authenticated access', () => {
  test('dashboard is accessible when logged in', async ({ page }) => {
    await page.goto('/');
    await expect(page).not.toHaveURL('/login');
    // The Home page has no <h1>; the header greeting confirms an authenticated session.
    await expect(new DashboardPage(page).greeting()).toBeVisible();
  });
});
