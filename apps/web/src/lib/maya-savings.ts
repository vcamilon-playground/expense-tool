// Pure logic for the Maya weekly savings tracker.
//
// The plan is deterministic: the first transfer of ₱100 happened on Friday
// 2026-01-09, and every following Friday the amount grows by ₱100 (₱200, ₱300,
// …). The schedule runs through the last Friday of MAYA_END_YEAR. The only
// stateful part — which weeks have actually been transferred — is tracked by the
// user via manual "Done" toggles, persisted per-user in the `maya_savings` table
// so it syncs across devices (see db.ts getMayaSavings/ensureMayaSavings/
// setMayaSavingsWeeks).

// First Friday of the plan (₱100).
export const MAYA_START_YEAR = 2026;
export const MAYA_START_MONTH = 1; // January (1-based)
export const MAYA_START_DAY = 9;

// The plan runs through the last Friday of this year.
export const MAYA_END_YEAR = 2026;

// Each Friday the transfer grows by this amount over the previous one.
export const MAYA_WEEKLY_INCREMENT = 100;

export type MayaWeek = {
  week: number; // 1-based; week N transfers N * MAYA_WEEKLY_INCREMENT
  date: string; // Friday, ISO yyyy-mm-dd (local calendar date)
  amount: number; // the transfer due that Friday
  cumulative: number; // running total transferred through this week
};

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// The full weekly schedule from the first Friday through the last Friday of
// MAYA_END_YEAR. Deterministic — depends only on the constants above.
export function mayaSchedule(): MayaWeek[] {
  const weeks: MayaWeek[] = [];
  const cursor = new Date(MAYA_START_YEAR, MAYA_START_MONTH - 1, MAYA_START_DAY);
  let cumulative = 0;
  let week = 1;
  while (cursor.getFullYear() <= MAYA_END_YEAR) {
    const amount = week * MAYA_WEEKLY_INCREMENT;
    cumulative += amount;
    weeks.push({ week, date: toISODate(cursor), amount, cumulative });
    cursor.setDate(cursor.getDate() + 7);
    week += 1;
  }
  return weeks;
}

// The total value of the whole plan (sum of every Friday's transfer).
export function mayaGoal(schedule: MayaWeek[]): number {
  return schedule.reduce((sum, w) => sum + w.amount, 0);
}

export type MayaTotals = {
  goal: number; // full-plan target
  saved: number; // sum of transfers marked done
  remaining: number; // goal - saved (never negative)
  doneCount: number;
  totalWeeks: number;
};

export function mayaTotals(schedule: MayaWeek[], doneWeeks: Set<number>): MayaTotals {
  const goal = mayaGoal(schedule);
  const saved = schedule
    .filter((w) => doneWeeks.has(w.week))
    .reduce((sum, w) => sum + w.amount, 0);
  return {
    goal,
    saved,
    remaining: Math.max(0, goal - saved),
    doneCount: schedule.filter((w) => doneWeeks.has(w.week)).length,
    totalWeeks: schedule.length,
  };
}

// Weeks already transferred at first load: every Friday strictly before today.
// (The user has transferred ₱100 through ₱2500; today's / upcoming Friday is not
// yet done and stays unchecked until the user marks it.) Used only to seed the
// localStorage state the first time the tracker is opened.
export function initialDoneWeeks(schedule: MayaWeek[], today: Date): number[] {
  const todayISO = toISODate(today);
  return schedule.filter((w) => w.date < todayISO).map((w) => w.week);
}

// The week whose Friday is today or the next upcoming Friday — the row to
// highlight as "this week". Falls back to the final week once the plan is over.
export function currentMayaWeek(schedule: MayaWeek[], today: Date): MayaWeek | null {
  const last = schedule[schedule.length - 1];
  if (!last) return null;
  const todayISO = toISODate(today);
  return schedule.find((w) => w.date >= todayISO) ?? last;
}

// Format a Friday ISO date as e.g. "Fri, Jan 9, 2026" for display.
export function formatMayaDate(iso: string): string {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
