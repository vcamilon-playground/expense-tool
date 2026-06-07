import { test, expect } from '@playwright/test';
import { IncomePage } from './pages/IncomePage';
import { cleanup, seed, E2E_INCOME_NAME, E2E_INCOME_NAME_2 } from './helpers/supabase';

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
