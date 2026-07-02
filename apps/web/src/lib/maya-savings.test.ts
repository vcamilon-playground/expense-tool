import { describe, expect, it } from 'vitest';
import {
  MAYA_WEEKLY_INCREMENT,
  currentMayaWeek,
  formatMayaDate,
  initialDoneWeeks,
  mayaGoal,
  mayaSchedule,
  mayaTotals,
} from './maya-savings';

// Guarded index access — noUncheckedIndexedAccess types `arr[i]` as possibly
// undefined; this throws loudly instead so assertions stay on concrete rows.
function at<T>(arr: T[], i: number): T {
  const value = arr[i];
  if (value === undefined) throw new Error(`no element at index ${i}`);
  return value;
}

describe('mayaSchedule', () => {
  const schedule = mayaSchedule();

  it('starts on Fri 2026-01-09 with ₱100', () => {
    expect(at(schedule, 0)).toEqual({ week: 1, date: '2026-01-09', amount: 100, cumulative: 100 });
  });

  it('ends on the last Friday of 2026 (2026-12-25, week 51, ₱5100)', () => {
    expect(at(schedule, schedule.length - 1)).toEqual({ week: 51, date: '2026-12-25', amount: 5100, cumulative: 132600 });
    expect(schedule).toHaveLength(51);
  });

  it('every entry is a Friday, seven days apart', () => {
    for (const w of schedule) {
      const [y = 0, m = 1, d = 1] = w.date.split('-').map(Number);
      expect(new Date(y, m - 1, d).getDay()).toBe(5); // Friday
    }
  });

  it('increments the transfer by ₱100 each week', () => {
    expect(at(schedule, 1).amount - at(schedule, 0).amount).toBe(MAYA_WEEKLY_INCREMENT);
    expect(at(schedule, 24).amount).toBe(2500); // week 25
    expect(at(schedule, 25).amount).toBe(2600); // week 26
  });

  it('tracks a correct running cumulative', () => {
    expect(at(schedule, 24).cumulative).toBe(32500); // sum 100..2500
  });
});

describe('mayaGoal', () => {
  it('sums every weekly transfer to ₱132,600', () => {
    expect(mayaGoal(mayaSchedule())).toBe(132600);
  });
});

describe('initialDoneWeeks', () => {
  it('marks every Friday before today as done (₱100–₱2500 on 2026-07-02)', () => {
    const done = initialDoneWeeks(mayaSchedule(), new Date(2026, 6, 2));
    expect(done).toHaveLength(25);
    expect(done[done.length - 1]).toBe(25);
    expect(done).not.toContain(26); // this Friday (Jul 3) not yet transferred
  });

  it('is empty before the plan begins', () => {
    expect(initialDoneWeeks(mayaSchedule(), new Date(2026, 0, 1))).toEqual([]);
  });

  it('includes a Friday on the day itself', () => {
    const done = initialDoneWeeks(mayaSchedule(), new Date(2026, 0, 10)); // day after week 1
    expect(done).toContain(1);
  });
});

describe('currentMayaWeek', () => {
  it('returns this/next Friday', () => {
    expect(currentMayaWeek(mayaSchedule(), new Date(2026, 6, 2))?.week).toBe(26); // Jul 3
  });

  it('returns the same Friday when today is that Friday', () => {
    expect(currentMayaWeek(mayaSchedule(), new Date(2026, 0, 9))?.week).toBe(1);
  });

  it('falls back to the last week once the plan is over', () => {
    expect(currentMayaWeek(mayaSchedule(), new Date(2027, 0, 1))?.week).toBe(51);
  });
});

describe('mayaTotals', () => {
  const schedule = mayaSchedule();

  it('sums only the weeks marked done', () => {
    const totals = mayaTotals(schedule, new Set([1, 2, 3])); // 100 + 200 + 300
    expect(totals.saved).toBe(600);
    expect(totals.doneCount).toBe(3);
    expect(totals.goal).toBe(132600);
    expect(totals.remaining).toBe(132000);
    expect(totals.totalWeeks).toBe(51);
  });

  it('reports zero saved with nothing done', () => {
    const totals = mayaTotals(schedule, new Set());
    expect(totals.saved).toBe(0);
    expect(totals.remaining).toBe(132600);
  });
});

describe('formatMayaDate', () => {
  it('renders a readable Friday label', () => {
    expect(formatMayaDate('2026-01-09')).toBe('Fri, Jan 9, 2026');
  });
});
