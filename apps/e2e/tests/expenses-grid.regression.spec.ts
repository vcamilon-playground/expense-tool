import { test, expect } from '@playwright/test';
import { E2E_MERCHANT, cleanup, seed } from './helpers/supabase';
import { ExpensesPage } from './pages/ExpensesPage';

const RECEIPT_MERCHANT = `${E2E_MERCHANT}-RECEIPT`;
const OVERSEAS_MERCHANT = `${E2E_MERCHANT}-USD`;

test.describe('Expenses Grid — card rendering', () => {
  test.beforeAll(async () => {
    await cleanup.expenses();
    await seed.receiptExpense(RECEIPT_MERCHANT);
    await seed.overseasExpense(OVERSEAS_MERCHANT);
  });

  test.afterAll(async () => {
    await cleanup.expenses();
  });

  test.beforeEach(async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.goto();
  });

  test('a card renders category, amount, merchant and description fields', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.openGrid();

    const card = expenses.gridCard(RECEIPT_MERCHANT);
    await expect(card).toBeVisible();
    // No category was set on the seed → "Uncategorized" muted label.
    await expect(expenses.gridCardCategory(RECEIPT_MERCHANT)).toHaveText('Uncategorized');
    await expect(expenses.gridCardAmount(RECEIPT_MERCHANT)).toContainText('250');
    await expect(expenses.gridCardMeta(RECEIPT_MERCHANT)).toContainText(RECEIPT_MERCHANT);
    await expect(expenses.gridCardDescription(RECEIPT_MERCHANT)).toContainText('E2E grid receipt pill test');
  });

  test('a receipt-sourced expense shows the green receipt pill', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.openGrid();
    const pill = expenses.gridCardReceiptPill(RECEIPT_MERCHANT);
    await expect(pill).toHaveText('receipt');
    // The .ok pill must not render fg=bg (invisible) — assert a real colour.
    const color = await pill.evaluate((el) => window.getComputedStyle(el).color);
    expect(color).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('a manual expense shows no receipt pill', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.openGrid();
    await expect(expenses.gridCardReceiptPill(OVERSEAS_MERCHANT)).toHaveCount(0);
  });

  test('an overseas expense shows the approximate PHP conversion', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.openGrid();
    const amount = expenses.gridCardAmount(OVERSEAS_MERCHANT);
    // 10 USD × 56 = 560 PHP.
    await expect(amount).toContainText('≈');
    await expect(amount).toContainText('560');
  });
});

test.describe('Expenses Grid — search and filter', () => {
  test.beforeAll(async () => {
    await cleanup.expenses();
    await seed.receiptExpense(RECEIPT_MERCHANT);
    await seed.overseasExpense(OVERSEAS_MERCHANT);
  });

  test.afterAll(async () => {
    await cleanup.expenses();
  });

  test('search narrows the grid to matching cards', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.goto();
    await expenses.openGrid();
    await expect(expenses.gridCard(RECEIPT_MERCHANT)).toBeVisible();

    await expenses.searchInput().fill(RECEIPT_MERCHANT);
    await expect(expenses.gridCard(RECEIPT_MERCHANT)).toBeVisible();
    await expect(expenses.gridCard(OVERSEAS_MERCHANT)).toHaveCount(0);
  });

  test('a search that matches nothing shows the no-match message, not the grid empty state', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.goto();
    await expenses.openGrid();
    await expenses.searchInput().fill('zzznomatch999');
    await expect(page.getByText('No expenses match your search.')).toBeVisible();
    await expect(page.getByText('No expenses yet.')).toHaveCount(0);
    await expect(expenses.grid()).toHaveCount(0);
  });
});

test.describe('Expenses Grid — edit and delete from a card', () => {
  test.beforeAll(async () => {
    await cleanup.expenses();
    await seed.receiptExpense(RECEIPT_MERCHANT);
  });

  test.afterAll(async () => {
    await cleanup.expenses();
  });

  test('Edit on a card opens the Edit Expense modal and saves changes', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.goto();
    await expenses.openGrid();

    await expenses.editGridCard(RECEIPT_MERCHANT);
    await expenses.fillDescription('E2E grid edited description');
    await expenses.submitEdit();

    await expect(expenses.gridCardDescription(RECEIPT_MERCHANT)).toContainText('E2E grid edited description');
  });

  test('Delete on a card confirms and removes the card', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.goto();
    await expenses.openGrid();

    await expect(expenses.gridCard(RECEIPT_MERCHANT)).toBeVisible();
    await expenses.deleteGridCard(RECEIPT_MERCHANT);
    await expect(expenses.gridCard(RECEIPT_MERCHANT)).toHaveCount(0);
  });
});

test.describe('Expenses Grid — Load More pagination', () => {
  const SEED_COUNT = 25; // > PAGE_SIZE (20): one Load More click reveals the rest

  test.beforeAll(async () => {
    await cleanup.expenses();
    await seed.manyExpenses(SEED_COUNT);
  });

  test.afterAll(async () => {
    await cleanup.expenses();
  });

  test('shows one page of 20 cards with a visible Load More button', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.goto();
    await expenses.openGrid();

    await expect(expenses.gridCards()).toHaveCount(20);
    await expect(expenses.gridLoadMoreButton()).toBeVisible();
    await expect(expenses.gridLoadMoreButton()).toContainText(`${SEED_COUNT - 20} more`);
  });

  test('clicking Load More reveals the remaining cards and hides the button', async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.goto();
    await expenses.openGrid();

    await expect(expenses.gridCards()).toHaveCount(20);
    await expenses.gridLoadMoreButton().click();

    await expect(expenses.gridCards()).toHaveCount(SEED_COUNT);
    await expect(expenses.gridLoadMoreButton()).toHaveCount(0);
  });
});

test.describe('Expenses Grid — past-month lock (allow-past-edit disabled)', () => {
  test.beforeAll(async () => {
    await cleanup.expenses();
    await seed.pastExpense();
  });

  test.afterAll(async () => {
    await cleanup.expenses();
  });

  test('a past-month card shows the lock icon and no Edit or Delete buttons', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('allow-past-edit'));
    const expenses = new ExpensesPage(page);
    await expenses.goto();
    await expenses.openGrid();
    await expect(expenses.gridCardLockIcon(E2E_MERCHANT)).toBeVisible();
    await expect(expenses.gridCardEditButton(E2E_MERCHANT)).toHaveCount(0);
    await expect(expenses.gridCardDeleteButton(E2E_MERCHANT)).toHaveCount(0);
  });
});

test.describe('Expenses Grid — past-month lock (allow-past-edit enabled)', () => {
  test.beforeAll(async () => {
    await cleanup.expenses();
    await seed.pastExpense();
  });

  test.afterAll(async () => {
    await cleanup.expenses();
  });

  test('a past-month card shows Edit and Delete when allow-past-edit is on', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('allow-past-edit', 'true'));
    const expenses = new ExpensesPage(page);
    await expenses.goto();
    await expenses.openGrid();
    await expect(expenses.gridCardEditButton(E2E_MERCHANT)).toBeVisible();
    await expect(expenses.gridCardDeleteButton(E2E_MERCHANT)).toBeVisible();
    await expect(expenses.gridCardLockIcon(E2E_MERCHANT)).toHaveCount(0);
  });
});
