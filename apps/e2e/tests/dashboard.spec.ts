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

  test('h1 heading shows "Dashboard"', async () => {
    await expect(dashboard.heading()).toBeVisible();
    await expect(dashboard.heading()).toHaveText('Dashboard');
  });

  test('four KPI stat cards are visible with correct labels', async () => {
    await expect(dashboard.stats()).toHaveCount(4);
    await expect(dashboard.statLabel('Today')).toBeVisible();
    await expect(dashboard.statLabel('This Week')).toBeVisible();
    await expect(dashboard.statLabel('This Month')).toBeVisible();
    await expect(dashboard.statLabel('This Year')).toBeVisible();
  });

  test('budget status section heading is correct', async () => {
    await expect(dashboard.budgetStatusSection()).toBeVisible();
    await expect(dashboard.budgetStatusSection()).toHaveText('Budget Status');
  });

  test('category chart section heading is correct', async () => {
    await expect(dashboard.categoryChartSection()).toBeVisible();
    await expect(dashboard.categoryChartSection()).toHaveText('This Month by Category');
  });

  test('6-month trend chart section heading is correct', async () => {
    await expect(dashboard.trendSection()).toBeVisible();
    await expect(dashboard.trendSection()).toHaveText('6-Month Trend');
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
      await expect(dashboard.banner()).toContainText('please update all your expenses');
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
