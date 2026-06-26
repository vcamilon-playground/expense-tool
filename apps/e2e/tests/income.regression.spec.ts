import { test, expect } from '@playwright/test';
import { IncomePage } from './pages/IncomePage';
import { IncomeHistoryPage } from './pages/IncomeHistoryPage';
import { ExpensesPage } from './pages/ExpensesPage';
import {
  cleanup,
  seed,
  E2E_INCOME_NAME,
  E2E_INCOME_NAME_2,
  E2E_MERCHANT,
} from './helpers/supabase';

test.describe('Income — CRUD', () => {
  let income!: IncomePage;

  test.beforeAll(async () => {
    await cleanup.incomeSources();
  });

  test.afterAll(async () => {
    await cleanup.incomeSources();
  });

  test.beforeEach(async ({ page }) => {
    income = new IncomePage(page);
    await income.goto();
    // Reveal amounts so balances can be asserted.
    if ((await income.privacyToggle().getAttribute('aria-label')) === 'Show amounts') {
      await income.privacyToggle().click();
    }
  });

  test('create, edit, and delete a bank source', async () => {
    // Create
    await income.addBankSource(E2E_INCOME_NAME, '1500');
    await expect(income.row(E2E_INCOME_NAME)).toBeVisible();
    await expect(income.row(E2E_INCOME_NAME)).toContainText('1,500.00');

    // Edit the balance
    await income.editButton(E2E_INCOME_NAME).click();
    await expect(income.dialog()).toBeVisible();
    await income.balanceInput().fill('2750');
    await income.dialog().getByRole('button', { name: 'Update' }).click();
    await expect(income.dialog()).toBeHidden();
    await expect(income.row(E2E_INCOME_NAME)).toContainText('2,750.00');

    // Delete
    await income.deleteRow(E2E_INCOME_NAME);
    await expect(income.row(E2E_INCOME_NAME)).toHaveCount(0);
  });
});

test.describe('Income — add money (top-up)', () => {
  let income!: IncomePage;

  test.beforeAll(async () => {
    await cleanup.incomeSources();
  });

  test.afterAll(async () => {
    await cleanup.incomeSources();
  });

  test('adding a valid amount increments the source row balance, section total, and grand total', async ({ page }) => {
    // Disposable seeded source — tagged E2E* so cleanup removes it.
    await seed.incomeSource(E2E_INCOME_NAME, 1000);

    income = new IncomePage(page);
    await income.goto();
    // Reveal amounts so balances render as pesos rather than the mask.
    if ((await income.privacyToggle().getAttribute('aria-label')) === 'Show amounts') {
      await income.privacyToggle().click();
    }

    await expect(income.row(E2E_INCOME_NAME)).toContainText('1,000.00');
    const grandBefore = await income.summaryValue('Grand Total').textContent();
    expect(grandBefore).toContain('1,000.00');

    // Modal renders with the source-specific title, the current balance, and
    // the "Add Money" submit button.
    await income.openAddMoney(E2E_INCOME_NAME);
    await expect(income.addMoneyDialog()).toContainText(`Add Money to ${E2E_INCOME_NAME}`);
    await expect(income.addMoneyDialog()).toContainText('Current balance: ₱1,000.00');
    await expect(income.addMoneySubmit()).toHaveText('Add Money');

    await income.addMoneyAmountInput().fill('250.50');
    await income.addMoneySubmit().click();
    await expect(income.addMoneyDialog()).toBeHidden();

    // 1000 + 250.50 = 1,250.50 on the row, the Bank Total, and the Grand Total.
    await expect(income.row(E2E_INCOME_NAME)).toContainText('1,250.50');
    await expect(income.summaryValue('Bank Total')).toContainText('1,250.50');
    await expect(income.summaryValue('Grand Total')).toContainText('1,250.50');

    // Cleanup the disposable source within the test.
    await income.deleteRow(E2E_INCOME_NAME);
    await expect(income.row(E2E_INCOME_NAME)).toHaveCount(0);
  });

  test('an invalid amount shows the inline error and does not change the balance', async ({ page }) => {
    await seed.incomeSource(E2E_INCOME_NAME, 500);

    income = new IncomePage(page);
    await income.goto();
    if ((await income.privacyToggle().getAttribute('aria-label')) === 'Show amounts') {
      await income.privacyToggle().click();
    }

    await expect(income.row(E2E_INCOME_NAME)).toContainText('500.00');

    // Empty submit → inline error, modal stays open, no write.
    await income.openAddMoney(E2E_INCOME_NAME);
    await income.addMoneySubmit().click();
    await expect(income.addMoneyError()).toHaveText('Enter a valid amount greater than zero.');
    await expect(income.addMoneyDialog()).toBeVisible();

    // Zero is also rejected.
    await income.addMoneyAmountInput().fill('0');
    await income.addMoneySubmit().click();
    await expect(income.addMoneyError()).toBeVisible();
    await expect(income.addMoneyDialog()).toBeVisible();

    // Close without saving and confirm the balance is untouched.
    await income.addMoneyDialog().getByRole('button', { name: 'Cancel' }).click();
    await expect(income.addMoneyDialog()).toBeHidden();
    await expect(income.row(E2E_INCOME_NAME)).toContainText('500.00');

    await income.deleteRow(E2E_INCOME_NAME);
    await expect(income.row(E2E_INCOME_NAME)).toHaveCount(0);
  });
});

