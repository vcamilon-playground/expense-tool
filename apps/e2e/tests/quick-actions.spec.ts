import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages/DashboardPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { RecurringPage } from './pages/RecurringPage';

test.describe('Dashboard — Quick actions row', () => {
  let dashboard!: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
  });

  test('renders three quick-action shortcuts with the correct labels', async () => {
    await expect(dashboard.quickActions()).toBeVisible();
    await expect(dashboard.quickActionLinks()).toHaveCount(3);
    await expect(dashboard.quickActionLabels()).toHaveText([
      'Add Expense',
      'Add Budget',
      'Add Recurring',
    ]);

    // Each link points at the matching ?new=1 target.
    await expect(dashboard.quickAction('Add Expense')).toHaveAttribute('href', '/expenses?new=1');
    await expect(dashboard.quickAction('Add Budget')).toHaveAttribute('href', '/budgets?new=1');
    await expect(dashboard.quickAction('Add Recurring')).toHaveAttribute('href', '/recurring?new=1');
  });

  test('quick actions sit below the KPI cards and above the Budget Status card', async ({ page }) => {
    const kpiBox = await page.locator('.stat').first().boundingBox();
    const quickBox = await dashboard.quickActions().boundingBox();
    const budgetBox = await dashboard.budgetStatusCard().boundingBox();

    expect(kpiBox).not.toBeNull();
    expect(quickBox).not.toBeNull();
    expect(budgetBox).not.toBeNull();
    if (!kpiBox || !quickBox || !budgetBox) return;

    // Below the KPIs (top edge of quick actions is lower on the page).
    expect(quickBox.y).toBeGreaterThan(kpiBox.y);
    // Above the Budget Status card.
    expect(quickBox.y).toBeLessThan(budgetBox.y);
  });

  test('each quick-action icon and label are rendered per link', async () => {
    for (const label of ['Add Expense', 'Add Budget', 'Add Recurring']) {
      const link = dashboard.quickAction(label);
      await expect(link.locator('.quick-action-icon')).toBeVisible();
      await expect(link.locator('.quick-action-label')).toHaveText(label);
    }
  });
});

test.describe('Quick actions — navigation auto-opens the Add form', () => {
  test('Add Expense navigates to /expenses and auto-opens the Add Expense modal', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    const expenses = new ExpensesPage(page);
    await dashboard.goto();

    await dashboard.quickAction('Add Expense').click();
    await expect(page).toHaveURL(/\/expenses\?new=1/);
    await expect(expenses.dialog()).toBeVisible();
    await expect(expenses.addModalHeading()).toBeVisible();
  });

  test('Add Budget navigates to /budgets and auto-opens the Add Budget form', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    const budgets = new BudgetsPage(page);
    await dashboard.goto();

    await dashboard.quickAction('Add Budget').click();
    await expect(page).toHaveURL(/\/budgets\?new=1/);
    await expect(budgets.dialog()).toBeVisible();
    await expect(budgets.addModalHeading()).toBeVisible();
  });

  test('Add Recurring navigates to /recurring and auto-opens the Add Recurring Expense modal', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    const recurring = new RecurringPage(page);
    await dashboard.goto();

    await dashboard.quickAction('Add Recurring').click();
    await expect(page).toHaveURL(/\/recurring\?new=1/);
    await expect(recurring.dialog()).toBeVisible();
    await expect(recurring.addModalHeading()).toBeVisible();
  });
});

test.describe('Quick-action targets — no ?new=1 does NOT auto-open the Add form', () => {
  test('/expenses without ?new=1 keeps the Add Expense modal closed', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.goto();
    await expect(expenses.heading()).toBeVisible();
    await expect(expenses.dialog()).toHaveCount(0);
  });

  test('/budgets without ?new=1 keeps the Add Budget form closed', async ({ page }) => {
    const budgets = new BudgetsPage(page);
    await budgets.goto();
    await expect(budgets.heading()).toBeVisible();
    await expect(budgets.dialog()).toHaveCount(0);
  });

  test('/recurring without ?new=1 keeps the Add Recurring Expense modal closed', async ({ page }) => {
    const recurring = new RecurringPage(page);
    await recurring.goto();
    await expect(recurring.heading()).toBeVisible();
    await expect(recurring.dialog()).toHaveCount(0);
  });
});

test.describe('Quick actions — mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('quick actions still render with all three shortcuts on mobile', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.quickActions()).toBeVisible();
    await expect(dashboard.quickActionLinks()).toHaveCount(3);
    await expect(dashboard.quickActionLabels()).toHaveText([
      'Add Expense',
      'Add Budget',
      'Add Recurring',
    ]);
  });

  test('tapping a mobile quick action auto-opens the Add form', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    const expenses = new ExpensesPage(page);
    await dashboard.goto();
    await dashboard.quickAction('Add Expense').click();
    await expect(page).toHaveURL(/\/expenses\?new=1/);
    await expect(expenses.addModalHeading()).toBeVisible();
  });
});
