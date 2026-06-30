import { test, expect } from '@playwright/test';
import { E2E_MERCHANT, cleanup, seed } from './helpers/supabase';
import { ExpensesPage } from './pages/ExpensesPage';

test.describe('Expenses — CRUD regression', () => {
  test.beforeAll(async () => {
    await cleanup.expenses();
  });

  test.afterAll(async () => {
    await cleanup.expenses();
  });

  test('create, edit, and delete a current-month expense', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.goto();

    // CREATE
    await expenses.openAddModal();
    await expenses.fillForm({ amount: '100', merchant: E2E_MERCHANT, description: 'E2E regression expense' });
    await expenses.submitAdd();

    // Verify created
    await expect(expenses.row(E2E_MERCHANT)).toBeVisible();
    await expect(expenses.row(E2E_MERCHANT)).toContainText('E2E regression expense');

    // EDIT
    await expenses.editRow(E2E_MERCHANT);
    await expenses.fillDescription('E2E regression expense (edited)');
    await expenses.submitEdit();

    // Verify edited
    await expect(expenses.row(E2E_MERCHANT)).toContainText('E2E regression expense (edited)');

    // DELETE
    await expenses.openDeleteModal(E2E_MERCHANT);
    // Structural guard: DeleteModal was converted to the shared .modal-header band.
    await expect(expenses.deleteModalHeader()).toBeVisible();
    await expenses.deleteYesButton().click();
    await expect(expenses.deleteDialog()).toBeHidden();

    // Verify deleted
    await expect(expenses.row(E2E_MERCHANT)).toHaveCount(0);
  });
});

test.describe('Expenses — category required (validation against the DB)', () => {
  test.beforeAll(async () => {
    await cleanup.expenses();
  });

  test.afterAll(async () => {
    await cleanup.expenses();
  });

  test('Add Expense with no category is blocked and creates no row', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.goto();

    await expenses.openAddModal();
    const dialog = expenses.dialog();
    await dialog.locator('input[type="number"]').fill('123');
    await dialog.locator('label').filter({ hasText: 'Merchant' }).locator('input').fill(E2E_MERCHANT);
    // Intentionally leave Category on the placeholder.
    await dialog.getByRole('button', { name: 'Add Expense' }).click();

    // Modal stays open with the inline error; the DB write is blocked.
    await expect(dialog).toBeVisible();
    await expect(expenses.categoryError()).toHaveText('Category is required');
    await expenses.cancel();
    await expect(expenses.dialog()).toBeHidden();

    // Reload to prove nothing was persisted to the DB.
    await expenses.goto();
    await expect(expenses.row(E2E_MERCHANT)).toHaveCount(0);
  });

  test('editing a categorized expense and clearing the category blocks the Update', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.goto();

    // Create a categorized row (fillForm picks the first real category).
    await expenses.openAddModal();
    await expenses.fillForm({ amount: '50', merchant: E2E_MERCHANT, description: 'E2E category-required edit' });
    await expenses.submitAdd();
    await expect(expenses.row(E2E_MERCHANT)).toBeVisible();

    // Edit it and clear the category back to the placeholder.
    await expenses.editRow(E2E_MERCHANT);
    await expect(expenses.categorySelect()).not.toHaveValue('');
    await expenses.clearCategory();
    await expenses.dialog().getByRole('button', { name: 'Update' }).click();

    // Update is blocked: modal stays open with the inline error.
    await expect(expenses.dialog()).toBeVisible();
    await expect(expenses.categoryError()).toHaveText('Category is required');
    await expect(expenses.categorySelect()).toHaveAttribute('aria-invalid', 'true');

    await expenses.cancel();
  });
});

// Helper: compute the month label for the previous month the way the UI renders it
function lastMonthLabel(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 1, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });
}

test.describe('Expenses — past-month lock (allow-past-edit disabled)', () => {
  test.beforeAll(async () => {
    await cleanup.expenses();
    await seed.pastExpense();
  });

  test.afterAll(async () => {
    await cleanup.expenses();
  });

  test('past-month expense shows lock icon and no Edit or Delete buttons', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('allow-past-edit'));
    const expenses = new ExpensesPage(page);
    await expenses.goto();
    await expenses.monthGroupHeader(lastMonthLabel()).click();
    await expect(expenses.lockIcon(E2E_MERCHANT)).toBeVisible();
    await expect(expenses.editButton(E2E_MERCHANT)).toHaveCount(0);
    await expect(expenses.deleteButton(E2E_MERCHANT)).toHaveCount(0);
  });
});

test.describe('Expenses — past-month lock (allow-past-edit enabled)', () => {
  test.beforeAll(async () => {
    await cleanup.expenses();
    await seed.pastExpense();
  });

  test.afterAll(async () => {
    await cleanup.expenses();
  });

  test('past-month expense shows Edit and Delete when allow-past-edit is on', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('allow-past-edit', 'true'));
    const expenses = new ExpensesPage(page);
    await expenses.goto();
    await expenses.monthGroupHeader(lastMonthLabel()).click();
    await expect(expenses.editButton(E2E_MERCHANT)).toBeVisible();
    await expect(expenses.deleteButton(E2E_MERCHANT)).toBeVisible();
    await expect(expenses.lockIcon(E2E_MERCHANT)).toHaveCount(0);
  });
});