test.describe('Income — transfer between sources', () => {
  let income!: IncomePage;

  test.beforeAll(async () => {
    await cleanup.incomeSources();
  });

  test.afterAll(async () => {
    await cleanup.incomeSources();
  });

  test('transferring moves the balance from one source to another', async ({ page }) => {
    const from = await seed.incomeSource(E2E_INCOME_NAME, 1000);
    await seed.incomeSource(E2E_INCOME_NAME_2, 200);

    income = new IncomePage(page);
    await income.goto();
    if ((await income.privacyToggle().getAttribute('aria-label')) === 'Show amounts') {
      await income.privacyToggle().click();
    }

    await income.openTransfer();
    await income.transferFromSelect().selectOption(from.id);
    await income.transferToSelect().selectOption({ label: `${E2E_INCOME_NAME_2} (₱200.00)` });
    await income.transferAmountInput().fill('400');
    await income.transferSubmit().click();
    await expect(income.transferDialog()).toBeHidden();

    // From: 1000 - 400 = 600 ; To: 200 + 400 = 600
    await expect(income.row(E2E_INCOME_NAME)).toContainText('600.00');
    await expect(income.row(E2E_INCOME_NAME_2)).toContainText('600.00');
  });

  test('transfer rejects an amount greater than the source balance', async ({ page }) => {
    const from = await seed.incomeSource(E2E_INCOME_NAME, 100);
    await seed.incomeSource(E2E_INCOME_NAME_2, 0);

    income = new IncomePage(page);
    await income.goto();

    await income.openTransfer();
    await income.transferFromSelect().selectOption(from.id);
    await income.transferToSelect().selectOption({ label: `${E2E_INCOME_NAME_2} (₱0.00)` });
    await income.transferAmountInput().fill('500');
    await income.transferSubmit().click();
    await expect(income.transferError()).toBeVisible();
    await expect(income.transferDialog()).toBeVisible();
  });
});

