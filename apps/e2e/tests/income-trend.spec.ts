import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages/DashboardPage';
import { cleanup, income, incomeSnapshots, seed } from './helpers/supabase';
import { completedWeekSundays, currentWeekSunday, weekLabel } from './helpers/income-trend-dates';


// Seed N completed-week snapshots (oldest → newest) with distinct totals, so the
// chart has a deterministic, run-date-independent set of points to render.
async function seedCompletedWeeks(count: number): Promise<string[]> {
  const weeks = completedWeekSundays(count);
  await Promise.all(weeks.map((wk, i) => seed.incomeSnapshot(wk, 1000 + i * 100)));
  return weeks;
}

test.describe('Weekly Income Trend — empty state', () => {
  let dashboard!: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    // No completed-week snapshots — loading the dashboard only upserts the
    // in-progress current-week row, which the chart deliberately excludes.
    await cleanup.incomeSnapshots();
    await dashboard.goto();
  });

  test.afterAll(async () => {
    await cleanup.incomeSnapshots();
  });

  test('card heading is visible', async () => {
    await expect(dashboard.incomeTrendSection()).toHaveText('Weekly Income Trend — Past 6 Weeks');
  });

  test('shows the empty-state message when no completed weeks exist', async () => {
    await expect(dashboard.incomeTrendEmptyState()).toBeVisible();
  });

  test('renders no chart in the empty state', async () => {
    await expect(dashboard.incomeTrendChart()).toHaveCount(0);
    await expect(dashboard.incomeTrendDots()).toHaveCount(0);
  });
});

test.describe('Weekly Income Trend — populated card', () => {
  let dashboard!: DashboardPage;

  test.beforeAll(async () => {
    await cleanup.incomeSnapshots();
    await seedCompletedWeeks(1);
  });

  test.afterAll(async () => {
    await cleanup.incomeSnapshots();
  });

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
  });

  test('renders the chart and hides the empty state', async () => {
    await expect(dashboard.incomeTrendChart()).toBeVisible();
    await expect(dashboard.incomeTrendEmptyState()).toHaveCount(0);
  });

  test('renders one dot per completed week', async () => {
    await expect(dashboard.incomeTrendDots()).toHaveCount(1);
  });
});

test.describe('Weekly Income Trend — capping, ordering, current-week exclusion', () => {
  let dashboard!: DashboardPage;
  const SEEDED = 8;

  test.beforeAll(async () => {
    await cleanup.incomeSnapshots();
    await seedCompletedWeeks(SEEDED);
  });

  test.afterAll(async () => {
    await cleanup.incomeSnapshots();
  });

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
  });

  test('caps the chart at the 6 most recent completed weeks', async () => {
    // 8 completed weeks seeded (+ the auto-captured current week) → only 6 dots.
    await expect(dashboard.incomeTrendDots()).toHaveCount(6);
  });

  test('labels are oldest-first and exclude the in-progress week', async () => {
    const shown = completedWeekSundays(6).map(weekLabel);
    const currentLabel = weekLabel(currentWeekSunday());

    // Rendered left-to-right; the six most-recent completed weeks, oldest first.
    await expect(dashboard.incomeTrendXAxisTicks()).toHaveText(shown);

    const tickTexts = await dashboard.incomeTrendXAxisTicks().allTextContents();
    // The in-progress week is captured but never charted.
    expect(tickTexts, 'current in-progress week must not be charted').not.toContain(currentLabel);
    // The two weeks beyond the 6-week cap are dropped.
    const dropped = completedWeekSundays(SEEDED).slice(0, SEEDED - 6).map(weekLabel);
    for (const label of dropped) {
      expect(tickTexts, `week beyond the cap should be dropped: ${label}`).not.toContain(label);
    }
  });
});

