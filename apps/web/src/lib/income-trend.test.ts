import { describe, expect, it } from 'vitest';
import type { IncomeSnapshot } from '@expense/shared';
import { currentWeekSunday, incomeWeeklyTrend } from './income-trend';

const snap = (week_ending: string, total: number): IncomeSnapshot => ({
  id: week_ending,
  week_ending,
  total,
});

describe('currentWeekSunday', () => {
  it('returns the upcoming Sunday for a mid-week day', () => {
    // 2026-07-22 is a Wednesday → week ends Sunday 2026-07-26.
    expect(currentWeekSunday(new Date('2026-07-22T12:00:00'))).toBe('2026-07-26');
  });

  it('returns the same day when today is Sunday', () => {
    // 2026-07-26 is a Sunday.
    expect(currentWeekSunday(new Date('2026-07-26T12:00:00'))).toBe('2026-07-26');
  });

  it('returns the next day when today is Saturday', () => {
    // 2026-07-25 is a Saturday → Sunday 2026-07-26.
    expect(currentWeekSunday(new Date('2026-07-25T12:00:00'))).toBe('2026-07-26');
  });

  it('returns +6 when today is Monday', () => {
    // 2026-07-20 is a Monday → Sunday 2026-07-26.
    expect(currentWeekSunday(new Date('2026-07-20T12:00:00'))).toBe('2026-07-26');
  });
});

describe('incomeWeeklyTrend', () => {
  const today = new Date('2026-07-22T12:00:00'); // Wed; current week ends 2026-07-26

  it('includes only completed weeks (excludes the current in-progress week)', () => {
    const points = incomeWeeklyTrend(
      [snap('2026-07-26', 999), snap('2026-07-19', 500), snap('2026-07-12', 400)],
      6,
      today,
    );
    expect(points.map((p) => p.total)).toEqual([400, 500]); // 07-26 excluded
  });

  it('orders oldest first and caps at the requested number of weeks', () => {
    const points = incomeWeeklyTrend(
      [
        snap('2026-07-19', 6),
        snap('2026-07-12', 5),
        snap('2026-07-05', 4),
        snap('2026-06-28', 3),
        snap('2026-06-21', 2),
        snap('2026-06-14', 1),
        snap('2026-06-07', 0),
      ],
      6,
      today,
    );
    expect(points.map((p) => p.total)).toEqual([1, 2, 3, 4, 5, 6]); // last 6, oldest first
  });

  it('handles fewer snapshots than requested (gaps just shorten the series)', () => {
    const points = incomeWeeklyTrend([snap('2026-07-19', 500)], 6, today);
    expect(points).toHaveLength(1);
    expect(points[0]!.total).toBe(500);
  });

  it('returns an empty series when there are no completed-week snapshots', () => {
    expect(incomeWeeklyTrend([snap('2026-07-26', 999)], 6, today)).toEqual([]);
    expect(incomeWeeklyTrend([], 6, today)).toEqual([]);
  });

  it('rounds totals and labels by the Sunday date', () => {
    const points = incomeWeeklyTrend([snap('2026-07-19', 1234.56)], 6, today);
    expect(points[0]!.total).toBe(1235);
    expect(points[0]!.label).toBe('Jul 19');
  });
});
