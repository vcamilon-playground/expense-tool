import type { Budget, Category, Expense } from './types';

export type ReportPeriod = 'day' | 'week' | 'month' | 'year' | 'custom';

export type CategoryTotal = {
  category_id: string | null;
  category_name: string;
  total: number;
  count: number;
};

export type PeriodSummary = {
  period: ReportPeriod;
  from: string;
  to: string;
  total: number;
  count: number;
  by_category: CategoryTotal[];
};

export type BudgetStatus = {
  category_id: string | null;
  category_name: string;
  limit: number;
  spent: number;
  remaining: number;
  pct_used: number;
  status: 'ok' | 'warning' | 'over';
};

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function periodBounds(
  period: ReportPeriod,
  ref = new Date(),
  rolling = false,
): { from: string; to: string } {
  const d = new Date(ref);

  if (!rolling) {
    if (period === 'day') {
      return { from: toISO(d), to: toISO(d) };
    }
    if (period === 'week') {
      const day = d.getDay(); // 0=Sun
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((day + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { from: toISO(monday), to: toISO(sunday) };
    }
    if (period === 'month') {
      const from = new Date(d.getFullYear(), d.getMonth(), 1);
      const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return { from: toISO(from), to: toISO(to) };
    }
    const from = new Date(d.getFullYear(), 0, 1);
    const to = new Date(d.getFullYear(), 11, 31);
    return { from: toISO(from), to: toISO(to) };
  }

  // Rolling windows: period ends on ref date
  const to = toISO(d);
  if (period === 'day') return { from: to, to };

  const from = new Date(d);
  const origDay = d.getDate();
  if (period === 'week') {
    from.setDate(origDay - 7);
  } else if (period === 'month') {
    from.setMonth(d.getMonth() - 1);
    if (from.getDate() !== origDay) from.setDate(0); // clamp: e.g. Mar 31 → Feb 28
  } else {
    from.setFullYear(d.getFullYear() - 1);
    if (from.getDate() !== origDay) from.setDate(0); // clamp: Feb 29 → Feb 28 non-leap
  }
  return { from: toISO(from), to };
}

export function inRange(expense: Expense, from: string, to: string): boolean {
  return expense.occurred_at >= from && expense.occurred_at <= to;
}

function buildPeriodSummary(
  expenses: Expense[],
  categories: Category[],
  period: ReportPeriod,
  from: string,
  to: string,
): PeriodSummary {
  const scoped = expenses.filter((e) => inRange(e, from, to));
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const phpAmount = (e: Expense) => e.conversion_rate ? e.amount * e.conversion_rate : e.amount;

  const buckets = new Map<string, CategoryTotal>();
  for (const e of scoped) {
    const key = e.category_id ?? '__none__';
    const name = e.category_id ? catMap.get(e.category_id) ?? 'Unknown' : 'Uncategorized';
    const existing = buckets.get(key);
    if (existing) {
      existing.total += phpAmount(e);
      existing.count += 1;
    } else {
      buckets.set(key, {
        category_id: e.category_id,
        category_name: name,
        total: phpAmount(e),
        count: 1,
      });
    }
  }

  const by_category = Array.from(buckets.values()).sort((a, b) => b.total - a.total);
  const total = scoped.reduce((sum, e) => sum + phpAmount(e), 0);
  return { period, from, to, total, count: scoped.length, by_category };
}

export function summarize(
  expenses: Expense[],
  categories: Category[],
  period: ReportPeriod,
  ref = new Date(),
  rolling = false,
): PeriodSummary {
  const { from, to } = periodBounds(period, ref, rolling);
  return buildPeriodSummary(expenses, categories, period, from, to);
}

export function summarizeRange(
  expenses: Expense[],
  categories: Category[],
  from: string,
  to: string,
): PeriodSummary {
  return buildPeriodSummary(expenses, categories, 'custom', from, to);
}

function deriveStatus(spent: number, limit: number): BudgetStatus {
  const remaining = limit - spent;
  const pct_used = limit > 0 ? spent / limit : 0;
  const status: BudgetStatus['status'] = spent > limit ? 'over' : pct_used >= 0.80 ? 'warning' : 'ok';
  return { category_id: null, category_name: '', limit, spent, remaining, pct_used, status };
}

export function budgetStatus(
  expenses: Expense[],
  categories: Category[],
  budgets: Budget[],
  ref = new Date(),
): BudgetStatus[] {
  const month = summarize(expenses, categories, 'month', ref);
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const spentByCat = new Map(month.by_category.map((c) => [c.category_id ?? '__none__', c.total]));

  const categoryBudgets = budgets.filter((b) => b.category_id !== null);

  const perCategory: BudgetStatus[] = categoryBudgets.map((b) => ({
    ...deriveStatus(spentByCat.get(b.category_id as string) ?? 0, b.monthly_limit),
    category_id: b.category_id,
    category_name: catMap.get(b.category_id as string) ?? 'Unknown',
  }));

  const overallLimit = categoryBudgets.reduce((sum, b) => sum + b.monthly_limit, 0);
  if (overallLimit <= 0) return perCategory;

  const overall: BudgetStatus = {
    ...deriveStatus(month.total, overallLimit),
    category_id: null,
    category_name: 'Overall',
  };
  return [overall, ...perCategory];
}

export function formatMoney(n: number, currency = 'PHP'): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}
