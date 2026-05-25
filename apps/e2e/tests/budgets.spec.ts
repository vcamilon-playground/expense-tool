import { test, expect } from '@playwright/test';
import { BudgetsPage } from './pages/BudgetsPage';

test.describe('Budgets page', () => {
  let budgets!: BudgetsPage;

  test.beforeEach(async ({ page }) => {
    budgets = new BudgetsPage(page);
    await budgets.goto();
  });

  test('page heading is visible', async () => {
    await expect(budgets.heading()).toBeVisible();
  });

  test('budget form is visible with Save Budget button', async () => {
    await expect(budgets.saveBudgetButton()).toBeVisible();
  });

  test('Monthly Limit input is visible', async () => {
    await expect(budgets.monthlyLimitInput()).toBeVisible();
  });

  test('Current Budgets section is visible', async () => {
    await expect(budgets.currentBudgetsHeading()).toBeVisible();
  });
});
