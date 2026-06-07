import { describe, expect, it } from 'vitest';
import type { Expense } from '@expense/shared';
import { dailyTrend, weeklyTrend } from './trends';

function exp(occurred_at: string, amount: number, conversion_rate: number | null = null): Expense {
  return {
    id: occurred_at + amount,
    amount,
    currency: conversion_rate ? 'USD' : 'PHP',
    conversion_rate,
    category_id: null,
    merchant: null,
    description: null,
    occurred_at,
    receipt_url: null,
    source: 'manual',
  };
}

const TODAY = new Date(2026, 5, 7); // 2026-06-07 (local)

describe('dailyTrend', () => {
  it('returns one point per day, oldest first, ending today', () => {
    const points = dailyTrend([], 7, TODAY);
    expect(points).toHaveLength(7);
  });

  it('sums expenses on the matching day', () => {
    const points = dailyTrend([exp('2026-06-07', 100), exp('2026-06-07', 50), exp('2026-06-05', 10)], 7, TODAY);
    expect(points.at(-1)?.total).toBe(150); // today
    expect(points.at(-3)?.total).toBe(10); // two days ago
  });

  it('uses the PHP-equivalent for foreign-currency expenses', () => {
    const points = dailyTrend([exp('2026-06-07', 10, 56)], 7, TODAY);
    expect(points.at(-1)?.total).toBe(560);
  });

  it('ignores expenses outside the window', () => {
    const points = dailyTrend([exp('2026-05-01', 999)], 7, TODAY);
    expect(points.every((p) => p.total === 0)).toBe(true);
  });
});

describe('weeklyTrend', () => {
  it('returns one point per week, oldest first', () => {
    expect(weeklyTrend([], 5, TODAY)).toHaveLength(5);
  });

  it('buckets expenses into the correct rolling 7-day week', () => {
    // This week (Jun 1–7) and last week (May 25–31)
    const points = weeklyTrend([exp('2026-06-07', 100), exp('2026-06-01', 20), exp('2026-05-28', 5)], 5, TODAY);
    expect(points.at(-1)?.total).toBe(120); // current week
    expect(points.at(-2)?.total).toBe(5); // previous week
  });
});
