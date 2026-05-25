import { test, expect } from '@playwright/test';

test.describe('Budgets page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/budgets');
    await expect(page.getByText('Loading…')).toBeHidden({ timeout: 15000 });
  });

  test('page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Budgets' })).toBeVisible();
  });

  test('Add Budget button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /\+ Add Budget/i })).toBeVisible();
  });
});
