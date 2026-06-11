import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages/DashboardPage';

test.describe('Dashboard', () => {
  let dashboard!: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
  });

  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/Expense Tool/i);
  });

  test('all page sections render correctly', async () => {
    await expect(dashboard.greeting()).toBeVisible();
    await expect(dashboard.greeting()).toContainText('E2E');
    await expect(dashboard.stats()).toHaveCount(4);
    await expect(dashboard.statLabel('Today')).toBeVisible();
    await expect(dashboard.statLabel('This Week')).toBeVisible();
    await expect(dashboard.statLabel('This Month')).toBeVisible();
    await expect(dashboard.statLabel('This Year')).toBeVisible();
    await expect(dashboard.budgetStatusSection()).toHaveText('Budget Status');
    await expect(dashboard.dailyTrendSection()).toBeVisible();
    await expect(dashboard.weeklyTrendSection()).toBeVisible();
    await expect(dashboard.categoryChartSection()).toHaveText('This Month by Category');
    await expect(dashboard.trendSection()).toHaveText('6-Month Trend');
    await expect(dashboard.upcomingChargesSection()).toHaveText('Upcoming Charges');
  });

  test('month-end reminder banner is conditional on days remaining in month', async () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = lastDay - now.getDate();
    const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    if (daysLeft <= 7) {
      await expect(dashboard.banner()).toBeVisible();
      await expect(dashboard.banner()).toHaveClass(/banner-danger/);
      await expect(dashboard.banner()).toContainText(monthYear);
      await expect(dashboard.banner()).toContainText('Please update all your expenses');
      if (daysLeft === 0) {
        await expect(dashboard.banner()).toContainText('last day');
      } else {
        await expect(dashboard.banner()).toContainText(`${daysLeft} day`);
      }
    } else {
      await expect(dashboard.banner()).not.toBeVisible();
    }
  });
});

test.describe('Dashboard — refresh on resume after idle', () => {
  async function setVisibility(page: import('@playwright/test').Page, state: 'hidden' | 'visible') {
    await page.evaluate((value) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value });
      document.dispatchEvent(new Event('visibilitychange'));
    }, state);
  }

  test('refetches data when resumed after a long background period', async ({ page }) => {
    await page.clock.install();
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    let refetches = 0;
    page.on('request', (req) => {
      if (req.url().includes('/rest/v1/expenses')) refetches += 1;
    });

    await setVisibility(page, 'hidden');
    await page.clock.fastForward(6 * 60 * 1000); // past the 5-minute staleness threshold
    await setVisibility(page, 'visible');

    await expect.poll(() => refetches).toBeGreaterThan(0);
  });

  test('does not refetch after a brief background period', async ({ page }) => {
    await page.clock.install();
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    let refetches = 0;
    page.on('request', (req) => {
      if (req.url().includes('/rest/v1/expenses')) refetches += 1;
    });

    await setVisibility(page, 'hidden');
    await page.clock.fastForward(60 * 1000); // under the 5-minute threshold
    await setVisibility(page, 'visible');

    await page.waitForTimeout(500);
    expect(refetches).toBe(0);
  });
});

test.describe('Dashboard — Upcoming Charges column sorting', () => {
  let dashboard!: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
  });

  test('sortable headers present and Due Date toggles direction', async ({ page }) => {
    const table = page.locator('.card').filter({ hasText: 'Upcoming Charges' }).locator('table');
    if (await table.count() === 0) return;
    for (const col of ['Name', 'Amount', 'Due Date', 'Cadence']) {
      await expect(dashboard.sortableHeader(col)).toBeVisible();
    }
    await dashboard.sortableHeader('Due Date').click();
    const first = await dashboard.sortableHeader('Due Date').locator('.sort-active').textContent();
    await dashboard.sortableHeader('Due Date').click();
    const second = await dashboard.sortableHeader('Due Date').locator('.sort-active').textContent();
    expect(first).not.toBe(second);
  });
});
