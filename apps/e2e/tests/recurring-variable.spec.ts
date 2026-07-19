import { test, expect } from '@playwright/test';
import { E2E_RECURRING_NAME, cleanup, seed } from './helpers/supabase';
import { RecurringPage } from './pages/RecurringPage';
import { ExpensesPage } from './pages/ExpensesPage';

// ── FUNC-1: the "Variable amount" checkbox toggles the amount requirement ──
test.describe('Recurring — variable amount form toggle & validation', () => {
  let recurring!: RecurringPage;

  test.beforeEach(async ({ page }) => {
    recurring = new RecurringPage(page);
    await recurring.goto();
    await recurring.openAddModal();
  });

  test('variable checkbox is present and unchecked by default', async () => {
    await expect(recurring.variableCheckbox()).toBeVisible();
    await expect(recurring.variableCheckbox()).not.toBeChecked();
    await expect(recurring.fixedAmountLabel()).toBeVisible();
    await expect(recurring.amountInput()).toHaveJSProperty('required', true);
  });

  test('enabling variable relabels the amount field and drops the required flag', async () => {
    await recurring.setVariable(true);
    await expect(recurring.estimatedAmountLabel()).toBeVisible();
    await expect(recurring.fixedAmountLabel()).toHaveCount(0);
    await expect(recurring.amountInput()).toHaveJSProperty('required', false);
  });

  test('disabling variable restores the required Amount label', async () => {
    await recurring.setVariable(true);
    await expect(recurring.estimatedAmountLabel()).toBeVisible();
    await recurring.setVariable(false);
    await expect(recurring.fixedAmountLabel()).toBeVisible();
    await expect(recurring.amountInput()).toHaveJSProperty('required', true);
  });

  test('fixed mode with a blank amount shows "Amount is required" inline', async () => {
    await recurring.nameInput().fill('Fixed No Amount');
    await recurring.dialog().getByRole('button', { name: 'Add Recurring' }).click();
    await expect(recurring.dialog()).toBeVisible();
    await expect(recurring.amountError()).toHaveText('Amount is required');
  });

  test('variable mode with a negative estimate shows "Estimate cannot be negative" inline', async () => {
    await recurring.nameInput().fill('Variable Negative');
    await recurring.setVariable(true);
    await recurring.amountInput().fill('-5');
    await recurring.dialog().getByRole('button', { name: 'Add Recurring' }).click();
    await expect(recurring.dialog()).toBeVisible();
    await expect(recurring.amountError()).toHaveText('Estimate cannot be negative');
  });
});

// ── FUNC-2: the Amount table cell renders ₱X / ~₱X / Varies ──
test.describe('Recurring — variable amount table labels', () => {
  let recurring!: RecurringPage;

  test.beforeEach(async ({ page }) => {
    await cleanup.recurring();
    recurring = new RecurringPage(page);
  });

  test.afterAll(async () => {
    await cleanup.recurring();
  });

  test('a fixed recurring shows the formatted money amount (no tilde, not "Varies")', async () => {
    await seed.recurring(); // fixed, amount 1
    await recurring.goto();
    const cell = recurring.amountCell(E2E_RECURRING_NAME);
    await expect(cell).toContainText('1.00');
    await expect(cell).not.toContainText('~');
    await expect(cell).not.toContainText('Varies');
  });

  test('a variable recurring with an estimate shows "~<money>"', async () => {
    await seed.recurringVariable(500);
    await recurring.goto();
    const cell = recurring.amountCell(E2E_RECURRING_NAME);
    await expect(cell).toContainText('~');
    await expect(cell).toContainText('500.00');
  });

  test('a variable recurring without an estimate shows "Varies"', async () => {
    await seed.recurringVariable(0);
    await recurring.goto();
    await expect(recurring.amountCell(E2E_RECURRING_NAME)).toHaveText('Varies');
  });
});

