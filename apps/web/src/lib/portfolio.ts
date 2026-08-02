import type { Debt, DebtKind, Investment, InvestmentType } from '@expense/shared';

// Pure calculations for the Portfolio page. Nothing here touches the DB: gain /
// loss, payoff progress, and net worth are always derived from the stored
// principal / current_value / balance so a stale computed column can never drift
// out of sync with the numbers the user typed in.

export const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  fund: 'Fund',
  stocks: 'Stocks',
  crypto: 'Crypto',
  savings: 'Savings',
  retirement: 'Retirement',
  other: 'Other',
};

export const DEBT_KIND_LABELS: Record<DebtKind, string> = {
  credit_card: 'Credit card',
  loan: 'Loan',
  personal: 'Personal',
  installment: 'Installment',
  other: 'Other',
};

export type GainLoss = {
  amount: number; // current_value - principal (negative = loss)
  percent: number; // relative to principal; 0 when nothing was invested
};

export function investmentGain(investment: Pick<Investment, 'principal' | 'current_value'>): GainLoss {
  const amount = investment.current_value - investment.principal;
  return {
    amount,
    percent: investment.principal > 0 ? (amount / investment.principal) * 100 : 0,
  };
}

export type InvestmentTotals = {
  principal: number;
  currentValue: number;
  gain: GainLoss;
};

export function investmentTotals(investments: Investment[]): InvestmentTotals {
  const principal = investments.reduce((sum, i) => sum + i.principal, 0);
  const currentValue = investments.reduce((sum, i) => sum + i.current_value, 0);
  const amount = currentValue - principal;
  return {
    principal,
    currentValue,
    gain: { amount, percent: principal > 0 ? (amount / principal) * 100 : 0 },
  };
}

// How much of the original amount has been paid off, 0-100. A debt whose
// balance somehow exceeds its principal (interest capitalised, bad data) clamps
// to 0 rather than reporting negative progress.
export function debtPaidPercent(debt: Pick<Debt, 'principal' | 'balance'>): number {
  if (debt.principal <= 0) return 0;
  const paid = debt.principal - debt.balance;
  return Math.min(100, Math.max(0, (paid / debt.principal) * 100));
}

export function debtPaidAmount(debt: Pick<Debt, 'principal' | 'balance'>): number {
  return Math.max(0, debt.principal - debt.balance);
}

export type DebtTotals = {
  balance: number; // total still owed
  monthlyPayment: number; // total due each month
  originalPrincipal: number;
};

export function debtTotals(debts: Debt[]): DebtTotals {
  return {
    balance: debts.reduce((sum, d) => sum + d.balance, 0),
    monthlyPayment: debts.reduce((sum, d) => sum + d.monthly_payment, 0),
    originalPrincipal: debts.reduce((sum, d) => sum + d.principal, 0),
  };
}

// Net worth = cash on hand across every income source + what the investments
// are worth today - what is still owed. Can legitimately be negative.
export function netWorth(cash: number, investmentValue: number, debtBalance: number): number {
  return cash + investmentValue - debtBalance;
}

// Orders debts by the day of the month they fall due so the soonest payment
// leads. Debts without a due day sort last, then alphabetically by name.
export function sortDebtsByDueDay(debts: Debt[]): Debt[] {
  return [...debts].sort((a, b) => {
    if (a.due_day === null && b.due_day === null) return a.name.localeCompare(b.name);
    if (a.due_day === null) return 1;
    if (b.due_day === null) return -1;
    if (a.due_day !== b.due_day) return a.due_day - b.due_day;
    return a.name.localeCompare(b.name);
  });
}

// "on the 5th" / "on the 21st" — ordinal suffix for the due-day label.
export function ordinalDay(day: number): string {
  const remainderTen = day % 10;
  const remainderHundred = day % 100;
  if (remainderTen === 1 && remainderHundred !== 11) return `${day}st`;
  if (remainderTen === 2 && remainderHundred !== 12) return `${day}nd`;
  if (remainderTen === 3 && remainderHundred !== 13) return `${day}rd`;
  return `${day}th`;
}