test.describe('Income — transaction history', () => {
  test.beforeAll(async () => {
    await cleanup.incomeTransactions();
    await cleanup.expenses();
    await cleanup.incomeSources();
  });

  test.afterAll(async () => {
    await cleanup.incomeTransactions();
    await cleanup.expenses();
    await cleanup.incomeSources();
  });

  // Clear leftover sources/expenses between tests so single-row locators stay
  // unambiguous. Transaction history rows are intentionally NOT cleared here —
  // they accumulate, which is exactly the newest-first / retention behaviour
  // under test.
  test.beforeEach(async () => {
    await cleanup.incomeSources();
    await cleanup.expenses();
  });

  test('an Add Money top-up appears as the newest row with a + amount', async ({ page }) => {
    await seed.incomeSource(E2E_INCOME_NAME, 500);

    const income = new IncomePage(page);
    await income.goto();
    await income.addMoney(E2E_INCOME_NAME, '75');

    const history = new IncomeHistoryPage(page);
    await history.goto();
    await history.revealAmounts();

    // Newest-first: the top-up is the first history row.
    const firstRow = history.rows().first();
    await expect(firstRow).toContainText('Add Money');
    await expect(firstRow).toContainText(E2E_INCOME_NAME);
    await expect(firstRow.locator('td').nth(3)).toHaveText(/\+.*75\.00/);
  });

  test('creating an expense with a deduct source logs a Deduction row with a − amount and the merchant note', async ({ page }) => {
    await seed.incomeSource(E2E_INCOME_NAME, 1000);

    const expenses = new ExpensesPage(page);
    await expenses.goto();
    await expenses.openAddModal();
    await expenses.fillForm({ amount: '40', merchant: E2E_MERCHANT, description: 'E2E deduct history test' });
    await expenses.selectDeductFrom(E2E_INCOME_NAME);
    await expenses.submitAdd();

    const history = new IncomeHistoryPage(page);
    await history.goto();
    await history.revealAmounts();

    const row = history.row(E2E_MERCHANT);
    await expect(row).toHaveCount(1);
    await expect(history.rowType(E2E_MERCHANT)).toHaveText('Deduction');
    await expect(history.rowSource(E2E_MERCHANT)).toHaveText(E2E_INCOME_NAME);
    await expect(history.rowAmount(E2E_MERCHANT)).toHaveText(/−.*40\.00/);
    await expect(history.rowDetails(E2E_MERCHANT)).toContainText(E2E_MERCHANT);

    // The − amount is rendered in the "bad" (red) colour.
    const color = await history.rowAmount(E2E_MERCHANT).evaluate((el) => window.getComputedStyle(el).color);
    expect(color).not.toBe('rgb(255, 255, 255)');
  });

  test('a transfer is a single row showing "From → To" with a − amount', async ({ page }) => {
    const from = await seed.incomeSource(E2E_INCOME_NAME, 1000);
    await seed.incomeSource(E2E_INCOME_NAME_2, 0);

    const income = new IncomePage(page);
    await income.goto();

    await income.openTransfer();
    await income.transferFromSelect().selectOption(from.id);
    await income.transferToSelect().selectOption({ label: `${E2E_INCOME_NAME_2} (₱0.00)` });
    await income.transferAmountInput().fill('120');
    await income.transferSubmit().click();
    await expect(income.transferDialog()).toBeHidden();

    const history = new IncomeHistoryPage(page);
    await history.goto();
    await history.revealAmounts();

    // Exactly ONE row for the whole transfer, Source column = "From → To".
    const arrow = `${E2E_INCOME_NAME} → ${E2E_INCOME_NAME_2}`;
    await expect(history.row(arrow)).toHaveCount(1);
    await expect(history.rowType(arrow)).toHaveText('Transfer');
    await expect(history.rowAmount(arrow)).toHaveText(/−.*120\.00/);
  });

  test('editing a source balance logs a Balance Edit row with "before → after" details', async ({ page }) => {
    await seed.incomeSource(E2E_INCOME_NAME, 300);

    const income = new IncomePage(page);
    await income.goto();

    await income.editButton(E2E_INCOME_NAME).click();
    await expect(income.dialog()).toBeVisible();
    await income.balanceInput().fill('450');
    await income.dialog().getByRole('button', { name: 'Update' }).click();
    await expect(income.dialog()).toBeHidden();

    const history = new IncomeHistoryPage(page);
    await history.goto();
    await history.revealAmounts();

    const editRow = history.rows().first();
    await expect(editRow).toContainText('Balance Edit');
    await expect(editRow).toContainText(E2E_INCOME_NAME);
    // before → after, increasing balance ⇒ + sign.
    await expect(editRow.locator('td').nth(4)).toHaveText(/₱300\.00.*→.*₱450\.00/);
    await expect(editRow.locator('td').nth(3)).toHaveText(/\+.*150\.00/);
  });

  test('history rows are retained after the source is deleted', async ({ page }) => {
    await seed.incomeSource(E2E_INCOME_NAME, 200);

    const income = new IncomePage(page);
    await income.goto();

    // Generate a history row, then delete the source.
    await income.addMoney(E2E_INCOME_NAME, '15');
    await income.deleteRow(E2E_INCOME_NAME);
    await expect(income.row(E2E_INCOME_NAME)).toHaveCount(0);

    // The snapshot source_label keeps the history row visible after deletion.
    const history = new IncomeHistoryPage(page);
    await history.goto();
    await expect(history.row(E2E_INCOME_NAME).first()).toBeVisible();
    await expect(history.row(E2E_INCOME_NAME).first()).toContainText('Add Money');
  });

  test('"Show archived" reveals rows older than 3 months', async ({ page }) => {
    const note = `E2E archived ${Date.now()}`;
    await seed.archivedIncomeTransaction(note);

    const history = new IncomeHistoryPage(page);
    await history.goto();

    // Hidden by default.
    await expect(history.row(note)).toHaveCount(0);

    // Revealed with the toggle, tagged "(archived)".
    await history.setShowArchived(true);
    await expect(history.row(note)).toHaveCount(1);
    await expect(history.row(note)).toContainText('(archived)');

    // Hidden again when unchecked.
    await history.setShowArchived(false);
    await expect(history.row(note)).toHaveCount(0);
  });

  test('transactions are grouped under a month heading', async ({ page }) => {
    await seed.incomeSource(E2E_INCOME_NAME, 100);

    const income = new IncomePage(page);
    await income.goto();
    await income.addMoney(E2E_INCOME_NAME, '20');

    const history = new IncomeHistoryPage(page);
    await history.goto();

    // The current-month group heading (e.g. "June 2026") wraps at least one row.
    const monthLabel = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
    await expect(history.monthHeadings().filter({ hasText: monthLabel })).toBeVisible();
    await expect(history.rows().first()).toBeVisible();
  });

  test('the amount privacy toggle masks and reveals history amounts', async ({ page }) => {
    await seed.incomeSource(E2E_INCOME_NAME, 100);

    const income = new IncomePage(page);
    await income.goto();
    await income.addMoney(E2E_INCOME_NAME, '88');

    const history = new IncomeHistoryPage(page);
    await history.goto();
    await history.revealAmounts();

    const row = history.rows().first();
    await expect(row.locator('td').nth(3)).toContainText('88.00');

    // Hide amounts → history amount becomes the mask.
    await history.privacyToggle().click();
    await expect(row.locator('td').nth(3)).toHaveText('+••••••');

    // Create an edit row, then confirm both sides of "before → after" mask
    // (the hidden preference persists across the navigation).
    await income.goto();
    await income.editButton(E2E_INCOME_NAME).click();
    await expect(income.dialog()).toBeVisible();
    await income.balanceInput().fill('999');
    await income.dialog().getByRole('button', { name: 'Update' }).click();
    await expect(income.dialog()).toBeHidden();

    await history.goto();
    const editRow = history.rows().first();
    await expect(editRow).toContainText('Balance Edit');
    await expect(editRow.locator('td').nth(4)).toHaveText('•••••• → ••••••');
  });
});

