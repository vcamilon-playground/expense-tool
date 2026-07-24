// Date helpers for the Weekly Income Trend spec.
//
// These MIRROR the app's pure logic in apps/web/src/lib/income-trend.ts so the
// spec derives its reference dates the SAME way the app does — at run time,
// never as hardcoded calendar strings (which rot week-to-week). Keep this file
// in sync with income-trend.ts if that logic ever changes.

const pad = (n: number): string => String(n).padStart(2, '0');
const toISO = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * The Sunday that ends the current Mon–Sun week (ISO date). If today is Sunday it
 * returns today; otherwise the upcoming Sunday. Mirrors `currentWeekSunday` in
 * the app.
 * @param today - reference date (defaults to now)
 * @returns ISO date string of the current week's ending Sunday
 */
export function currentWeekSunday(today: Date = new Date()): string {
  const day = today.getDay(); // 0 = Sunday
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (day !== 0) d.setDate(d.getDate() + (7 - day));
  return toISO(d);
}

/**
 * The `count` most-recent COMPLETED week-ending Sundays (each strictly before the
 * current week's Sunday), returned OLDEST-FIRST to match the chart's x-axis order.
 * @param count - how many completed weeks to derive
 * @param today - reference date (defaults to now)
 * @returns ISO date strings, oldest first
 */
export function completedWeekSundays(count: number, today: Date = new Date()): string[] {
  const base = new Date(`${currentWeekSunday(today)}T00:00:00`);
  const weeks: string[] = [];
  for (let ago = count; ago >= 1; ago--) {
    const d = new Date(base);
    d.setDate(d.getDate() - 7 * ago);
    weeks.push(toISO(d));
  }
  return weeks;
}

/**
 * Short x-axis label for a week-ending Sunday, e.g. "Jul 20". Mirrors the app's
 * private `weekLabel` so the spec can assert the rendered tick text.
 * @param weekEnding - ISO date string of the week-ending Sunday
 * @returns the short "Mon D" label
 */
export function weekLabel(weekEnding: string): string {
  return new Date(`${weekEnding}T00:00:00`).toLocaleDateString('default', {
    month: 'short',
    day: 'numeric',
  });
}
