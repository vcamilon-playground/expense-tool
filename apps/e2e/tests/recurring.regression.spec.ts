import { test, expect } from '@playwright/test';
import { E2E_RECURRING_NAME, E2E_INCOME_NAME, cleanup, seed } from './helpers/supabase';
import { ExpensesPage } from './pages/ExpensesPage';
import { IncomePage } from './pages/IncomePage';
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

test.describe('Recurring Expenses — pay now', () => {
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
    await expect(recurring.payNowButton(E2E_RECURRING_NAME)).toBeVisible();

    const chargeDateBefore = await recurring.chargeDateCell(E2E_RECURRING_NAME).textContent();

    await recurring.payNowButton(E2E_RECURRING_NAME).click();
    await expect(recurring.earlyPayModal()).toBeVisible();
    await recurring.earlyPayConfirmButton().click();
    await expect(recurring.earlyPayModal()).toBeHidden();

    // Wait for reload() to complete — date cell must no longer show the old date
    const dateCell = recurring.chargeDateCell(E2E_RECURRING_NAME);
    await expect(dateCell).not.toContainText(chargeDateBefore!);

    // Expense was created
    await expenses.goto();
    await expect(expenses.row(E2E_RECURRING_NAME)).toBeVisible();
  });
});

// ── FUNC-3 (full) + EDGE-1 + EXP-2: Confirm Payment records the ENTERED amount ──
test.describe('Recurring — variable Confirm Payment records the entered amount', () => {
  test.beforeAll(async () => {
    await cleanup.recurring();
    await cleanup.expenses();
  });

  test.afterEach(async () => {
    await cleanup.recurring();
    await cleanup.expenses();
  });

  test.afterAll(async () => {
    await cleanup.recurring();
    await cleanup.expenses();
  });

  test('the entered amount overrides the estimate and the charge date advances', async ({ page }) => {
    await seed.recurringVariable(500); // estimate 500, due today
    const recurring = new RecurringPage(page);
    const expenses = new ExpensesPage(page);

    await recurring.goto();
    await recurring.confirmPaymentButton(E2E_RECURRING_NAME).click();
    await expect(recurring.confirmModal()).toBeVisible();
    await recurring.confirmAmountInput().fill('750');
    await recurring.confirmYesButton().click();
    await expect(recurring.confirmModal()).toBeHidden();

    // Charge date advanced — due badge gone.
    await expect(recurring.dueBadge(E2E_RECURRING_NAME)).toHaveCount(0);

    // The created expense carries the entered 750, not the 500 estimate.
    await expenses.goto();
    await expect(expenses.row(E2E_RECURRING_NAME)).toBeVisible();
    await expect(expenses.row(E2E_RECURRING_NAME)).toContainText('750.00');
    await expect(expenses.row(E2E_RECURRING_NAME)).not.toContainText('500.00');
  });

  test('a two-decimal / large amount is recorded exactly', async ({ page }) => {
    await seed.recurringVariable(0); // no estimate, due today
    const recurring = new RecurringPage(page);
    const expenses = new ExpensesPage(page);

    await recurring.goto();
    await recurring.confirmPaymentButton(E2E_RECURRING_NAME).click();
    await recurring.confirmAmountInput().fill('1234.56');
    await recurring.confirmYesButton().click();
    await expect(recurring.confirmModal()).toBeHidden();
    // The modal closes optimistically; the due badge clears only after reload()
    // runs — i.e. once the createExpense write has committed.
    await expect(recurring.dueBadge(E2E_RECURRING_NAME)).toHaveCount(0);

    await expenses.goto();
    await expect(expenses.row(E2E_RECURRING_NAME)).toContainText('1,234.56');
  });

  test('a double-submit creates exactly one expense', async ({ page }) => {
    await seed.recurringVariable(500);
    const recurring = new RecurringPage(page);
    const expenses = new ExpensesPage(page);

    await recurring.goto();
    await recurring.confirmPaymentButton(E2E_RECURRING_NAME).click();
    await recurring.confirmAmountInput().fill('500');
    const yesButton = recurring.confirmYesButton();
    await yesButton.click();
    // A second click landing as the modal closes must not write a duplicate.
    await yesButton.click({ timeout: 1000 }).catch(() => {});
    await expect(recurring.confirmModal()).toBeHidden();
    // Wait for the write to settle (due badge clears on reload) before navigating.
    await expect(recurring.dueBadge(E2E_RECURRING_NAME)).toHaveCount(0);

    await expenses.goto();
    await expect(expenses.row(E2E_RECURRING_NAME)).toHaveCount(1);
  });
});

// ── FUNC-4 (full): Pay Now records the ENTERED amount ──
test.describe('Recurring — variable Pay Now records the entered amount', () => {
  test.beforeAll(async () => {
    await cleanup.recurring();
    await cleanup.expenses();
    await seed.recurringVariableFuture(14, 500);
  });

  test.afterAll(async () => {
    await cleanup.recurring();
    await cleanup.expenses();
  });

  test('the entered amount is recorded and the charge date advances', async ({ page }) => {
    const recurring = new RecurringPage(page);
    const expenses = new ExpensesPage(page);

    await recurring.goto();
    const chargeDateBefore = await recurring.chargeDateCell(E2E_RECURRING_NAME).textContent();

    await recurring.payNowButton(E2E_RECURRING_NAME).click();
    await expect(recurring.earlyPayModal()).toBeVisible();
    await recurring.earlyPayAmountInput().fill('620');
    await recurring.earlyPayConfirmButton().click();
    await expect(recurring.earlyPayModal()).toBeHidden();

    await expect(recurring.chargeDateCell(E2E_RECURRING_NAME)).not.toContainText(chargeDateBefore!);

    await expenses.goto();
    await expect(expenses.row(E2E_RECURRING_NAME)).toContainText('620.00');
  });
});

