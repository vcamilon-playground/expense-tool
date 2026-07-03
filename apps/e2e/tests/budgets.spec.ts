import { test, expect } from '@playwright/test';
import { BudgetsPage } from './pages/BudgetsPage';
import { seed, cleanup, E2E_CATEGORY_NAME } from './helpers/supabase';

test.describe('Budgets page', () => {
  let budgets!: BudgetsPage;

  // Seed a category + per-category budget so the row-dependent tests always have
  // data (rather than skipping when the account happens to have no budgets).
  test.beforeAll(async () => {
    await cleanup.budget();
    await cleanup.category();
    await seed.categoryBudget();
  });

  test.afterAll(async () => {
    await cleanup.budget();
    await cleanup.category();
  });

  test.beforeEach(async ({ page }) => {
    budgets = new BudgetsPage(page);
    await budgets.goto();
  });

  test('page renders with heading, add button, and budget sections', async () => {
    await expect(budgets.heading()).toHaveText('Budgets');
    await expect(budgets.helpText()).toBeVisible();
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
    await expect(budgets.categoryPlaceholderOption()).toHaveText('Select a category');
    await expect(budgets.categorySelect().locator('option', { hasText: 'Overall (any category)' })).toHaveCount(0);
  });

  test('computed Overall footer row is read-only with no Edit/Delete buttons', async () => {
    await expect(budgets.overallFooterRow()).toBeVisible();
    await expect(budgets.overallFooterRow()).toContainText('Overall');
    await expect(budgets.overallFooterRow().getByRole('button')).toHaveCount(0);
  });

  test('each budget row has Edit and Delete buttons', async () => {
    await expect(budgets.editButton(E2E_CATEGORY_NAME)).toBeVisible();
    await expect(budgets.deleteButton(E2E_CATEGORY_NAME)).toBeVisible();
  });

  test('edit mode opens the modal pre-filled with category disabled; Cancel closes it', async () => {
    await budgets.editButton(E2E_CATEGORY_NAME).click();
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
    await budgets.selectFirstCategory();
    await budgets.monthlyLimitInput().fill('');
    await budgets.saveBudgetButton().click();
    await expect(budgets.monthlyLimitError()).toBeVisible();

    await budgets.monthlyLimitInput().fill('-1');
    await budgets.saveBudgetButton().click();
    await expect(budgets.monthlyLimitError()).toBeVisible();
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

  // Seed a budget so the sortable table is guaranteed to render.
  test.beforeAll(async () => {
    await cleanup.budget();
    await cleanup.category();
    await seed.categoryBudget();
  });

  test.afterAll(async () => {
    await cleanup.budget();
    await cleanup.category();
  });

  test.beforeEach(async ({ page }) => {
    budgets = new BudgetsPage(page);
    await budgets.goto();
  });

  test('Category and Monthly Limit headers are sortable; Monthly Limit toggles direction', async () => {
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
