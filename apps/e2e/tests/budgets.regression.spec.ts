import { test, expect } from '@playwright/test';
import {
  E2E_BUDGET_LIMIT,
  E2E_BUDGET_LIMIT_EDITED,
  categoryBudget,
  cleanup,
  seed,
} from './helpers/supabase';
import { BudgetsPage } from './pages/BudgetsPage';
import { DashboardPage } from './pages/DashboardPage';

test.describe('Budgets — edit regression', () => {
  let categoryName = '';

  test.beforeAll(async () => {
    await cleanup.budget();
    await cleanup.category();
    const created = await seed.categoryBudget();
    categoryName = created.categoryName;
  });

  test.afterAll(async () => {
    await cleanup.budget();
    await cleanup.category();
  });

  test('editing a per-category budget updates its displayed limit', async ({ page }) => {
    const budgets = new BudgetsPage(page);
    await budgets.goto();

    await expect(budgets.row(categoryName)).toBeVisible();
    await expect(budgets.row(categoryName)).toContainText(E2E_BUDGET_LIMIT.toLocaleString());

    await budgets.editRow(categoryName);
    await expect(budgets.categorySelect()).toBeDisabled();
    await budgets.monthlyLimitInput().fill(String(E2E_BUDGET_LIMIT_EDITED));
    await budgets.updateBudgetButton().click();

    await expect(budgets.updateBudgetButton()).toBeHidden();
    await expect(budgets.row(categoryName)).toContainText(E2E_BUDGET_LIMIT_EDITED.toLocaleString());
  });

  test('read-only Overall footer row reflects the sum of category limits and has no actions', async ({ page }) => {
    const budgets = new BudgetsPage(page);
    await budgets.goto();

    const expectedSum = await categoryBudget.sumLimits();
    expect(expectedSum).toBeGreaterThan(0);

    await expect(budgets.overallFooterRow()).toBeVisible();
    await expect(budgets.overallFooterRow()).toContainText('Overall');
    await expect(budgets.overallFooterRow()).toContainText(expectedSum.toLocaleString());
    await expect(budgets.overallFooterRow().getByRole('button')).toHaveCount(0);
  });

  test('dashboard Budget Status lists the computed Overall row alongside the category', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await expect(dashboard.budgetStatusSection()).toBeVisible();
    await expect(dashboard.budgetStatusRow('Overall')).toBeVisible();
    await expect(dashboard.budgetStatusRow(categoryName)).toBeVisible();
  });
});
