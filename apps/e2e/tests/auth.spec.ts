import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test.describe('Login page', () => {
  // These tests run without the saved session so we can test the login UI
  test.use({ storageState: { cookies: [], origins: [] } });

  test('redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('login page heading is visible', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await expect(login.heading()).toBeVisible();
  });

  test('username and password inputs are present', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await expect(login.usernameInput).toBeVisible();
    await expect(login.passwordInput).toBeVisible();
  });

  test('sign in button is present', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await expect(login.submitButton).toBeVisible();
  });

  test('link to register page is present', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
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

  test('register page heading is visible', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
  });

  test('all required fields are present', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('textbox', { name: /first name/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /last name/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /username/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('create account button is present', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('link to login page is present', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });
});

test.describe('Auth — authenticated access', () => {
  test('dashboard is accessible when logged in', async ({ page }) => {
    await page.goto('/');
    await expect(page).not.toHaveURL('/login');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});