// ── FUNC-3 / FUNC-5 (render) + EDGE-2: Confirm Payment "Amount paid" field ──
test.describe('Recurring — Confirm Payment amount field', () => {
  let recurring!: RecurringPage;

  test.beforeEach(async ({ page }) => {
    await cleanup.recurring();
    recurring = new RecurringPage(page);
  });

  test.afterAll(async () => {
    await cleanup.recurring();
  });

  test('the Amount paid field is prefilled with the stored estimate', async () => {
    await seed.recurringVariable(500);
    await recurring.goto();
    await recurring.confirmPaymentButton(E2E_RECURRING_NAME).click();
    await expect(recurring.confirmModal()).toBeVisible();
    await expect(recurring.confirmAmountInput()).toHaveValue('500');
  });

  test('a variable-no-estimate item opens with a blank Amount paid field', async () => {
    await seed.recurringVariable(0);
    await recurring.goto();
    await recurring.confirmPaymentButton(E2E_RECURRING_NAME).click();
    await expect(recurring.confirmModal()).toBeVisible();
    await expect(recurring.confirmAmountInput()).toHaveValue('');
  });

  test('submitting a blank amount is rejected and keeps the item due', async () => {
    await seed.recurringVariable(0);
    await recurring.goto();
    await recurring.confirmPaymentButton(E2E_RECURRING_NAME).click();
    await recurring.confirmAmountInput().fill('');
    await recurring.confirmYesButton().click();
    await expect(recurring.confirmAmountError()).toHaveText('Enter a valid amount');
    await expect(recurring.confirmModal()).toBeVisible();
    await expect(recurring.dueBadge(E2E_RECURRING_NAME)).toBeVisible();
  });

  test('reopening the modal re-prefills the stored estimate and discards edits', async () => {
    await seed.recurringVariable(500);
    await recurring.goto();
    await recurring.confirmPaymentButton(E2E_RECURRING_NAME).click();
    await recurring.confirmAmountInput().fill('999');
    await recurring.confirmModal().getByRole('button', { name: 'Close' }).click();
    await expect(recurring.confirmModal()).toBeHidden();

    await recurring.confirmPaymentButton(E2E_RECURRING_NAME).click();
    await expect(recurring.confirmAmountInput()).toHaveValue('500');
  });
});

// ── FUNC-4 (render): Pay Now (early) "Amount paid" field ──
test.describe('Recurring — Pay Now amount field', () => {
  let recurring!: RecurringPage;

  test.beforeEach(async ({ page }) => {
    await cleanup.recurring();
    recurring = new RecurringPage(page);
  });

  test.afterAll(async () => {
    await cleanup.recurring();
  });

  test('the Amount paid field is prefilled with the stored estimate', async () => {
    await seed.recurringVariableFuture(14, 500);
    await recurring.goto();
    await recurring.payNowButton(E2E_RECURRING_NAME).click();
    await expect(recurring.earlyPayModal()).toBeVisible();
    await expect(recurring.earlyPayAmountInput()).toHaveValue('500');
  });

  test('submitting a blank amount is rejected and keeps the modal open', async () => {
    await seed.recurringVariableFuture(14, 0);
    await recurring.goto();
    await recurring.payNowButton(E2E_RECURRING_NAME).click();
    await recurring.earlyPayAmountInput().fill('');
    await recurring.earlyPayConfirmButton().click();
    await expect(recurring.earlyPayAmountError()).toHaveText('Enter a valid amount');
    await expect(recurring.earlyPayModal()).toBeVisible();
  });
});

// ── EXP-1: reload mid-flow writes nothing; mobile renders "Varies" ──
test.describe('Recurring — variable exploratory (reload mid-flow)', () => {
  let recurring!: RecurringPage;
  let expenses!: ExpensesPage;

  test.beforeEach(async ({ page }) => {
    await cleanup.recurring();
    await cleanup.expenses();
    recurring = new RecurringPage(page);
    expenses = new ExpensesPage(page);
  });

  test.afterAll(async () => {
    await cleanup.recurring();
    await cleanup.expenses();
  });

  test('reloading with the Confirm Payment modal open writes no expense and leaves the item due', async () => {
    await seed.recurringVariable(0);
    await recurring.goto();
    await recurring.confirmPaymentButton(E2E_RECURRING_NAME).click();
    await expect(recurring.confirmModal()).toBeVisible();

    // Reload mid-flow (re-navigation = fresh page load).
    await recurring.goto();

    // No phantom write, and the charge date has not advanced.
    await expect(recurring.confirmModal()).toBeHidden();
    await expect(recurring.dueBadge(E2E_RECURRING_NAME)).toBeVisible();

    await expenses.goto();
    await expect(expenses.row(E2E_RECURRING_NAME)).toHaveCount(0);
  });
});

test.describe('Recurring — variable amount on mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  let recurring!: RecurringPage;

  test.beforeEach(async ({ page }) => {
    await cleanup.recurring();
    recurring = new RecurringPage(page);
  });

  test.afterAll(async () => {
    await cleanup.recurring();
  });

  test('a variable-no-estimate item renders "Varies" in the amount cell at mobile width', async () => {
    await seed.recurringVariable(0);
    await recurring.goto();
    await expect(recurring.amountCell(E2E_RECURRING_NAME)).toHaveText('Varies');
  });
});
