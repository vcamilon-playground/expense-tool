import type { IncomeSnapshot } from '@expense/shared';
import type { TrendPoint } from './trends';

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * The Sunday that ends the current Mon–Sun week (ISO date). If today is Sunday it
 * returns today; otherwise the upcoming Sunday. Used to key the current week's
 * snapshot and to separate completed weeks (week_ending < this) from the in-progress one.
 */
export function currentWeekSunday(today: Date): string {
  const day = today.getDay(); // 0 = Sunday
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (day !== 0) d.setDate(d.getDate() + (7 - day));
  return toISO(d);
}

/** Short label for a week-ending Sunday, e.g. "Jul 20". */
function weekLabel(weekEnding: string): string {
  return new Date(`${weekEnding}T00:00:00`).toLocaleDateString('default', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Build the weekly income trend from grand-total snapshots: the most recent `weeks`
 * COMPLETED weeks (week_ending before the current week's Sunday), oldest first. Weeks
 * without a snapshot are simply absent (the series is shorter). Returns `TrendPoint`s
 * ({ label: Sunday date, total }) ready for the chart.
 */
export function incomeWeeklyTrend(
  snapshots: IncomeSnapshot[],
  weeks: number,
  today: Date = new Date(),
): TrendPoint[] {
  const cutoff = currentWeekSunday(today);
  return snapshots
    .filter((s) => s.week_ending < cutoff)
    .sort((a, b) => b.week_ending.localeCompare(a.week_ending))
    .slice(0, weeks)
    .reverse()
    .map((s) => ({ label: weekLabel(s.week_ending), total: Math.round(s.total) }));
}
