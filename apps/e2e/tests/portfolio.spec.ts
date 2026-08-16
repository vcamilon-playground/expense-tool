import { test, expect } from '@playwright/test';
import { PortfolioPage } from './pages/PortfolioPage';
import { cleanup, seed, debts } from './helpers/supabase';

// Mirror the app's currentYearMonth (apps/web/src/lib/portfolio.ts) so the
// "paid this month" value is derived at run time — never a hardcoded 'YYYY-MM'
// that would rot when the calendar rolls over.
function currentYearMonth(today: Date = new Date()): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

// The calendar month before `today`, as 'YYYY-MM' — a debt last paid then must
// render as unpaid this month (isDebtPaidThisMonth auto-resets on rollover).
function priorYearMonth(today: Date = new Date()): string {
  return currentYearMonth(new Date(today.getFullYear(), today.getMonth() - 1, 1));
}

// Fixed seeds whose derived installment counts are pinned by the amounts:
//   principal 10000 / payment 1000 → total 10; balance 6000 → remaining 6.
const PAYING_DEBT = 'E2E Car Loan'; // "6 of 10 months left"
const ZERO_DEBT = 'E2E Zero Payment'; // no monthly payment → no months-left, no button

test.describe('Portfolio — Debts installment months-left', () => {
  let portfolio!: PortfolioPage;

  test.beforeEach(async ({ page }) => {
    portfolio = new PortfolioPage(page);
    await cleanup.debts();
  });

  test.afterAll(async () => {
    await cleanup.debts();
  });

  // FUNC-1
  test('a paying debt shows "6 of 10 months left", a zero-payment debt shows none, and the header note is present', async () => {
    await seed.debt({ name: PAYING_DEBT, principal: 10000, balance: 6000, monthly_payment: 1000 });
    await seed.debt({ name: ZERO_DEBT, principal: 5000, balance: 3000, monthly_payment: 0 });
    await portfolio.goto();
    await portfolio.revealAmounts();

    await expect.soft(portfolio.rowDetail(PAYING_DEBT)).toContainText('6 of 10 months left');
    await expect.soft(portfolio.debtRow(ZERO_DEBT)).not.toContainText(/months? left/);
    await expect.soft(portfolio.markPaidButton(ZERO_DEBT)).toHaveCount(0);
    await expect.soft(portfolio.headerNote()).toContainText("doesn't change your net worth");
  });

  // EDGE-2 — installment boundaries, including the singular "month"
  test('boundaries render "0 of 5 months left" and the singular "1 of 1 month left"', async () => {
    await seed.debt({ name: 'E2E Boundary Zero', principal: 5000, balance: 0, monthly_payment: 1000 });
    await seed.debt({ name: 'E2E Boundary One', principal: 1000, balance: 500, monthly_payment: 1000 });
    await portfolio.goto();
    await portfolio.revealAmounts();

    await expect.soft(portfolio.rowDetail('E2E Boundary Zero')).toContainText('0 of 5 months left');
    await expect.soft(portfolio.rowDetail('E2E Boundary One')).toContainText('1 of 1 month left');
    // Singular: the one-month case must NOT read "months".
    await expect.soft(portfolio.rowDetail('E2E Boundary One')).not.toContainText('1 of 1 months left');
  });
});

