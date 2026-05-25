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

  test('h1 heading is visible', async () => {
    await expect(dashboard.heading()).toBeVisible();
  });

  test('four KPI stat cards are visible', async () => {
    await expect(dashboard.stats()).toHaveCount(4);
    await expect(dashboard.statLabel('Today')).toBeVisible();
    await expect(dashboard.statLabel('This Month')).toBeVisible();
  });

  test('budget status section is present', async () => {
    await expect(dashboard.budgetStatusSection()).toBeVisible();
  });

  test('category chart section is present', async () => {
    await expect(dashboard.categoryChartSection()).toBeVisible();
  });

  test('6-month trend chart section is present', async () => {
    await expect(dashboard.trendSection()).toBeVisible();
  });
});
