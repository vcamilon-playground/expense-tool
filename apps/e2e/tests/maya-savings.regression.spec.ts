import { test, expect } from '@playwright/test';
import { MayaSavingsPage } from './pages/MayaSavingsPage';
import { maya } from './helpers/supabase';

// The Maya tracker persists its done-set in the Supabase `maya_savings` table
// (one row per user, done_weeks int[]). These regression tests drive the real
// stateful behaviour against the DB: deterministic summaries from a controlled
// row, live UI updates on toggle that write the row back (sorted/deduped),
// first-visit seeding when no row exists, and the save/load error paths. The row
// is seeded to a KNOWN state BEFORE load so assertions never depend on the run
// date (the first-visit seed is time-relative), and reset between tests.

function formatMayaDate(iso: string): string {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Recompute the first-visit seed the same way the app does (every Friday whose
// local ISO date is strictly before today), so the seed test is tolerant of the
// run date rather than hardcoding "25 weeks".
function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function expectedSeedWeeks(): number[] {
  const todayISO = toISODate(new Date());
  const weeks: number[] = [];
  const cursor = new Date(2026, 0, 9); // first Friday, Jan 9 2026
  let week = 1;
  while (cursor.getFullYear() <= 2026) {
    if (toISODate(cursor) < todayISO) weeks.push(week);
    cursor.setDate(cursor.getDate() + 7);
    week += 1;
  }
  return weeks;
}

const GOAL = '₱132,600.00';
const WEEK_1_DATE = '2026-01-09';

test.describe('Maya Weekly Savings — DB-backed state', () => {
  let maya_!: MayaSavingsPage;

  test.beforeEach(async ({ page }) => {
    maya_ = new MayaSavingsPage(page);
  });

  test.afterEach(async () => {
    await maya.reset();
  });

  test('a DB-seeded three-week state drives Total Saved, count, and Remaining', async () => {
    await maya.set([1, 2, 3]);
    await maya_.goto();

    // Weeks 1-3 = ₱100 + ₱200 + ₱300 = ₱600.
    await expect(maya_.summaryValue('Total Saved')).toHaveText('₱600.00');
    await expect(maya_.summaryValue('Weeks Completed')).toHaveText('3 / 51');
    await expect(maya_.summaryValue('Remaining')).toHaveText('₱132,000.00');

    // The three saved rows show the green "Saved" badge; a later row does not.
    await expect(maya_.rowSavedBadge(1)).toBeVisible();
    await expect(maya_.rowSavedBadge(3)).toBeVisible();
    await expect(maya_.rowSavedBadge(10)).toHaveCount(0);
  });

  test('the empty-array DB state is honored: 0 saved', async () => {
    await maya.set([]);
    await maya_.goto();

    await expect(maya_.summaryValue('Total Saved')).toHaveText('₱0.00');
    await expect(maya_.summaryValue('Weeks Completed')).toHaveText('0 / 51');
    await expect(maya_.summaryValue('Remaining')).toHaveText(GOAL);
    expect(await maya.get()).toEqual([]);
  });

  test('toggling a schedule checkbox updates the summary and writes the DB row', async () => {
    await maya.set([]);
    await maya_.goto();

    await expect(maya_.summaryValue('Total Saved')).toHaveText('₱0.00');

    // Check week 1 (₱100) — summary updates without a reload.
    const week1 = maya_.rowCheckbox(1, formatMayaDate(WEEK_1_DATE));
    await week1.check();
    await expect(maya_.summaryValue('Total Saved')).toHaveText('₱100.00');
    await expect(maya_.summaryValue('Weeks Completed')).toHaveText('1 / 51');
    await expect(maya_.rowSavedBadge(1)).toBeVisible();
    // The DB row was written (serialized save chain) — poll until it lands.
    await expect.poll(async () => maya.get()).toEqual([1]);

    // Uncheck it again — everything reverts and the DB empties.
    await week1.uncheck();
    await expect(maya_.summaryValue('Total Saved')).toHaveText('₱0.00');
    await expect(maya_.rowSavedBadge(1)).toHaveCount(0);
    await expect.poll(async () => maya.get()).toEqual([]);
  });

  test('the persisted array stays sorted and deduped across multiple toggles', async () => {
    await maya.set([5]);
    await maya_.goto();

    // Add weeks out of order; the stored array is always ascending & deduped.
    await maya_.rowCheckbox(3, formatMayaDate('2026-01-23')).check();
    await maya_.rowCheckbox(1, formatMayaDate(WEEK_1_DATE)).check();

    await expect(maya_.summaryValue('Weeks Completed')).toHaveText('3 / 51');
    // ₱100 + ₱300 + ₱500 = ₱900.
    await expect(maya_.summaryValue('Total Saved')).toHaveText('₱900.00');
    await expect.poll(async () => maya.get()).toEqual([1, 3, 5]);
  });

  test('the "This Friday" card button marks and undoes the current week and persists', async () => {
    // Empty state so the current week is definitely un-done at load.
    await maya.set([]);
    await maya_.goto();

    const button = maya_.thisFridayButton();
    await expect(button).toHaveText(/Mark ₱[\d,]+\.\d{2} as saved/);

    const savedBefore = await maya_.summaryValue('Weeks Completed').textContent();
    const countBefore = Number(savedBefore?.split('/')[0]?.trim());

    // Mark the current week done — button flips, count +1, DB gets one row.
    await button.click();
    await expect(button).toHaveText('✓ Saved — Undo');
    await expect(maya_.summaryValue('Weeks Completed')).toHaveText(`${countBefore + 1} / 51`);
    await expect.poll(async () => (await maya.get())?.length).toBe(countBefore + 1);

    // Undo — button reverts, count back to baseline, DB back to empty.
    await button.click();
    await expect(button).toHaveText(/Mark ₱[\d,]+\.\d{2} as saved/);
    await expect(maya_.summaryValue('Weeks Completed')).toHaveText(`${countBefore} / 51`);
    await expect.poll(async () => (await maya.get())?.length).toBe(countBefore);
  });

  test('first visit (no row) seeds every past Friday and creates exactly one row', async () => {
    // Remove the row so the page takes the first-visit seed path.
    await maya.reset();
    expect(await maya.get()).toBeNull();

    await maya_.goto();
    await expect(maya_.heading()).toBeVisible();
    await expect(maya_.rows()).toHaveCount(51);

    // The seeded set is every Friday strictly before today — compute it in the
    // test so the assertion is tolerant of the run date.
    const seed = expectedSeedWeeks();
    await expect.poll(async () => maya.get()).toEqual(seed);

    // Exactly one row was created (idempotent ensure — no duplicates).
    const rows = await maya.rows();
    expect(rows).toHaveLength(1);

    // The summary reflects the seeded set: N of 51 weeks completed.
    await expect(maya_.summaryValue('Weeks Completed')).toHaveText(`${seed.length} / 51`);
  });
});

test.describe('Maya Weekly Savings — error paths', () => {
  let maya_!: MayaSavingsPage;

  test.beforeEach(async ({ page }) => {
    maya_ = new MayaSavingsPage(page);
  });

  test.afterEach(async () => {
    await maya.reset();
  });

  test('a save failure shows the .field-error banner and resyncs the UI to the DB', async ({ page }) => {
    await maya.set([]);
    await maya_.goto();
    await expect(maya_.summaryValue('Weeks Completed')).toHaveText('0 / 51');

    // Fail only the persist (PATCH) call; reads still succeed so the resync works.
    await page.route('**/rest/v1/maya_savings**', (route) => {
      if (route.request().method() === 'PATCH') return route.fulfill({ status: 500, body: '{}' });
      return route.fallback();
    });

    // Optimistic UI check, then the save fails.
    await maya_.rowCheckbox(1, formatMayaDate(WEEK_1_DATE)).check();
    await expect(maya_.saveError()).toHaveText(/Failed to save — check your connection and try again\./);

    // The DB was never updated…
    expect(await maya.get()).toEqual([]);
    // …and the UI resyncs back to the empty DB state (week 1 no longer saved).
    await expect(maya_.rowSavedBadge(1)).toHaveCount(0);
    await expect(maya_.summaryValue('Weeks Completed')).toHaveText('0 / 51');
  });

  test('a load failure shows the banner-only view with no table', async ({ page }) => {
    await maya.set([1, 2, 3]);

    // Fail every maya_savings read so ensureMayaSavings throws on load.
    await page.route('**/rest/v1/maya_savings**', (route) => {
      if (route.request().method() === 'GET') return route.abort();
      return route.fallback();
    });

    await maya_.goto();

    await expect(maya_.heading()).toBeVisible();
    await expect(maya_.backLink()).toBeVisible();
    await expect(maya_.loadErrorBanner()).toBeVisible();
    // The banner paragraph is themed as an error (var(--bad)), not muted grey.
    const color = await maya_.loadErrorBanner().evaluate((el) => window.getComputedStyle(el).color);
    expect(color).not.toBe('rgb(0, 0, 0)');
    // No schedule table / summary cards are rendered in the error view.
    await expect(maya_.scheduleTable()).toHaveCount(0);
    await expect(maya_.summaryCard('Total Saved')).toHaveCount(0);
  });
});
