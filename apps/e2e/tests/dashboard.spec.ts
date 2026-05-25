import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Loading…')).toBeHidden({ timeout: 15000 });
  });

  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/Expense Tool/i);
  });

  test('h1 heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
  });

  test('four KPI stat cards are visible', async ({ page }) => {
    // Today, This Week, This Month, This Year
    await expect(page.locator('.stat')).toHaveCount(4);
    await expect(page.locator('.stat .label').filter({ hasText: 'Today' })).toBeVisible();
    await expect(page.locator('.stat .label').filter({ hasText: 'This Month' })).toBeVisible();
  });

  test('budget status section is present', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2, name: 'Budget Status' })).toBeVisible();
  });

  test('category chart section is present', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2, name: 'This Month by Category' })).toBeVisible();
  });

  test('6-month trend chart section is present', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2, name: '6-Month Trend' })).toBeVisible();
  });
});
