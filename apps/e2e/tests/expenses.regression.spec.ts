import { test, expect } from '@playwright/test';
import { E2E_MERCHANT, cleanup } from './helpers/supabase';
import { ExpensesPage } from './pages/ExpensesPage';

test.describe('Expenses — CRUD regression', () => {
  test.beforeAll(async () => {
    await cleanup.expenses();
  });

  test.afterAll(async () => {
    await cleanup.expenses();
  });

  test('create, edit, and delete an expense', async ({ page }) => {
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
