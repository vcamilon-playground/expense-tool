import { test, expect } from '@playwright/test';
import { BudgetsPage } from './pages/BudgetsPage';

test.describe('Budgets page', () => {
  let budgets!: BudgetsPage;

  test.beforeEach(async ({ page }) => {
    budgets = new BudgetsPage(page);
    await budgets.goto();
  });

  test('page renders with heading, form, and budget sections', async () => {
    await expect(budgets.heading()).toHaveText('Budgets');
    await expect(budgets.page.getByText('Set a monthly limit overall or per category')).toBeVisible();
    await expect(budgets.page.getByText('Category').first()).toBeVisible();
    await expect(budgets.page.getByText('Monthly Limit').first()).toBeVisible();
    await expect(budgets.monthlyLimitInput()).toBeVisible();
    await expect(budgets.saveBudgetButton()).toHaveText('Save Budget');
    await expect(budgets.currentBudgetsHeading()).toHaveText('Current Budgets');
  });

  test('each budget row has Edit and Delete buttons', async () => {
    const rows = budgets.page.locator('table tbody tr');
    if (await rows.count() === 0) test.skip();
    await expect(rows.first().getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(rows.first().getByRole('button', { name: 'Delete' })).toBeVisible();
  });

  test('edit mode populates form, disables category, and Cancel restores default state', async () => {
    const rows = budgets.page.locator('table tbody tr');
    if (await rows.count() === 0) test.skip();

    await rows.first().getByRole('button', { name: 'Edit' }).click();
    await expect(budgets.updateBudgetButton()).toBeVisible();
    await expect(budgets.cancelEditButton()).toBeVisible();
    await expect(budgets.saveBudgetButton()).toBeHidden();
    expect(await budgets.monthlyLimitInput().inputValue()).not.toBe('');
    await expect(budgets.page.locator('select')).toBeDisabled();

    await budgets.cancelEdit();
    await expect(budgets.saveBudgetButton()).toBeVisible();
    await expect(budgets.updateBudgetButton()).toBeHidden();
    await expect(budgets.page.locator('select')).toBeEnabled();
  });

  test('invalid Monthly Limit values show inline error', async ({ page }) => {
    await budgets.monthlyLimitInput().fill('');
    await budgets.saveBudgetButton().click();
    await expect(page.locator('label').filter({ hasText: 'Monthly Limit' }).locator('.field-error')).toBeVisible();

    await budgets.monthlyLimitInput().fill('-1');
    await budgets.saveBudgetButton().click();
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

  test('Monthly Limit sort activates and toggles direction', async ({ page }) => {
    if (await page.locator('table').count() === 0) return;
    await budgets.sortableHeader('Monthly Limit').click();
    await expect(budgets.sortableHeader('Monthly Limit').locator('.sort-active')).toBeVisible();
    const first = await budgets.sortableHeader('Monthly Limit').locator('.sort-active').textContent();
    await budgets.sortableHeader('Monthly Limit').click();
    const second = await budgets.sortableHeader('Monthly Limit').locator('.sort-active').textContent();
    expect(first).not.toBe(second);
  });
});
