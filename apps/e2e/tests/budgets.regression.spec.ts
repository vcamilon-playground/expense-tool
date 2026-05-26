import { test, expect } from '@playwright/test';
import {
  E2E_BUDGET_LIMIT,
  E2E_BUDGET_LIMIT_EDITED,
  OverallBudgetSnapshot,
  cleanup,
  overallBudget,
  seed,
} from './helpers/supabase';
import { BudgetsPage } from './pages/BudgetsPage';

test.describe('Budgets — edit regression', () => {
  let snapshot: OverallBudgetSnapshot = null;

  test.beforeAll(async () => {
    snapshot = await overallBudget.get();
    if (snapshot) {
      await overallBudget.restore(snapshot.id, E2E_BUDGET_LIMIT);
    } else {
      await seed.budget();
    }
  });

  test.afterAll(async () => {
    if (snapshot) {
      await overallBudget.restore(snapshot.id, snapshot.monthly_limit);
    } else {
      await cleanup.budget();
    }
  });

  test('edit overall budget updates the displayed limit', async ({ page }) => {
    const budgets = new BudgetsPage(page);
    await budgets.goto();

    await expect(budgets.row('Overall')).toBeVisible();
    await expect(budgets.row('Overall')).toContainText(E2E_BUDGET_LIMIT.toLocaleString());

    await budgets.editRow('Overall');
    await budgets.monthlyLimitInput().fill(String(E2E_BUDGET_LIMIT_EDITED));
    await budgets.updateBudgetButton().click();

    await expect(budgets.updateBudgetButton()).toBeHidden();
    await expect(budgets.row('Overall')).toContainText(E2E_BUDGET_LIMIT_EDITED.toLocaleString());
  });
});
