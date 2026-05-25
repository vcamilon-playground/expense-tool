import { test, expect } from '@playwright/test';
import { E2E_RECURRING_NAME, cleanup } from './helpers/supabase';
import { RecurringPage } from './pages/RecurringPage';

test.describe('Recurring Expenses — CRUD regression', () => {
  test.beforeAll(async () => {
    await cleanup.recurring();
  });

  test.afterAll(async () => {
    await cleanup.recurring();
  });

  test('create, edit, and delete a recurring expense', async ({ page }) => {
    const recurring = new RecurringPage(page);
    await recurring.goto();

    // CREATE
    await recurring.openAddModal();
    await recurring.fillForm({ name: E2E_RECURRING_NAME, amount: '9.99' });
    await recurring.submitAdd();

    // Verify created
    await expect(recurring.row(E2E_RECURRING_NAME)).toBeVisible();
    await expect(recurring.row(E2E_RECURRING_NAME)).toContainText('9.99');

    // EDIT
    await recurring.editRow(E2E_RECURRING_NAME);
    await recurring.fillAmount('19.99');
    await recurring.submitEdit();

    // Verify edited
    await expect(recurring.row(E2E_RECURRING_NAME)).toContainText('19.99');

    // DELETE
    await recurring.deleteRow(E2E_RECURRING_NAME);

    // Verify deleted
    await expect(recurring.row(E2E_RECURRING_NAME)).toHaveCount(0);
  });
});
