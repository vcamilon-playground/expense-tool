import { test, expect, type Download } from '@playwright/test';
import { ReportsPage } from './pages/ReportsPage';

/**
 * Coverage for the "Export Report" card on /reports (CSV / Excel / PDF).
 * Read-only feature — no DB writes, so no data cleanup beyond the existing
 * expense fixture the report renders.
 */
test.describe('Reports — Export Report', () => {
  let reports!: ReportsPage;

  test.beforeEach(async ({ page }) => {
    reports = new ReportsPage(page);
    await reports.goto();
  });

  test('card, heading, description and three format buttons are visible', async () => {
    await expect(reports.exportCard()).toBeVisible();
    await expect(reports.exportHeading()).toHaveText('Export Report');
    await expect(reports.exportDescription()).toContainText('Summary, category breakdown, and expense list for');
    await expect.soft(reports.csvExportButton()).toBeVisible();
    await expect.soft(reports.excelExportButton()).toBeVisible();
    await expect.soft(reports.pdfExportButton()).toBeVisible();
  });

  // FUNC-1 — each button downloads its format with the scoped filename.
  test('CSV button downloads expense-report-<from>-<to>.csv', async ({ page }) => {
    const { from, to } = await reports.exportScopeRange();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      reports.csvExportButton().click(),
    ]);
    expect(download.suggestedFilename(), 'CSV download filename mismatch').toBe(
      `expense-report-${from}-${to}.csv`,
    );
  });

  test('Excel button downloads expense-report-<from>-<to>.xlsx', async ({ page }) => {
    const { from, to } = await reports.exportScopeRange();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      reports.excelExportButton().click(),
    ]);
    expect(download.suggestedFilename(), 'Excel download filename mismatch').toBe(
      `expense-report-${from}-${to}.xlsx`,
    );
  });

  test('PDF button downloads expense-report-<from>-<to>.pdf', async ({ page }) => {
    const { from, to } = await reports.exportScopeRange();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      reports.pdfExportButton().click(),
    ]);
    expect(download.suggestedFilename(), 'PDF download filename mismatch').toBe(
      `expense-report-${from}-${to}.pdf`,
    );
  });

  // FUNC-2 — failed export shows the inline banner and re-enables the buttons.
  test('failed Excel export shows an inline error banner and re-enables buttons', async ({ page }) => {
    // Break the dynamically-imported xlsx chunk so exportExcel() rejects.
    await page.route(/xlsx/, (route) => route.abort());

    await reports.excelExportButton().click();

    await expect(reports.exportErrorBanner(), 'export error banner not shown').toBeVisible();
    await expect(reports.exportErrorBanner()).not.toBeEmpty();
    // Buttons must return to their idle, enabled state after the failure.
    await expect(reports.csvExportButton()).toBeEnabled();
    await expect(reports.excelExportButton()).toBeEnabled();
    await expect(reports.pdfExportButton()).toBeEnabled();
    await expect(reports.exportingButton()).toHaveCount(0);
  });

  // FUNC-3 — the filename follows the currently-shown report scope.
  test('changing the preset period changes the download filename dates', async ({ page }) => {
    await reports.expandOptions();
    const monthScope = await reports.exportScopeRange();

    await reports.selectPeriod('year');
    const yearScope = await reports.exportScopeRange();
    expect(yearScope, 'year scope should differ from month scope').not.toEqual(monthScope);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      reports.csvExportButton().click(),
    ]);
    expect(download.suggestedFilename()).toBe(
      `expense-report-${yearScope.from}-${yearScope.to}.csv`,
    );
  });

  test('switching to a custom Date Range scopes the download filename', async ({ page }) => {
    await reports.expandOptions();
    await reports.dateRangeButton().click();
    await reports.customFromInput().fill('2026-01-01');
    await reports.customToInput().fill('2026-01-31');

    await expect(reports.exportDescription()).toContainText('2026-01-01 → 2026-01-31');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      reports.csvExportButton().click(),
    ]);
    expect(download.suggestedFilename()).toBe('expense-report-2026-01-01-2026-01-31.csv');
  });

  // EDGE-1 — a zero-expense range still exports a correctly-named file, no error.
  test('zero-expense custom range still downloads without an error banner', async ({ page }) => {
    await reports.expandOptions();
    await reports.dateRangeButton().click();
    await reports.customFromInput().fill('2000-01-01');
    await reports.customToInput().fill('2000-01-31');
    await expect(reports.exportDescription()).toContainText('2000-01-01 → 2000-01-31');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      reports.csvExportButton().click(),
    ]);
    expect(download.suggestedFilename()).toBe('expense-report-2000-01-01-2000-01-31.csv');
    await expect(reports.exportErrorBanner()).toHaveCount(0);
  });

  // EDGE-2 — in-progress state disables all buttons; a second click yields one download.
  test('exporting disables all buttons and a double-click yields exactly one download', async ({ page }) => {
    // Slow the xlsx chunk so the in-flight "Exporting…" state is observable,
    // then let it complete so exactly one file downloads.
    await page.route(/xlsx/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });

    const downloads: Download[] = [];
    page.on('download', (d) => downloads.push(d));

    await reports.excelExportButton().click();

    // While exporting: the active button shows "Exporting…" and all three are disabled.
    await expect(reports.exportingButton()).toBeVisible();
    await expect(reports.csvExportButton()).toBeDisabled();
    await expect(reports.pdfExportButton()).toBeDisabled();
    await expect(reports.exportingButton()).toBeDisabled();

    // Second click while disabled must not trigger a second export.
    await reports.exportingButton().click({ force: true, timeout: 2000 }).catch(() => {});

    const download = await page.waitForEvent('download');
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);

    // Bounded wait to prove no second download fires (proving a negative — §4).
    await page.waitForTimeout(500);
    expect(downloads, 'a disabled second click must not start a second export').toHaveLength(1);
  });

  // EXP-2 — reload and Back/Forward leave the card interactive with no stale state.
  test('re-export after reload works and uses the current scope', async ({ page }) => {
    await page.reload();
    await expect(reports.exportCard()).toBeVisible();

    const { from, to } = await reports.exportScopeRange();
    await expect(reports.csvExportButton()).toBeEnabled();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      reports.csvExportButton().click(),
    ]);
    expect(download.suggestedFilename()).toBe(`expense-report-${from}-${to}.csv`);
  });

  test('Back/Forward navigation leaves the export card interactive with no stale Exporting state', async ({ page }) => {
    await page.goto('/expenses');
    await page.goBack();
    await expect(reports.exportCard()).toBeVisible();

    await expect(reports.exportingButton()).toHaveCount(0);
    await expect(reports.csvExportButton()).toHaveText('⬇ CSV');
    await expect(reports.csvExportButton()).toBeEnabled();
    await expect(reports.excelExportButton()).toBeEnabled();
    await expect(reports.pdfExportButton()).toBeEnabled();

    // Forward returns to /expenses; back again keeps the card usable.
    await page.goForward();
    await page.goBack();
    await expect(reports.exportCard()).toBeVisible();
    await expect(reports.csvExportButton()).toBeEnabled();
  });
});

// EXP-1 — the card and its buttons are visible/usable on a 375px mobile viewport,
// independent of the collapsed Report Options panel.
test.describe('Reports — Export Report (mobile 375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  let reports!: ReportsPage;

  test.beforeEach(async ({ page }) => {
    reports = new ReportsPage(page);
    await reports.goto();
  });

  test('export card and all three buttons are visible while Report Options is collapsed', async () => {
    // Report Options is collapsed by default — the export card is independent of it.
    await expect(reports.periodSelect()).not.toBeVisible();

    await expect(reports.exportCard()).toBeVisible();
    await expect.soft(reports.csvExportButton()).toBeVisible();
    await expect.soft(reports.excelExportButton()).toBeVisible();
    await expect.soft(reports.pdfExportButton()).toBeVisible();
  });

  test('CSV export works on mobile with the scoped filename', async ({ page }) => {
    const { from, to } = await reports.exportScopeRange();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      reports.csvExportButton().click(),
    ]);
    expect(download.suggestedFilename()).toBe(`expense-report-${from}-${to}.csv`);
  });
});
