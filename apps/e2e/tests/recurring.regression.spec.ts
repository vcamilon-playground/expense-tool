import { test, expect } from '@playwright/test';
import { E2E_MERCHANT, E2E_RECURRING_NAME, cleanup, seed } from './helpers/supabase';
import { ExpensesPage } from './pages/ExpensesPage';
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

test.describe('Recurring Expenses — confirm YES adds expense', () => {
  test.beforeAll(async () => {
    await cleanup.recurring();
    await cleanup.expenses();
    await seed.recurring(); // next_charge_date = today → due
  });

  test.afterAll(async () => {
    await cleanup.recurring();
    await cleanup.expenses();
  });

  test('confirming payment creates an expense record and advances the charge date', async ({ page }) => {
    const recurring = new RecurringPage(page);
    const expenses = new ExpensesPage(page);

    await recurring.goto();
    await expect(recurring.dueBadge(E2E_RECURRING_NAME)).toBeVisible();

    // Confirm payment — YES path
    await recurring.confirmPaymentButton(E2E_RECURRING_NAME).click();
    await expect(recurring.confirmModal()).toBeVisible();
    await recurring.confirmYesButton().click();
    await expect(recurring.confirmModal()).toBeHidden();

    // Due badge is gone — date was advanced
    await expect(recurring.dueBadge(E2E_RECURRING_NAME)).toHaveCount(0);

    // Expense appears in expenses page
    await expenses.goto();
    await expect(expenses.row(E2E_RECURRING_NAME)).toBeVisible();
  });
});

test.describe('Recurring Expenses — confirm NO skips expense', () => {
  test.beforeAll(async () => {
    await cleanup.recurring();
    await cleanup.expenses();
    await seed.recurring(); // next_charge_date = today → due
  });

  test.afterAll(async () => {
    await cleanup.recurring();
    await cleanup.expenses();
  });

  test('declining payment advances charge date without creating an expense record', async ({ page }) => {
    const recurring = new RecurringPage(page);
    const expenses = new ExpensesPage(page);

    await recurring.goto();
    await expect(recurring.dueBadge(E2E_RECURRING_NAME)).toBeVisible();

    // Confirm payment — NO path → reminder → OK
    await recurring.confirmPaymentButton(E2E_RECURRING_NAME).click();
    await recurring.confirmNoButton().click();
    await expect(recurring.reminderModal()).toBeVisible();
    await recurring.reminderOkButton().click();
    await expect(recurring.reminderModal()).toBeHidden();

    // Due badge is gone — date was advanced
    await expect(recurring.dueBadge(E2E_RECURRING_NAME)).toHaveCount(0);

    // No expense was created
    await expenses.goto();
    await expect(expenses.row(E2E_RECURRING_NAME)).toHaveCount(0);
  });
});

test.describe('Recurring Expenses — pay early', () => {
  test.beforeAll(async () => {
    await cleanup.recurring();
    await cleanup.expenses();
    await seed.recurringFuture(); // next_charge_date = 14 days from now → not yet due
  });

  test.afterAll(async () => {
    await cleanup.recurring();
    await cleanup.expenses();
  });

  test('recording early payment creates expense and advances charge date', async ({ page }) => {
    const recurring = new RecurringPage(page);
    const expenses = new ExpensesPage(page);

    await recurring.goto();

    // Confirm Payment button is absent — item is not yet due
    await expect(recurring.confirmPaymentButton(E2E_RECURRING_NAME)).toHaveCount(0);
    await expect(recurring.payEarlyButton(E2E_RECURRING_NAME)).toBeVisible();

    const chargeDateBefore = await recurring.row(E2E_RECURRING_NAME).locator('td').nth(3).textContent();

    await recurring.payEarlyButton(E2E_RECURRING_NAME).click();
    await expect(recurring.earlyPayModal()).toBeVisible();
    await recurring.earlyPayConfirmButton().click();
    await expect(recurring.earlyPayModal()).toBeHidden();

    // Wait for reload() to complete — date cell must no longer show the old date
    const dateCell = recurring.row(E2E_RECURRING_NAME).locator('td').nth(3);
    await expect(dateCell).not.toContainText(chargeDateBefore!);

    // Expense was created
    await expenses.goto();
    await expect(expenses.row(E2E_RECURRING_NAME)).toBeVisible();
  });
});
