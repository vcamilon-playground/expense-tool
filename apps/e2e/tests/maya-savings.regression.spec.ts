import { test, expect } from '@playwright/test';
import { MayaSavingsPage } from './pages/MayaSavingsPage';

// The Maya tracker is 100% client-side (localStorage only — no DB, no network),
// so there is nothing to seed/clean in Supabase. These "regression" tests drive
// the real stateful behaviour: deterministic summaries from a controlled
// localStorage state, live updates on toggle, and the persisted (sorted, deduped)
// done-week array. localStorage is primed BEFORE load so assertions never depend
// on the run date (the first-visit seed is time-relative).

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

test.describe('Maya Weekly Savings — deterministic state', () => {
  let maya!: MayaSavingsPage;

  test.beforeEach(async ({ page }) => {
    maya = new MayaSavingsPage(page);
  });

  test('a seeded three-week state drives Total Saved, count, and Remaining', async () => {
    await maya.seedDoneWeeks([1, 2, 3]);
    await maya.goto();

    // Weeks 1-3 = ₱100 + ₱200 + ₱300 = ₱600.
    await expect(maya.summaryValue('Total Saved')).toHaveText('₱600.00');
    await expect(maya.summaryValue('Weeks Completed')).toHaveText('3 / 51');
    await expect(maya.summaryValue('Remaining')).toHaveText('₱132,000.00');

    // The three saved rows show the green "Saved" badge; a later row does not.
    await expect(maya.rowSavedBadge(1)).toBeVisible();
    await expect(maya.rowSavedBadge(3)).toBeVisible();
    await expect(maya.rowSavedBadge(10)).toHaveCount(0);
  });

  test('a full 51-week state hits the goal at 100%', async () => {
    await maya.seedDoneWeeks(Array.from({ length: 51 }, (_, i) => i + 1));
    await maya.goto();

    await expect(maya.summaryValue('Total Saved')).toHaveText(GOAL);
    await expect(maya.summaryValue('Weeks Completed')).toHaveText('51 / 51');
    await expect(maya.summaryValue('Remaining')).toHaveText('₱0.00');
    await expect(maya.progressPercent()).toHaveText('100%');
  });

  test('toggling a schedule checkbox updates the summary and localStorage instantly', async () => {
    await maya.seedDoneWeeks([]);
    await maya.goto();

    await expect(maya.summaryValue('Total Saved')).toHaveText('₱0.00');
    await expect(maya.summaryValue('Weeks Completed')).toHaveText('0 / 51');

    // Check week 1 (₱100) — summary updates without a reload.
    const week1 = maya.rowCheckbox(1, formatMayaDate(WEEK_1_DATE));
    await week1.check();
    await expect(maya.summaryValue('Total Saved')).toHaveText('₱100.00');
    await expect(maya.summaryValue('Weeks Completed')).toHaveText('1 / 51');
    await expect(maya.rowSavedBadge(1)).toBeVisible();
    expect(await maya.storedDoneWeeks()).toEqual([1]);

    // Uncheck it again — everything reverts and localStorage empties.
    await week1.uncheck();
    await expect(maya.summaryValue('Total Saved')).toHaveText('₱0.00');
    await expect(maya.summaryValue('Weeks Completed')).toHaveText('0 / 51');
    await expect(maya.rowSavedBadge(1)).toHaveCount(0);
    expect(await maya.storedDoneWeeks()).toEqual([]);
  });

  test('the persisted array stays sorted and deduped across multiple toggles', async () => {
    await maya.seedDoneWeeks([5]);
    await maya.goto();

    // Add weeks out of order; the stored array is always ascending.
    await maya.rowCheckbox(3, formatMayaDate('2026-01-23')).check();
    await maya.rowCheckbox(1, formatMayaDate(WEEK_1_DATE)).check();
    expect(await maya.storedDoneWeeks()).toEqual([1, 3, 5]);

    await expect(maya.summaryValue('Weeks Completed')).toHaveText('3 / 51');
    // ₱100 + ₱300 + ₱500 = ₱900.
    await expect(maya.summaryValue('Total Saved')).toHaveText('₱900.00');
  });

  test('the "This Friday" card button marks and undoes the current week', async () => {
    // Empty state so the current week is definitely un-done at load.
    await maya.seedDoneWeeks([]);
    await maya.goto();

    const button = maya.thisFridayButton();
    await expect(button).toHaveText(/Mark ₱[\d,]+\.\d{2} as saved/);

    const savedBefore = await maya.summaryValue('Weeks Completed').textContent();
    const countBefore = Number(savedBefore?.split('/')[0]?.trim());

    // Mark the current week done — button flips to the Undo state, count +1.
    await button.click();
    await expect(button).toHaveText('✓ Saved — Undo');
    await expect(maya.summaryValue('Weeks Completed')).toHaveText(`${countBefore + 1} / 51`);

    // Undo — button reverts, count back to baseline.
    await button.click();
    await expect(button).toHaveText(/Mark ₱[\d,]+\.\d{2} as saved/);
    await expect(maya.summaryValue('Weeks Completed')).toHaveText(`${countBefore} / 51`);
  });

  test('schedule math is correct for the first and last rows', async () => {
    await maya.seedDoneWeeks([]);
    await maya.goto();

    await expect(maya.rowTransfer(1)).toHaveText('₱100.00');
    await expect(maya.rowRunningTotal(1)).toHaveText('₱100.00');
    await expect(maya.rowTransfer(51)).toHaveText('₱5,100.00');
    await expect(maya.rowRunningTotal(51)).toHaveText(GOAL);
  });
});
