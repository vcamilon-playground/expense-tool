import { test, expect } from '@playwright/test';

test.describe('Reports page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByText('Loading…')).toBeHidden({ timeout: 15000 });
  });

  test('page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Reports' })).toBeVisible();
  });

  test('Period select is visible', async ({ page }) => {
    // The label wraps a <div> + <select> — use filter to avoid getByLabel implicit-label issues
    await expect(
      page.locator('label').filter({ hasText: 'Period' }).locator('select'),
    ).toBeVisible();
  });

  test('Reference Date input is visible', async ({ page }) => {
    await expect(page.locator('input[type="date"]')).toBeVisible();
  });

  test('all three export buttons are present', async ({ page }) => {
    await expect(page.getByTitle('Export as CSV')).toBeVisible();
    await expect(page.getByTitle('Export as Excel')).toBeVisible();
    await expect(page.getByTitle('Export as PDF')).toBeVisible();
  });

  test('summary stat cards are visible', async ({ page }) => {
    // Use locator().first() to avoid strict-mode issues with repeated words
    await expect(page.locator('.stat .label').filter({ hasText: 'Total' })).toBeVisible();
    await expect(page.locator('.stat .label').filter({ hasText: 'Expenses' })).toBeVisible();
    await expect(page.locator('.stat .label').filter({ hasText: 'Average' })).toBeVisible();
  });

  test('by category section is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2, name: 'By Category' })).toBeVisible();
  });

  test('date range text is shown', async ({ page }) => {
    await expect(page.getByText(/Showing/)).toBeVisible();
  });

  test('changing period updates the date range text', async ({ page }) => {
    const periodSelect = page.locator('label').filter({ hasText: 'Period' }).locator('select');
    const rangeText = page.getByText(/Showing/);

    const before = await rangeText.textContent();
    await periodSelect.selectOption('year');
    const after = await rangeText.textContent();

    expect(before).not.toBe(after);
  });

  test('period select options are capitalized', async ({ page }) => {
    const periodSelect = page.locator('label').filter({ hasText: 'Period' }).locator('select');
    const options = await periodSelect.locator('option').allTextContents();
    for (const opt of options) {
      expect(opt[0]).toBe(opt[0]?.toUpperCase());
    }
  });
});
