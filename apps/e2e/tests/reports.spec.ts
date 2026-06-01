import { test, expect } from '@playwright/test';
import { ReportsPage } from './pages/ReportsPage';

test.describe('Reports page', () => {
  let reports!: ReportsPage;

  test.beforeEach(async ({ page }) => {
    reports = new ReportsPage(page);
    await reports.goto();
  });

  test('page heading shows "Reports"', async () => {
    await expect(reports.heading()).toBeVisible();
    await expect(reports.heading()).toHaveText('Reports');
  });

  test('Period select is visible', async () => {
    await expect(reports.periodSelect()).toBeVisible();
  });

  test('Reference Date input is visible in preset mode', async () => {
    await expect(reports.dateInput()).toBeVisible();
  });

  test('summary stat cards show correct labels', async () => {
    await expect(reports.statLabel('Total')).toBeVisible();
    await expect(reports.statLabel('Expenses')).toBeVisible();
    await expect(reports.statLabel('Average')).toBeVisible();
  });

  test('by category section heading is correct', async () => {
    await expect(reports.byCategoryHeading()).toBeVisible();
    await expect(reports.byCategoryHeading()).toHaveText('By Category');
  });

  test('date range text is shown', async () => {
    await expect(reports.dateRangeText()).toBeVisible();
  });

  test('changing period updates the date range text', async () => {
    const before = await reports.dateRangeText().textContent();
    await reports.selectPeriod('year');
    const after = await reports.dateRangeText().textContent();
    expect(before).not.toBe(after);
  });

  test('period select options are capitalized', async () => {
    const options = await reports.periodSelect().locator('option').allTextContents();
    for (const opt of options) {
      expect(opt[0]).toBe(opt[0]?.toUpperCase());
    }
  });

  test('Preset Period and Date Range mode buttons are visible', async () => {
    await expect(reports.presetPeriodButton()).toBeVisible();
    await expect(reports.dateRangeButton()).toBeVisible();
  });

  test('switching to Date Range shows From and To inputs', async () => {
    await reports.dateRangeButton().click();
    await expect(reports.customFromInput()).toBeVisible();
    await expect(reports.customToInput()).toBeVisible();
    await expect(reports.periodSelect()).not.toBeVisible();
  });

  test('switching back to Preset Period restores period select', async () => {
    await reports.dateRangeButton().click();
    await reports.presetPeriodButton().click();
    await expect(reports.periodSelect()).toBeVisible();
    await expect(reports.customFromInput()).not.toBeVisible();
  });

  test('compare with previous period checkbox is visible', async () => {
    await expect(reports.compareCheckbox()).toBeVisible();
  });

  test('checking compare shows the Period Comparison heading', async () => {
    await reports.compareCheckbox().check();
    await expect(reports.comparisonHeading()).toBeVisible();
  });

  test('unchecking compare hides the Period Comparison section', async () => {
    await reports.compareCheckbox().check();
    await reports.compareCheckbox().uncheck();
    await expect(reports.comparisonHeading()).not.toBeVisible();
  });

  test('custom date range updates the Showing text', async () => {
    await reports.dateRangeButton().click();
    await reports.customFromInput().fill('2026-01-01');
    await reports.customToInput().fill('2026-01-31');
    await expect(reports.dateRangeText()).toContainText('2026-01-01');
    await expect(reports.dateRangeText()).toContainText('2026-01-31');
  });
});

test.describe('Reports — By Category column sorting', () => {
  let reports!: ReportsPage;

  test.beforeEach(async ({ page }) => {
    reports = new ReportsPage(page);
    await reports.goto();
  });

  test('Category, Count, Total and % headers are sortable', async ({ page }) => {
    if (await reports.byCategoryTable().count() === 0) return;
    for (const col of ['Category', 'Count', 'Total', '%']) {
      await expect(reports.sortableHeader(col)).toBeVisible();
    }
  });

  test('Total header has active sort indicator by default', async ({ page }) => {
    if (await reports.byCategoryTable().count() === 0) return;
    await expect(reports.sortableHeader('Total').locator('.sort-active')).toBeVisible();
  });

  test('clicking Category header activates sort indicator on Category', async ({ page }) => {
    if (await reports.byCategoryTable().count() === 0) return;
    await reports.sortableHeader('Category').click();
    await expect(reports.sortableHeader('Category').locator('.sort-active')).toBeVisible();
    await expect(reports.sortableHeader('Total').locator('.sort-active')).toHaveCount(0);
  });

  test('clicking Total twice toggles sort direction', async ({ page }) => {
    if (await reports.byCategoryTable().count() === 0) return;
    const first = await reports.sortableHeader('Total').locator('.sort-active').textContent();
    await reports.sortableHeader('Total').click();
    const second = await reports.sortableHeader('Total').locator('.sort-active').textContent();
    expect(first).not.toBe(second);
  });
});
