import type { Budget, Expense, RecurringExpense } from './types';
import { advanceDate } from './recurring';

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function phpAmount(e: Expense): number {
  return e.conversion_rate ? e.amount * e.conversion_rate : e.amount;
}

/**
 * Computed overall monthly budget = sum of every per-category budget limit.
 * Legacy null-category ("overall") budgets are ignored, matching budgetStatus.
 */
export function overallMonthlyBudget(budgets: Budget[]): number {
  return budgets
    .filter((b) => b.category_id !== null)
    .reduce((sum, b) => sum + b.monthly_limit, 0);
}

/**
 * Every recurring charge scheduled within [fromISO, toISO] (inclusive),
 * expanded across the window by cadence. One entry per occurrence.
 */
export function recurringChargesInRange(
  recurring: RecurringExpense[],
  fromISO: string,
  toISO: string,
): { date: string; amount: number }[] {
  const out: { date: string; amount: number }[] = [];
  for (const r of recurring) {
    if (!r.active) continue;
    let date = r.next_charge_date;
    let guard = 0;
    // Skip occurrences that fall before the window (e.g. a stale next_charge_date).
    while (date < fromISO && guard < 1000) {
      date = advanceDate(date, r.cadence);
      guard += 1;
    }
    while (date <= toISO && guard < 1000) {
      if (date >= fromISO) out.push({ date, amount: r.amount });
      date = advanceDate(date, r.cadence);
      guard += 1;
    }
  }
  return out;
}

export type MonthProjectionPoint = {
  day: number;
  actual: number | null; // cumulative actual spend through this day (null after today)
  projected: number | null; // projected cumulative (null before today; today bridges both)
};

export type MonthProjection = {
  points: MonthProjectionPoint[];
  budget: number; // computed overall monthly budget (0 when none set)
  spentSoFar: number;
  projectedTotal: number; // run-rate projection of the full month
  daysElapsed: number;
  daysInMonth: number;
};

/**
 * Chart 1 — cumulative spend month-to-date plus a run-rate projection to
 * month-end. The variable daily rate excludes recurring-source spend; the
 * remaining scheduled recurring charges are added back explicitly so they are
 * counted once, not twice.
 */
export function monthProjection(
  expenses: Expense[],
  recurring: RecurringExpense[],
  budgets: Budget[],
  ref = new Date(),
): MonthProjection {
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = Math.min(ref.getDate(), daysInMonth);
  const monthPrefix = `${year}-${pad(month + 1)}-`;

  const perDay = new Array<number>(daysInMonth + 1).fill(0);
  let variableSoFar = 0;
  for (const e of expenses) {
    if (!e.occurred_at.startsWith(monthPrefix)) continue;
    const d = Number(e.occurred_at.slice(8, 10));
    if (d < 1 || d > daysInMonth) continue;
    perDay[d] = (perDay[d] ?? 0) + phpAmount(e);
    if (d <= today && e.source !== 'recurring') variableSoFar += phpAmount(e);
  }

  let spentSoFar = 0;
  for (let d = 1; d <= today; d++) spentSoFar += perDay[d] ?? 0;

  const variableRate = today > 0 ? variableSoFar / today : 0;

  const recByDay = new Array<number>(daysInMonth + 1).fill(0);
  if (today < daysInMonth) {
    const from = toISO(new Date(year, month, today + 1));
    const to = toISO(new Date(year, month, daysInMonth));
    for (const c of recurringChargesInRange(recurring, from, to)) {
      const d = Number(c.date.slice(8, 10));
      if (d >= 1 && d <= daysInMonth) recByDay[d] = (recByDay[d] ?? 0) + c.amount;
    }
  }

  const points: MonthProjectionPoint[] = [];
  let actualCum = 0;
  let projCum = spentSoFar;
  for (let d = 1; d <= daysInMonth; d++) {
    let actual: number | null = null;
    let projected: number | null = null;
    if (d <= today) {
      actualCum += perDay[d] ?? 0;
      actual = Math.round(actualCum);
      if (d === today) projected = Math.round(projCum); // bridge to the dashed line
    } else {
      projCum += variableRate + (recByDay[d] ?? 0);
      projected = Math.round(projCum);
    }
    points.push({ day: d, actual, projected });
  }

  return {
    points,
    budget: overallMonthlyBudget(budgets),
    spentSoFar: Math.round(spentSoFar),
    projectedTotal: Math.round(projCum),
    daysElapsed: today,
    daysInMonth,
  };
}

export type OutlookPoint = {
  month: string; // e.g. "Aug 26"
  actual: number | null; // completed past months
  committed: number | null; // recurring floor of a projected month
  variable: number | null; // projected spend above the committed floor
};

function monthTotal(expenses: Expense[], year: number, month: number): number {
  const prefix = `${year}-${pad(month + 1)}-`;
  return expenses
    .filter((e) => e.occurred_at.startsWith(prefix))
    .reduce((sum, e) => sum + phpAmount(e), 0);
}

/**
 * Chart 2 — recent actual months continuing into projected months. The current
 * month uses the run-rate projection; future months use the trailing average
 * with a floor of their committed recurring charges. Projected bars split into
 * a committed (recurring) portion and a variable portion.
 */
export function spendOutlook(
  expenses: Expense[],
  recurring: RecurringExpense[],
  budgets: Budget[],
  ref = new Date(),
  pastMonths = 3,
  futureMonths = 3,
): { points: OutlookPoint[]; budget: number } {
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const label = (y: number, m: number) =>
    new Date(y, m, 1).toLocaleString('default', { month: 'short', year: '2-digit' });

  const points: OutlookPoint[] = [];

  // Past completed months (oldest first), and the trailing average over those
  // months that actually had spend.
  const pastTotals: number[] = [];
  for (let i = pastMonths; i >= 1; i--) {
    const d = new Date(year, month - i, 1);
    const total = monthTotal(expenses, d.getFullYear(), d.getMonth());
    pastTotals.push(total);
    points.push({ month: label(d.getFullYear(), d.getMonth()), actual: Math.round(total), committed: null, variable: null });
  }
  const withSpend = pastTotals.filter((t) => t > 0);
  const trailingAvg = withSpend.length > 0 ? withSpend.reduce((a, b) => a + b, 0) / withSpend.length : 0;

  const committedForMonth = (y: number, m: number): number => {
    const from = toISO(new Date(y, m, 1));
    const to = toISO(new Date(y, m + 1, 0));
    return recurringChargesInRange(recurring, from, to).reduce((sum, c) => sum + c.amount, 0);
  };

  // Current month (run-rate) then future months (trailing average, recurring floor).
  for (let i = 0; i < futureMonths; i++) {
    const d = new Date(year, month + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const projected =
      i === 0
        ? monthProjection(expenses, recurring, budgets, ref).projectedTotal
        : Math.max(trailingAvg, committedForMonth(y, m));
    const committed = Math.min(committedForMonth(y, m), projected);
    points.push({
      month: label(y, m),
      actual: null,
      committed: Math.round(committed),
      variable: Math.round(Math.max(0, projected - committed)),
    });
  }

  return { points, budget: overallMonthlyBudget(budgets) };
}
