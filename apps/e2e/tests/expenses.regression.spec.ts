import { test, expect } from '@playwright/test';
import { E2E_MERCHANT, cleanup } from './helpers/supabase';

test.describe('Expenses — CRUD regression', () => {
  test.beforeAll(async () => {
    await cleanup.expenses();
  });

  test.afterAll(async () => {
    await cleanup.expenses();
  });

  test('create, edit, and delete an expense', async ({ page }) => {
    await page.goto('/expenses');
    await expect(page.getByText('Loading…')).toBeHidden({ timeout: 15_000 });

    // CREATE
    await page.getByRole('button', { name: '+ Add Expense' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('input[type="number"]').fill('100');
    await dialog.locator('label').filter({ hasText: 'Merchant' }).locator('input').fill(E2E_MERCHANT);
    await dialog.locator('label').filter({ hasText: 'Description' }).locator('textarea').fill('E2E regression expense');
    await dialog.getByRole('button', { name: 'Add Expense' }).click();
    await expect(dialog).toBeHidden();

    // Verify created
    const row = page.locator('.expense-table tbody tr').filter({ hasText: E2E_MERCHANT });
    await expect(row).toBeVisible();
    await expect(row).toContainText('E2E regression expense');

    // EDIT
    await row.getByRole('button', { name: 'Edit' }).click();
    const editDialog = page.getByRole('dialog');
    await expect(editDialog.getByRole('heading', { name: 'Edit Expense' })).toBeVisible();
    await editDialog.locator('label').filter({ hasText: 'Description' }).locator('textarea').fill('E2E regression expense (edited)');
    await editDialog.getByRole('button', { name: 'Update' }).click();
    await expect(editDialog).toBeHidden();

    // Verify edited
    await expect(
      page.locator('.expense-table tbody tr').filter({ hasText: E2E_MERCHANT }),
    ).toContainText('E2E regression expense (edited)');

    // DELETE
    await page
      .locator('.expense-table tbody tr')
      .filter({ hasText: E2E_MERCHANT })
      .getByRole('button', { name: 'Delete' })
      .click();
    const deleteDialog = page.getByRole('dialog');
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Remove' }).click();

    // Verify deleted
    await expect(
      page.locator('.expense-table tbody tr').filter({ hasText: E2E_MERCHANT }),
    ).toHaveCount(0);
  });
});