// ── FUNC-5: variable-no-estimate created blank, then paid with an entered amount ──
test.describe('Recurring — variable-no-estimate create then pay', () => {
  test.beforeAll(async () => {
    await cleanup.recurring();
    await cleanup.expenses();
  });

  test.afterAll(async () => {
    await cleanup.recurring();
    await cleanup.expenses();
  });

  test('creating with a blank estimate stores "Varies" and pay records the entered amount', async ({ page }) => {
    const recurring = new RecurringPage(page);
    const expenses = new ExpensesPage(page);

    await recurring.goto();

    // CREATE — variable, blank estimate.
    await recurring.openAddModal();
    await recurring.nameInput().fill(E2E_RECURRING_NAME);
    await recurring.setVariable(true);
    await recurring.submitAdd();
    await expect(recurring.amountCell(E2E_RECURRING_NAME)).toHaveText('Varies');

    // PAY — enter a concrete amount at pay time.
    await recurring.confirmPaymentButton(E2E_RECURRING_NAME).click();
    await recurring.confirmAmountInput().fill('310.50');
    await recurring.confirmYesButton().click();
    await expect(recurring.confirmModal()).toBeHidden();
    // Settle-wait: the due badge clears only after reload() commits the write.
    await expect(recurring.dueBadge(E2E_RECURRING_NAME)).toHaveCount(0);

    await expenses.goto();
    await expect(expenses.row(E2E_RECURRING_NAME)).toContainText('310.50');
  });
});

// ── FUNC-6: an income deduction on pay uses the ENTERED amount ──
test.describe('Recurring — variable pay deducts the entered amount from income', () => {
  test.beforeAll(async () => {
    await cleanup.recurring();
    await cleanup.expenses();
    await cleanup.incomeSources();
    await cleanup.incomeTransactions();
  });

  test.afterAll(async () => {
    await cleanup.recurring();
    await cleanup.expenses();
    await cleanup.incomeSources();
    await cleanup.incomeTransactions();
  });

  test('confirming with a deduct-from source reduces the balance by the entered amount', async ({ page }) => {
    await seed.incomeSource(E2E_INCOME_NAME, 1000);
    await seed.recurringVariable(500); // estimate 500, due today

    const recurring = new RecurringPage(page);
    const income = new IncomePage(page);

    await recurring.goto();
    await recurring.confirmPaymentButton(E2E_RECURRING_NAME).click();
    await expect(recurring.confirmModal()).toBeVisible();
    await recurring.confirmAmountInput().fill('300');
    // Deduct from the seeded bank source.
    await recurring.confirmModal().locator('select').selectOption({ label: E2E_INCOME_NAME });
    await recurring.confirmYesButton().click();
    await expect(recurring.confirmModal()).toBeHidden();
    // Settle-wait: the due badge clears only after reload() — by then the
    // createExpense + deductFromIncomeSource writes have committed.
    await expect(recurring.dueBadge(E2E_RECURRING_NAME)).toHaveCount(0);

    // Balance dropped by the entered 300 (1000 → 700), not the 500 estimate.
    await income.goto();
    // Reveal amounts so the balance renders as pesos rather than the mask.
    if ((await income.privacyToggle().getAttribute('aria-label')) === 'Show amounts') {
      await income.privacyToggle().click();
    }
    await expect(income.row(E2E_INCOME_NAME)).toContainText('700.00');
    await expect(income.row(E2E_INCOME_NAME)).not.toContainText('500.00');
  });
});

// ── FUNC-9: editing round-trips the variable flag ──
test.describe('Recurring — edit round-trips the variable flag', () => {
  test.beforeAll(async () => {
    await cleanup.recurring();
  });

  test.afterAll(async () => {
    await cleanup.recurring();
  });

  test('a variable item reopens as variable and can be switched back to fixed', async ({ page }) => {
    await seed.recurringVariable(0); // variable, no estimate
    const recurring = new RecurringPage(page);
    await recurring.goto();
    await expect(recurring.amountCell(E2E_RECURRING_NAME)).toHaveText('Varies');

    // Reopen the edit form — the variable flag persisted.
    await recurring.editRow(E2E_RECURRING_NAME);
    await expect(recurring.variableCheckbox()).toBeChecked();
    await expect(recurring.estimatedAmountLabel()).toBeVisible();

    // Switch to fixed with a concrete amount.
    await recurring.setVariable(false);
    await recurring.amountInput().fill('42');
    await recurring.submitEdit();

    const cell = recurring.amountCell(E2E_RECURRING_NAME);
    await expect(cell).toContainText('42.00');
    await expect(cell).not.toContainText('Varies');
    await expect(cell).not.toContainText('~');

    // And the fixed flag now persists on re-edit.
    await recurring.editRow(E2E_RECURRING_NAME);
    await expect(recurring.variableCheckbox()).not.toBeChecked();
  });
});
