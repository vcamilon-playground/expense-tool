import { test, expect } from '@playwright/test';

test.describe('Budgets page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/budgets');
    await expect(page.getByText('Loading…')).toBeHidden({ timeout: 15000 });
  });

  test('page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Budgets' })).toBeVisible();
  });

  // Budgets uses an inline form (no modal) — the submit is "Save Budget"
  test('budget form is visible with Save Budget button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Save Budgets' })).toBeVisible();
  });

  test('Monthly Limit input is visible', async ({ page }) => {
    await expect(page.locator('input[type="number"]')).toBeVisible();
  });

  test('Current Budgets section is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2, name: 'Current Budgets' })).toBeVisible();
  });
});
