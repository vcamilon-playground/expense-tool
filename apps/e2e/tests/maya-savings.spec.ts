import { test, expect } from '@playwright/test';
import { MayaSavingsPage } from './pages/MayaSavingsPage';
import { IncomePage } from './pages/IncomePage';

// Format a Friday ISO date the same way the page does (formatMayaDate in
// apps/web/src/lib/maya-savings.ts), so date-based locators/assertions match the
// app's locale/timezone rendering exactly rather than hardcoding a string.
function formatMayaDate(iso: string): string {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const GOAL = '₱132,600.00';
const WEEK_1_DATE = '2026-01-09';
const WEEK_51_DATE = '2026-12-25';

test.describe('Maya Weekly Savings — smoke', () => {
  let maya!: MayaSavingsPage;

  test.beforeEach(async ({ page }) => {
    maya = new MayaSavingsPage(page);
    // Deterministic empty state so the date-relative seed never skews visuals.
    await maya.seedDoneWeeks([]);
    await maya.goto();
  });

  test('renders heading, descriptive text, and Back to Income link', async () => {
    await expect(maya.heading()).toBeVisible();
    await expect(maya.page.getByText(/Every Friday you transfer to Maya/)).toBeVisible();
    await expect(maya.backLink()).toBeVisible();
  });

  test('shows the four summary cards with the fixed year-end goal', async () => {
    for (const label of ['Total Saved', 'Weeks Completed', 'Year-End Goal', 'Remaining']) {
      await expect(maya.summaryCard(label)).toBeVisible();
    }
    await expect(maya.summaryValue('Year-End Goal')).toHaveText(GOAL);
    // "Weeks Completed" is always "N / 51".
    await expect(maya.summaryValue('Weeks Completed')).toHaveText(/^\d+ \/ 51$/);
  });

  test('renders a progress bar with a percent label', async () => {
    await expect(maya.page.getByText('Progress to goal')).toBeVisible();
    await expect(maya.progressPercent()).toHaveText(/^\d{1,3}%$/);
  });

  test('shows the "This Friday" card with an amount, date, and a toggle button', async () => {
    await expect(maya.thisFridayCard()).toBeVisible();
    await expect(maya.thisFridayCard()).toContainText(/This Friday · Week \d+/);
    await expect(maya.thisFridayButton()).toBeVisible();
    await expect(maya.thisFridayButton()).toHaveText(/Mark ₱[\d,]+\.\d{2} as saved|✓ Saved — Undo/);
  });

  test('renders the weekly schedule table with the five columns and exactly 51 rows', async () => {
    const headers = await maya.columnHeaders().allTextContents();
    expect(headers.map((h) => h.trim())).toEqual(['Week', 'Friday', 'Transfer', 'Running Total', 'Done']);
    await expect(maya.rows()).toHaveCount(51);

    // First and last rows carry the deterministic amounts.
    await expect(maya.rowTransfer(1)).toHaveText('₱100.00');
    await expect(maya.rowRunningTotal(1)).toHaveText('₱100.00');
    await expect(maya.rowTransfer(51)).toHaveText('₱5,100.00');
    await expect(maya.rowRunningTotal(51)).toHaveText(GOAL);

    // The Done checkboxes exist and are unchecked in the empty-state seed.
    await expect(maya.rowCheckbox(1, formatMayaDate(WEEK_1_DATE))).not.toBeChecked();
    await expect(maya.rowCheckbox(51, formatMayaDate(WEEK_51_DATE))).not.toBeChecked();
  });

  test('the empty-array seed is honored: nothing saved', async () => {
    await expect(maya.summaryValue('Total Saved')).toHaveText('₱0.00');
    await expect(maya.summaryValue('Weeks Completed')).toHaveText('0 / 51');
    await expect(maya.summaryValue('Remaining')).toHaveText(GOAL);
    await expect(maya.progressPercent()).toHaveText('0%');
  });

  test('Back to Income link navigates to the Income page', async ({ page }) => {
    await maya.backLink().click();
    await expect(page).toHaveURL(/\/income$/);
    const income = new IncomePage(page);
    await expect(income.heading()).toHaveText('Income');
  });

  test('the Income page links to the Maya tracker', async ({ page }) => {
    const income = new IncomePage(page);
    await income.goto();
    const link = page.getByRole('link', { name: /Transfer to Maya Savings/ });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/income\/maya$/);
    await expect(maya.heading()).toBeVisible();
  });
});

test.describe('Maya Weekly Savings — negative / resilience', () => {
  let maya!: MayaSavingsPage;

  test.beforeEach(async ({ page }) => {
    maya = new MayaSavingsPage(page);
  });

  test('a non-JSON localStorage value does not crash the page (re-seeds)', async () => {
    await maya.seedDoneWeeks('not-json{');
    await maya.goto();
    await expect(maya.heading()).toBeVisible();
    await expect(maya.rows()).toHaveCount(51);
    await expect(maya.summaryValue('Year-End Goal')).toHaveText(GOAL);
  });

  test('a non-array JSON localStorage value does not crash the page (re-seeds)', async () => {
    await maya.seedDoneWeeks('{"foo":1}');
    await maya.goto();
    await expect(maya.heading()).toBeVisible();
    await expect(maya.rows()).toHaveCount(51);
    // A valid array is written back after re-seeding.
    const stored = await maya.storedDoneWeeks();
    expect(Array.isArray(stored)).toBe(true);
  });
});

test.describe('Maya Weekly Savings — unauthenticated access', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('deep-linking /income/maya while logged out redirects to /login', async ({ page }) => {
    await page.goto('/income/maya');
    await expect(page).toHaveURL(/\/login$/);
  });
});
