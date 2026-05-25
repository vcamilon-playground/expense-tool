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

test.describe('Expenses — month group collapse behaviour', () => {
  let expenses!: ExpensesPage;

  test.beforeEach(async ({ page }) => {
    expenses = new ExpensesPage(page);
    await expenses.goto();
  });

  test('current month group is expanded by default', async () => {
    const label = expenses.currentMonthLabel();
    const group = expenses.monthGroup(label);
    // Only run assertion if the current month group exists in the list
    const count = await group.count();
    if (count === 0) return;
    await expect(expenses.monthGroupHeader(label)).toHaveAttribute('aria-expanded', 'true');
    await expect(expenses.monthGroupBody(label)).toBeVisible();
  });

  test('past month groups are collapsed by default', async () => {
    const currentLabel = expenses.currentMonthLabel();
    const allGroups = expenses.page.locator('.date-group');
    const total = await allGroups.count();
    for (let i = 0; i < total; i++) {
      const header = allGroups.nth(i).locator('.date-group-header');
      const text = await header.textContent();
      if (text?.includes(currentLabel)) continue;
      await expect(header).toHaveAttribute('aria-expanded', 'false');
      await expect(allGroups.nth(i).locator('.date-group-body')).toBeHidden();
    }
  });

  test('clicking a collapsed month header expands it', async () => {
    const currentLabel = expenses.currentMonthLabel();
    const allGroups = expenses.page.locator('.date-group');
    const total = await allGroups.count();
    let tested = false;
    for (let i = 0; i < total; i++) {
      const header = allGroups.nth(i).locator('.date-group-header');
      const text = await header.textContent();
      if (text?.includes(currentLabel)) continue;
      await header.click();
      await expect(header).toHaveAttribute('aria-expanded', 'true');
      await expect(allGroups.nth(i).locator('.date-group-body')).toBeVisible();
      tested = true;
      break;
    }
    if (!tested) test.skip(); // no past months in the DB
  });

  test('clicking an expanded month header collapses it', async () => {
    const label = expenses.currentMonthLabel();
    const group = expenses.monthGroup(label);
    const count = await group.count();
    if (count === 0) return;
    const header = expenses.monthGroupHeader(label);
    await header.click();
    await expect(header).toHaveAttribute('aria-expanded', 'false');
    await expect(expenses.monthGroupBody(label)).toBeHidden();
  });
});
