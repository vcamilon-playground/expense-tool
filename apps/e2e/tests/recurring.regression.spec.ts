import { test, expect } from '@playwright/test';
import { E2E_RECURRING_NAME, cleanup } from './helpers/supabase';

test.describe('Recurring Expenses — CRUD regression', () => {
  test.beforeAll(async () => {
    await cleanup.recurring();
  });

  test.afterAll(async () => {
    await cleanup.recurring();
  });

  test('create, edit, and delete a recurring expense', async ({ page }) => {
    await page.goto('/recurring');
    await expect(page.getByText('Loading…')).toBeHidden({ timeout: 15_000 });

    // CREATE
    await page.getByRole('button', { name: '+ Add Recurring' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Add Recurring Expense' })).toBeVisible();
    await dialog.locator('label').filter({ hasText: 'Name' }).locator('input').fill(E2E_RECURRING_NAME);
    await dialog.locator('label').filter({ hasText: 'Amount' }).locator('input[type="number"]').fill('9.99');
    await dialog.getByRole('button', { name: 'Add Recurring' }).click();
    await expect(dialog).toBeHidden();

    // Verify created
    const row = page.locator('.recurring-table tbody tr').filter({ hasText: E2E_RECURRING_NAME });
    await expect(row).toBeVisible();
    await expect(row).toContainText('9.99');

    // EDIT
    await row.getByRole('button', { name: 'Edit' }).click();
    const editDialog = page.getByRole('dialog');
    await expect(editDialog.getByRole('heading', { name: 'Edit Recurring Expense' })).toBeVisible();
    await editDialog.locator('label').filter({ hasText: 'Amount' }).locator('input[type="number"]').fill('19.99');
    await editDialog.getByRole('button', { name: 'Update' }).click();
    await expect(editDialog).toBeHidden();

    // Verify edited
    await expect(
      page.locator('.recurring-table tbody tr').filter({ hasText: E2E_RECURRING_NAME }),
    ).toContainText('19.99');

    // DELETE
    await page
      .locator('.recurring-table tbody tr')
      .filter({ hasText: E2E_RECURRING_NAME })
      .getByRole('button', { name: 'Delete' })
      .click();
    const deleteDialog = page.getByRole('dialog');
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Remove' }).click();

    // Verify deleted
    await expect(
      page.locator('.recurring-table tbody tr').filter({ hasText: E2E_RECURRING_NAME }),
    ).toHaveCount(0);
  });
});
