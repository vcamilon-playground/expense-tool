import { test, expect } from '@playwright/test';
import { BudgetsPage } from './pages/BudgetsPage';

test.describe('Budgets page', () => {
  let budgets!: BudgetsPage;

  test.beforeEach(async ({ page }) => {
    budgets = new BudgetsPage(page);
    await budgets.goto();
  });

  test('page renders with heading, add button, and budget sections', async () => {
    await expect(budgets.heading()).toHaveText('Budgets');
    await expect(
      budgets.page.getByText('Set a monthly limit per category. Your overall budget is the total of every category limit. Dashboard will warn at 80% and flag overspend.'),
    ).toBeVisible();
    await expect(budgets.addBudgetButton()).toBeVisible();
    await expect(budgets.currentBudgetsHeading()).toHaveText('Current Budgets');
  });

  test('Add Budget modal shows the form fields and save button', async () => {
    await budgets.openAddModal();
    await expect(budgets.dialog().getByText('Category', { exact: true })).toBeVisible();
    await expect(budgets.dialog().getByText('Monthly Limit', { exact: true })).toBeVisible();
    await expect(budgets.monthlyLimitInput()).toBeVisible();
    await expect(budgets.saveBudgetButton()).toHaveText('Save Budget');
  });

  test('category select prompts to "Select a category" and offers no manual Overall option', async () => {
    await budgets.openAddModal();
    await expect(budgets.categorySelect().locator('option').first()).toHaveText('Select a category');
    await expect(budgets.categorySelect().locator('option', { hasText: 'Overall (any category)' })).toHaveCount(0);
  });

  test('computed Overall footer row is read-only with no Edit/Delete buttons', async () => {
    const table = budgets.page.locator('table.budget-table');
    if (await table.count() === 0) test.skip();
    await expect(budgets.overallFooterRow()).toBeVisible();
    await expect(budgets.overallFooterRow()).toContainText('Overall');
    await expect(budgets.overallFooterRow().getByRole('button')).toHaveCount(0);
  });

  test('each budget row has Edit and Delete buttons', async () => {
    const rows = budgets.page.locator('table tbody tr');
    if (await rows.count() === 0) test.skip();
    await expect(rows.first().getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(rows.first().getByRole('button', { name: 'Delete' })).toBeVisible();
  });

  test('edit mode opens the modal pre-filled with category disabled; Cancel closes it', async () => {
    const rows = budgets.page.locator('table tbody tr');
    if (await rows.count() === 0) test.skip();

    await rows.first().getByRole('button', { name: 'Edit' }).click();
    await expect(budgets.updateBudgetButton()).toBeVisible();
    await expect(budgets.cancelEditButton()).toBeVisible();
    await expect(budgets.saveBudgetButton()).toBeHidden();
    expect(await budgets.monthlyLimitInput().inputValue()).not.toBe('');
    await expect(budgets.categorySelect()).toBeDisabled();

    await budgets.cancelEdit();
    await expect(budgets.dialog()).toBeHidden();

    // A fresh add opens with the category select enabled again.
    await budgets.openAddModal();
    await expect(budgets.saveBudgetButton()).toBeVisible();
    await expect(budgets.categorySelect()).toBeEnabled();
  });

  test('invalid Monthly Limit values show inline error', async () => {
    await budgets.openAddModal();
    // Category is required and validated before the limit, so pick a real one first.
    if (!(await budgets.selectFirstCategory())) test.skip();
    await budgets.monthlyLimitInput().fill('');
    await budgets.saveBudgetButton().click();
    await expect(budgets.dialog().locator('label').filter({ hasText: 'Monthly Limit' }).locator('.field-error')).toBeVisible();

    await budgets.monthlyLimitInput().fill('-1');
    await budgets.saveBudgetButton().click();
    await expect(budgets.dialog().locator('label').filter({ hasText: 'Monthly Limit' }).locator('.field-error')).toBeVisible();
  });

  test('submitting Add Budget without choosing a category shows an inline error', async () => {
    await budgets.openAddModal();
    await budgets.monthlyLimitInput().fill('500');
    await budgets.saveBudgetButton().click();
    await expect(budgets.categoryFieldError()).toBeVisible();
    await expect(budgets.categoryFieldError()).toHaveText('Select a category');
  });
});

test.describe('Budgets — column sorting', () => {
  let budgets!: BudgetsPage;

  test.beforeEach(async ({ page }) => {
    budgets = new BudgetsPage(page);
    await budgets.goto();
  });

  test('Category and Monthly Limit headers are sortable; Monthly Limit toggles direction', async ({ page }) => {
    if (await page.locator('table').count() === 0) return;
    await expect(budgets.sortableHeader('Category')).toBeVisible();
    await expect(budgets.sortableHeader('Monthly Limit')).toBeVisible();

    await budgets.sortableHeader('Monthly Limit').click();
    await expect(budgets.sortableHeader('Monthly Limit').locator('.sort-active')).toBeVisible();
    const first = await budgets.sortableHeader('Monthly Limit').locator('.sort-active').textContent();
    await budgets.sortableHeader('Monthly Limit').click();
    const second = await budgets.sortableHeader('Monthly Limit').locator('.sort-active').textContent();
    expect(first).not.toBe(second);
  });
});