test.describe('Portfolio — Debts mark paid status', () => {
  let portfolio!: PortfolioPage;

  test.beforeEach(async ({ page }) => {
    portfolio = new PortfolioPage(page);
    await cleanup.debts();
  });

  test.afterAll(async () => {
    await cleanup.debts();
  });

  // FUNC-2 — the mark → pill + Undo → mark cycle
  test('Mark paid shows the paid pill + Undo, and Undo returns to Mark paid', async () => {
    await seed.debt({ name: PAYING_DEBT, principal: 10000, balance: 6000, monthly_payment: 1000 });
    await portfolio.goto();

    await expect(portfolio.markPaidButton(PAYING_DEBT)).toBeVisible();
    await expect(portfolio.paidPill(PAYING_DEBT)).toHaveCount(0);

    await portfolio.markPaidButton(PAYING_DEBT).click();
    await expect(portfolio.paidPill(PAYING_DEBT)).toBeVisible();
    await expect(portfolio.paidPill(PAYING_DEBT)).toContainText('Paid this month');
    await expect(portfolio.undoButton(PAYING_DEBT)).toBeVisible();
    await expect(portfolio.markPaidButton(PAYING_DEBT)).toHaveCount(0);

    await portfolio.undoButton(PAYING_DEBT).click();
    await expect(portfolio.markPaidButton(PAYING_DEBT)).toBeVisible();
    await expect(portfolio.paidPill(PAYING_DEBT)).toHaveCount(0);
    await expect(portfolio.undoButton(PAYING_DEBT)).toHaveCount(0);
  });

  // FUNC-2 (negative) — no monthly payment means no paid toggle at all
  test('a zero-payment debt exposes no Mark paid or Undo control', async () => {
    await seed.debt({ name: ZERO_DEBT, principal: 5000, balance: 3000, monthly_payment: 0 });
    await portfolio.goto();

    await expect(portfolio.debtRow(ZERO_DEBT)).toBeVisible();
    await expect(portfolio.markPaidButton(ZERO_DEBT)).toHaveCount(0);
    await expect(portfolio.undoButton(ZERO_DEBT)).toHaveCount(0);
  });

  // EDGE-1 — a prior-month stamp auto-resets to unpaid for the current month
  test('a debt paid in a prior month renders as unpaid (Mark paid shown, no pill)', async () => {
    await seed.debt({
      name: PAYING_DEBT,
      principal: 10000,
      balance: 6000,
      monthly_payment: 1000,
      last_paid_month: priorYearMonth(),
    });
    await portfolio.goto();

    await expect(portfolio.markPaidButton(PAYING_DEBT)).toBeVisible();
    await expect(portfolio.paidPill(PAYING_DEBT)).toHaveCount(0);
  });

  // EXP-1 — rapid double activation settles on one paid state and persists
  test('double-click settles on a single paid state that persists across reload, and Undo+reload returns to Mark paid', async () => {
    await seed.debt({ name: PAYING_DEBT, principal: 10000, balance: 6000, monthly_payment: 1000 });
    await portfolio.goto();

    await portfolio.markPaidButton(PAYING_DEBT).dblclick();
    // Settles on exactly one paid state: the pill, with the Mark paid button gone.
    await expect(portfolio.paidPill(PAYING_DEBT)).toBeVisible();
    await expect(portfolio.markPaidButton(PAYING_DEBT)).toHaveCount(0);

    // Persists across a full reload, and the DB holds the current month.
    await portfolio.goto();
    await expect(portfolio.paidPill(PAYING_DEBT)).toBeVisible();
    expect((await debts.forName(PAYING_DEBT))[0]?.last_paid_month).toBe(currentYearMonth());

    // Undo, then reload → back to the unmarked Mark paid state.
    await portfolio.undoButton(PAYING_DEBT).click();
    await portfolio.goto();
    await expect(portfolio.markPaidButton(PAYING_DEBT)).toBeVisible();
    await expect(portfolio.paidPill(PAYING_DEBT)).toHaveCount(0);
    expect((await debts.forName(PAYING_DEBT))[0]?.last_paid_month).toBeNull();
  });
});

test.describe('Portfolio — Mark paid net-worth neutrality', () => {
  let portfolio!: PortfolioPage;

  test.beforeEach(async ({ page }) => {
    portfolio = new PortfolioPage(page);
    await cleanup.debts();
  });

  test.afterAll(async () => {
    await cleanup.debts();
  });

  // FUNC-3 — Mark paid is a pure status flag: it moves no money
  test('Mark paid leaves Net Worth, Total Owed, "… remaining", and the debt balance byte-for-byte unchanged', async () => {
    await seed.debt({ name: PAYING_DEBT, principal: 10000, balance: 6000, monthly_payment: 1000 });
    await portfolio.goto();
    await portfolio.revealAmounts();

    const netBefore = await portfolio.netWorthValue().textContent();
    const owedBefore = await portfolio.totalOwedValue().textContent();
    const remainingBefore = await portfolio.debtsRemaining().textContent();
    const balanceBefore = (await debts.forName(PAYING_DEBT))[0]?.balance;

    await portfolio.markPaidButton(PAYING_DEBT).click();
    await expect(portfolio.paidPill(PAYING_DEBT)).toBeVisible();

    expect.soft(await portfolio.netWorthValue().textContent(), 'Net Worth changed after Mark paid').toBe(netBefore);
    expect.soft(await portfolio.totalOwedValue().textContent(), 'Total Owed changed after Mark paid').toBe(owedBefore);
    expect.soft(await portfolio.debtsRemaining().textContent(), '"… remaining" changed after Mark paid').toBe(remainingBefore);
    expect.soft((await debts.forName(PAYING_DEBT))[0]?.balance, 'debt balance changed after Mark paid').toBe(balanceBefore);
  });
});
