import type { Expense } from '@expense/shared';

export type TrendPoint = { label: string; total: number };

function phpAmount(e: Expense): number {
  return e.conversion_rate ? e.amount * e.conversion_rate : e.amount;
}

function localKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Total spend per day for the last `days` days, oldest first (ending today). */
export function dailyTrend(expenses: Expense[], days: number, today: Date = new Date()): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = localKey(d);
    const total = expenses
      .filter((e) => e.occurred_at === key)
      .reduce((sum, e) => sum + phpAmount(e), 0);
    points.push({ label: d.toLocaleDateString('default', { weekday: 'short' }), total: Math.round(total) });
  }
  return points;
}

/** Total spend per rolling 7-day week for the last `weeks` weeks, oldest first (ending today). */
export function weeklyTrend(expenses: Expense[], weeks: number, today: Date = new Date()): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(today);
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const startKey = localKey(start);
    const endKey = localKey(end);
    const total = expenses
      .filter((e) => e.occurred_at >= startKey && e.occurred_at <= endKey)
      .reduce((sum, e) => sum + phpAmount(e), 0);
    points.push({ label: start.toLocaleDateString('default', { month: 'short', day: 'numeric' }), total: Math.round(total) });
  }
  return points;
}
