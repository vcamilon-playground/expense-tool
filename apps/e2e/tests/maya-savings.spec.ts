import { test, expect } from '@playwright/test';
import { MayaSavingsPage } from './pages/MayaSavingsPage';
import { IncomePage } from './pages/IncomePage';
import { maya } from './helpers/supabase';

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
const ALL_WEEKS = Array.from({ length: 51 }, (_, i) => i + 1);

test.describe('Maya Weekly Savings — smoke', () => {
  let maya_!: MayaSavingsPage;

  // A deterministic empty DB state so the date-relative first-visit seed never
  // skews visuals; individual tests that need a different state re-seed the row.
  test.beforeEach(async ({ page }) => {
    maya_ = new MayaSavingsPage(page);
    await maya.set([]);
    await maya_.goto();
  });

  test.afterAll(async () => {
    await maya.reset();
  });

  test('renders heading, descriptive text, and Back to Income link', async () => {
    await expect(maya_.heading()).toBeVisible();
    await expect(maya_.page.getByText(/Every Friday you transfer to Maya/)).toBeVisible();
    await expect(maya_.backLink()).toBeVisible();
  });

  test('shows the four summary cards with the fixed year-end goal', async () => {
    for (const label of ['Total Saved', 'Weeks Completed', 'Year-End Goal', 'Remaining']) {
      await expect(maya_.summaryCard(label)).toBeVisible();
    }
    await expect(maya_.summaryValue('Year-End Goal')).toHaveText(GOAL);
    // "Weeks Completed" is always "N / 51".
    await expect(maya_.summaryValue('Weeks Completed')).toHaveText(/^\d+ \/ 51$/);
  });

  test('renders a progress bar with a percent label', async () => {
    await expect(maya_.page.getByText('Progress to goal')).toBeVisible();
    await expect(maya_.progressPercent()).toHaveText(/^\d{1,3}%$/);
  });

  test('shows the "This Friday" card with an amount, date, and a toggle button', async () => {
    await expect(maya_.thisFridayCard()).toBeVisible();
    await expect(maya_.thisFridayCard()).toContainText(/This Friday · Week \d+/);
    await expect(maya_.thisFridayButton()).toBeVisible();
    await expect(maya_.thisFridayButton()).toHaveText(/Mark ₱[\d,]+\.\d{2} as saved|✓ Saved — Undo/);
  });

  test('renders the weekly schedule table with the five columns and exactly 51 rows', async () => {
    const headers = await maya_.columnHeaders().allTextContents();
    expect(headers.map((h) => h.trim())).toEqual(['Week', 'Friday', 'Transfer', 'Running Total', 'Done']);
    await expect(maya_.rows()).toHaveCount(51);

    // First and last rows carry the deterministic amounts.
    await expect(maya_.rowTransfer(1)).toHaveText('₱100.00');
    await expect(maya_.rowRunningTotal(1)).toHaveText('₱100.00');
    await expect(maya_.rowTransfer(51)).toHaveText('₱5,100.00');
    await expect(maya_.rowRunningTotal(51)).toHaveText(GOAL);

    // The Done checkboxes exist and are unchecked in the empty-state DB seed.
    await expect(maya_.rowCheckbox(1, formatMayaDate(WEEK_1_DATE))).not.toBeChecked();
    await expect(maya_.rowCheckbox(51, formatMayaDate(WEEK_51_DATE))).not.toBeChecked();
  });

  test('the empty-array DB state is honored: nothing saved', async () => {
    await expect(maya_.summaryValue('Total Saved')).toHaveText('₱0.00');
    await expect(maya_.summaryValue('Weeks Completed')).toHaveText('0 / 51');
    await expect(maya_.summaryValue('Remaining')).toHaveText(GOAL);
    await expect(maya_.progressPercent()).toHaveText('0%');
  });

  test('a full 51-week DB state hits the goal at 100%', async () => {
    await maya.set(ALL_WEEKS);
    await maya_.goto();

    await expect(maya_.summaryValue('Total Saved')).toHaveText(GOAL);
    await expect(maya_.summaryValue('Weeks Completed')).toHaveText('51 / 51');
    await expect(maya_.summaryValue('Remaining')).toHaveText('₱0.00');
    await expect(maya_.progressPercent()).toHaveText('100%');
  });

  test('Back to Income link navigates to the Income page', async ({ page }) => {
    await maya_.backLink().click();
    await expect(page).toHaveURL(/\/income$/);
    const income = new IncomePage(page);
    await expect(income.heading()).toHaveText('Income');
  });

  test('the Income page "💜 Maya Savings" button links to the tracker', async ({ page }) => {
    const income = new IncomePage(page);
    await income.goto();
    const link = page.getByRole('link', { name: /Maya Savings/ });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/income\/maya$/);
    await expect(maya_.heading()).toBeVisible();
  });
});

test.describe('Maya Weekly Savings — unauthenticated access', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('deep-linking /income/maya while logged out redirects to /login', async ({ page }) => {
    await page.goto('/income/maya');
    await expect(page).toHaveURL(/\/login$/);
  });
});