test.describe('Weekly Income Trend — current-week capture', () => {
  let dashboard!: DashboardPage;
  let expectedGrandTotal = 0;
  const currentWeek = currentWeekSunday();

  test.beforeAll(async () => {
    await cleanup.incomeSnapshots();
    await cleanup.incomeSources();
    // A known bank + e-wallet contribution across income types; the grand total
    // still spans every existing source, so it is read from the DB after seeding.
    await seed.incomeSource('E2E Trend Bank', 4200.5);
    await seed.ewalletSource('E2E Trend Wallet', 800.25);
    expectedGrandTotal = await income.grandTotal();
  });

  test.afterAll(async () => {
    await cleanup.incomeSources();
    await cleanup.incomeSnapshots();
  });

  test('dashboard load upserts the current-week snapshot equal to the grand total', async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
    // The upsert is best-effort/fire-and-forget, so poll the DB until it lands.
    await expect
      .poll(async () => (await incomeSnapshots.forWeek(currentWeek)).length)
      .toBe(1);
    const rows = await incomeSnapshots.forWeek(currentWeek);
    expect(rows[0]!.total, 'current-week snapshot should equal the grand total').toBeCloseTo(
      expectedGrandTotal,
      2,
    );
  });

  test('reloading the dashboard does not create a duplicate current-week snapshot', async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect
      .poll(async () => (await incomeSnapshots.forWeek(currentWeek)).length)
      .toBe(1);
    await page.reload();
    await expect(page.getByTestId('loading-screen')).toBeHidden({ timeout: 15_000 });
    // The unique (user_id, week_ending) upsert must keep it at exactly one row.
    await expect
      .poll(async () => (await incomeSnapshots.forWeek(currentWeek)).length)
      .toBe(1);
  });
});

test.describe('Weekly Income Trend — cross-viewport', () => {
  test.beforeAll(async () => {
    await cleanup.incomeSnapshots();
    await seedCompletedWeeks(3);
  });

  test.afterAll(async () => {
    await cleanup.incomeSnapshots();
  });

  test('renders on the desktop dashboard and survives a reload', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.incomeTrendChart()).toBeVisible();
    await expect(dashboard.incomeTrendDots()).toHaveCount(3);

    await page.reload();
    await expect(page.getByTestId('loading-screen')).toBeHidden({ timeout: 15_000 });
    await expect(dashboard.incomeTrendChart()).toBeVisible();
    await expect(dashboard.incomeTrendDots()).toHaveCount(3);
  });

  test.describe('mobile viewport', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('renders the card and its dots on the mobile dashboard', async ({ page }) => {
      const dashboard = new DashboardPage(page);
      await dashboard.goto();
      await expect(dashboard.incomeTrendSection()).toBeVisible();
      await expect(dashboard.incomeTrendChart()).toBeVisible();
      await expect(dashboard.incomeTrendDots()).toHaveCount(3);
    });
  });
});

test.describe('Weekly Income Trend — tooltip', () => {
  let dashboard!: DashboardPage;

  test.beforeAll(async () => {
    await cleanup.incomeSnapshots();
    await seedCompletedWeeks(3);
  });

  test.afterAll(async () => {
    await cleanup.incomeSnapshots();
  });

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.incomeTrendDots()).toHaveCount(3);
  });

  test('hovering the chart shows a "Total income" tooltip with a peso value', async () => {
    await dashboard.hoverIncomeTrendChart();
    await expect(dashboard.incomeTrendTooltip()).toBeVisible();
    await expect(dashboard.incomeTrendTooltipName()).toHaveText('Total income');
    await expect(dashboard.incomeTrendTooltipValue()).toContainText('₱');
  });

  test('tooltip text is legible in light theme (text colour differs from its background)', async ({ page }) => {
    await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
    await dashboard.hoverIncomeTrendChart();
    await expect(dashboard.incomeTrendTooltip()).toBeVisible();

    const textColor = await dashboard
      .incomeTrendTooltipName()
      .evaluate((el) => window.getComputedStyle(el).color);
    const background = await dashboard
      .incomeTrendTooltip()
      .evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(textColor, 'light tooltip text must not match its background').not.toBe(background);
  });

  test('tooltip text is legible in dark theme (text colour differs from its background)', async ({ page }) => {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await dashboard.hoverIncomeTrendChart();
    await expect(dashboard.incomeTrendTooltip()).toBeVisible();

    const textColor = await dashboard
      .incomeTrendTooltipName()
      .evaluate((el) => window.getComputedStyle(el).color);
    const background = await dashboard
      .incomeTrendTooltip()
      .evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(textColor, 'dark tooltip text must not match its background').not.toBe(background);
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
  });
});