test.describe('Income — transaction history (no spurious rows)', () => {
  test.beforeAll(async () => {
    await cleanup.incomeTransactions();
    await cleanup.incomeSources();
  });

  test.afterAll(async () => {
    await cleanup.incomeTransactions();
    await cleanup.incomeSources();
  });

  // Each test seeds its own source; clear sources between them so the
  // single-row locators never match a leftover from a previous test.
  test.beforeEach(async () => {
    await cleanup.incomeSources();
  });

  test('a name-only edit does not create a history row', async ({ page }) => {
    await seed.incomeSource(E2E_INCOME_NAME, 250);

    const income = new IncomePage(page);
    const history = new IncomeHistoryPage(page);

    await history.goto();
    const before = await history.rows().count();

    // Change only the name (balance left untouched).
    await income.goto();
    await income.editButton(E2E_INCOME_NAME).click();
    await expect(income.dialog()).toBeVisible();
    await income.nameInput().fill(E2E_INCOME_NAME_2);
    await income.dialog().getByRole('button', { name: 'Update' }).click();
    await expect(income.dialog()).toBeHidden();
    await expect(income.row(E2E_INCOME_NAME_2)).toBeVisible();

    // No new history row was logged.
    await history.goto();
    await expect(history.rows()).toHaveCount(before);
  });

  test('a same-value balance edit does not create a history row', async ({ page }) => {
    await seed.incomeSource(E2E_INCOME_NAME, 250);

    const income = new IncomePage(page);
    const history = new IncomeHistoryPage(page);

    await history.goto();
    const before = await history.rows().count();

    // Re-enter the identical balance.
    await income.goto();
    await income.editButton(E2E_INCOME_NAME).click();
    await expect(income.dialog()).toBeVisible();
    await income.balanceInput().fill('250');
    await income.dialog().getByRole('button', { name: 'Update' }).click();
    await expect(income.dialog()).toBeHidden();

    await history.goto();
    await expect(history.rows()).toHaveCount(before);
  });
});
