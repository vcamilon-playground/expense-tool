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
    await expenses.deleteRow(E2E_MERCHANT);

    // Verify deleted
    await expect(expenses.row(E2E_MERCHANT)).toHaveCount(0);
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
