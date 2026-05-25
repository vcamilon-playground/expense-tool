import { test, expect } from '@playwright/test';
import { ReportsPage } from './pages/ReportsPage';

test.describe('Reports page', () => {
  let reports!: ReportsPage;

  test.beforeEach(async ({ page }) => {
    reports = new ReportsPage(page);
    await reports.goto();
  });

  test('page heading is visible', async () => {
    await expect(reports.heading()).toBeVisible();
  });

  test('Period select is visible', async () => {
    await expect(reports.periodSelect()).toBeVisible();
  });

  test('Reference Date input is visible', async () => {
    await expect(reports.dateInput()).toBeVisible();
  });

  test('all three export buttons are present', async () => {
    await expect(reports.exportCsvButton()).toBeVisible();
    await expect(reports.exportExcelButton()).toBeVisible();
    await expect(reports.exportPdfButton()).toBeVisible();
  });

  test('summary stat cards are visible', async () => {
    await expect(reports.statLabel('Total')).toBeVisible();
    await expect(reports.statLabel('Expenses')).toBeVisible();
    await expect(reports.statLabel('Average')).toBeVisible();
  });

  test('by category section is visible', async () => {
    await expect(reports.byCategoryHeading()).toBeVisible();
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
});
