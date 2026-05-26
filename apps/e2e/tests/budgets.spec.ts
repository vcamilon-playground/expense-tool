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

  test('each budget row has Edit and Delete buttons', async () => {
    const rows = budgets.page.locator('table tbody tr');
    const count = await rows.count();
    if (count === 0) test.skip();
    await expect(rows.first().getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(rows.first().getByRole('button', { name: 'Delete' })).toBeVisible();
  });

  test('clicking Edit populates the form and shows Update Budget and Cancel', async () => {
    const rows = budgets.page.locator('table tbody tr');
    const count = await rows.count();
    if (count === 0) test.skip();
    await rows.first().getByRole('button', { name: 'Edit' }).click();
    await expect(budgets.updateBudgetButton()).toBeVisible();
    await expect(budgets.cancelEditButton()).toBeVisible();
    await expect(budgets.saveBudgetButton()).toBeHidden();
    const value = await budgets.monthlyLimitInput().inputValue();
    expect(value).not.toBe('');
  });

  test('Cancel edit restores Save Budget and hides Update Budget', async () => {
    const rows = budgets.page.locator('table tbody tr');
    const count = await rows.count();
    if (count === 0) test.skip();
    await rows.first().getByRole('button', { name: 'Edit' }).click();
    await expect(budgets.updateBudgetButton()).toBeVisible();
    await budgets.cancelEdit();
    await expect(budgets.saveBudgetButton()).toBeVisible();
    await expect(budgets.updateBudgetButton()).toBeHidden();
  });

  test('category select is disabled while editing', async () => {
    const rows = budgets.page.locator('table tbody tr');
    const count = await rows.count();
    if (count === 0) test.skip();
    await rows.first().getByRole('button', { name: 'Edit' }).click();
    await expect(budgets.page.locator('select')).toBeDisabled();
    await budgets.cancelEdit();
    await expect(budgets.page.locator('select')).toBeEnabled();
  });
});
