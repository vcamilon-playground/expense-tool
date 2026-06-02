import { test, expect } from '@playwright/test';
import { BudgetsPage } from './pages/BudgetsPage';

test.describe('Budgets page', () => {
  let budgets!: BudgetsPage;

  test.beforeEach(async ({ page }) => {
    budgets = new BudgetsPage(page);
    await budgets.goto();
  });

  test('page heading shows "Budgets"', async () => {
    await expect(budgets.heading()).toBeVisible();
    await expect(budgets.heading()).toHaveText('Budgets');
  });

  test('page description text is present', async () => {
    await expect(budgets.page.getByText('Set a monthly limit overall or per category')).toBeVisible();
  });

  test('budget form has Category and Monthly Limit labels with Save Budget button', async () => {
    await expect(budgets.page.getByText('Category').first()).toBeVisible();
    await expect(budgets.page.getByText('Monthly Limit').first()).toBeVisible();
    await expect(budgets.saveBudgetButton()).toBeVisible();
    await expect(budgets.saveBudgetButton()).toHaveText('Save Budget');
  });

  test('Monthly Limit input is visible', async () => {
    await expect(budgets.monthlyLimitInput()).toBeVisible();
  });

  test('Current Budgets section heading is correct', async () => {
    await expect(budgets.currentBudgetsHeading()).toBeVisible();
    await expect(budgets.currentBudgetsHeading()).toHaveText('Current Budgets');
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

  test('submitting empty Monthly Limit shows inline error', async ({ page }) => {
    await budgets.monthlyLimitInput().fill('');
    await budgets.saveBudgetButton().click();
    await expect(budgets.saveBudgetButton()).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Monthly Limit' }).locator('.field-error')).toBeVisible();
  });

  test('submitting negative Monthly Limit shows inline error', async ({ page }) => {
    await budgets.monthlyLimitInput().fill('-1');
    await budgets.saveBudgetButton().click();
    await expect(budgets.saveBudgetButton()).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Monthly Limit' }).locator('.field-error')).toBeVisible();
  });
});

test.describe('Budgets — column sorting', () => {
  let budgets!: BudgetsPage;

  test.beforeEach(async ({ page }) => {
    budgets = new BudgetsPage(page);
    await budgets.goto();
  });

  test('Category and Monthly Limit headers are sortable', async ({ page }) => {
    if (await page.locator('table').count() === 0) return;
    await expect(budgets.sortableHeader('Category')).toBeVisible();
    await expect(budgets.sortableHeader('Monthly Limit')).toBeVisible();
  });

  test('clicking Monthly Limit header activates sort indicator', async ({ page }) => {
    if (await page.locator('table').count() === 0) return;
    await budgets.sortableHeader('Monthly Limit').click();
    await expect(budgets.sortableHeader('Monthly Limit').locator('.sort-active')).toBeVisible();
  });

  test('clicking Monthly Limit twice toggles sort direction', async ({ page }) => {
    if (await page.locator('table').count() === 0) return;
    await budgets.sortableHeader('Monthly Limit').click();
    const first = await budgets.sortableHeader('Monthly Limit').locator('.sort-active').textContent();
    await budgets.sortableHeader('Monthly Limit').click();
    const second = await budgets.sortableHeader('Monthly Limit').locator('.sort-active').textContent();
    expect(first).not.toBe(second);
  });
});
