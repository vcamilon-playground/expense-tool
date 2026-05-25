import { test, expect } from '@playwright/test';
import { ExpensesPage } from './pages/ExpensesPage';

test.describe('Expenses page', () => {
  let expenses!: ExpensesPage;

  test.beforeEach(async ({ page }) => {
    expenses = new ExpensesPage(page);
    await expenses.goto();
  });

  test('page heading is visible', async () => {
    await expect(expenses.heading()).toBeVisible();
  });

  test('Add Expense button is visible', async () => {
    await expect(expenses.addButton()).toBeVisible();
  });

  test('clicking Add Expense opens the modal', async () => {
    await expenses.openAddModal();
    await expect(expenses.dialog().getByRole('heading', { name: 'Add Expense' })).toBeVisible();
  });

  test('required fields have required attribute in modal', async () => {
    await expenses.openAddModal();
    const dialog = expenses.dialog();
    await expect(dialog.locator('input[type="number"][required]')).toBeAttached();
    await expect(dialog.locator('input[type="date"][required]')).toBeAttached();
  });

  test('modal closes on Cancel', async () => {
    await expenses.openAddModal();
    await expenses.cancel();
    await expect(expenses.dialog()).toBeHidden();
  });

  test('modal closes on Escape key', async () => {
    await expenses.openAddModal();
    await expenses.page.keyboard.press('Escape');
    await expect(expenses.dialog()).toBeHidden();
  });

  test('modal closes when clicking the backdrop', async () => {
    await expenses.openAddModal();
    await expenses.modalOverlay().click({ position: { x: 5, y: 5 } });
    await expect(expenses.dialog()).toBeHidden();
  });

  test('submitting empty form keeps modal open', async () => {
    await expenses.openAddModal();
    const dialog = expenses.dialog();
    await dialog.locator('input[type="number"]').fill('');
    await dialog.getByRole('button', { name: 'Add Expense' }).click();
    await expect(dialog).toBeVisible();
  });
});
