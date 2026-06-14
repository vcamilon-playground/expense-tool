import { test, expect } from '@playwright/test';
import { NavBar } from './pages/NavBar';

test.describe('Site header', () => {
  let nav!: NavBar;

  test.beforeEach(async ({ page }) => {
    nav = new NavBar(page);
    await page.goto('/');
    await expect(page.locator('nav.sidenav')).toBeVisible();
  });

  test('shows a time-based greeting with the user first name', async () => {
    await expect(nav.greeting()).toBeVisible();
    await expect(nav.greeting()).toContainText(/Good (Morning|Afternoon|Evening),/);
    await expect(nav.greeting()).toContainText('E2E');
  });

  test('shows the personalized today date line in yyyy/mm/dd, DDD format', async () => {
    await expect(nav.dateLine()).toBeVisible();
    await expect(nav.dateLine()).toHaveText(
      /^Today is \d{4}\/\d{2}\/\d{2}, (Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/,
    );
  });

  test('theme pill toggles the data-theme attribute', async ({ page }) => {
    await expect(nav.themePill()).toBeVisible();
    await expect(nav.themePillButton('light')).toBeVisible();
    await expect(nav.themePillButton('dark')).toBeVisible();

    await nav.themePillButton('dark').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Reset to light so the preference does not leak into other tests.
    await nav.themePillButton('light').click();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
  });

  test('notification bell links to the notifications page', async ({ page }) => {
    await expect(nav.notifBell()).toBeVisible();
    await nav.notifBell().click();
    await expect(page).toHaveURL(/\/notifications/);
  });
});

test.describe('Site header — unauthenticated', () => {
  test('hides the header date line on the login page', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/login');
    const nav = new NavBar(page);
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(nav.dateLine()).toHaveCount(0);
  });
});
