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
    await expect(page.getByLabel('Period')).toBeVisible();
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
    await expect(page.getByText('Total')).toBeVisible();
    await expect(page.getByText('Expenses')).toBeVisible();
    await expect(page.getByText('Average')).toBeVisible();
  });

  test('by category section is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2, name: 'By Category' })).toBeVisible();
  });

  test('changing period updates the date range text', async ({ page }) => {
    const rangeText = page.getByText(/Showing .* →/);
    await expect(rangeText).toBeVisible();

    const before = await rangeText.textContent();
    await page.locator('select').selectOption('year');
    const after = await rangeText.textContent();

    // Range should have changed (year range is wider than month)
    expect(before).not.toBe(after);
  });

  test('period select has capitalized options', async ({ page }) => {
    const options = await page.locator('select option').allTextContents();
    for (const opt of options) {
      expect(opt[0]).toBe(opt[0]?.toUpperCase());
    }
  });
});
