import { describe, expect, it } from 'vitest';
import type { Expense } from '@expense/shared';
import { buildInsightInput, currentMonth } from './prompts';

const MONTH = currentMonth(); // e.g. "2026-06"

function exp(
  occurred_at: string,
  amount: number,
  conversion_rate: number | null = null,
): Expense {
  return {
    id: occurred_at + amount + (conversion_rate ?? ''),
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

describe('buildInsightInput', () => {
  it('only includes expenses from the current calendar month', () => {
    const { thisMonth } = buildInsightInput([
      exp(`${MONTH}-05`, 100),
      exp('2000-01-01', 999),
    ]);
    expect(thisMonth).toHaveLength(1);
  });

  it('applies the overseas conversion rate so the total matches the dashboard (PHP)', () => {
    // 50 USD at rate 57 => 2850 PHP, plus a 100 PHP expense => 2950 PHP total.
    const { total, compact } = buildInsightInput([
      exp(`${MONTH}-10`, 50, 57),
      exp(`${MONTH}-11`, 100),
    ]);
    expect(total).toBe(2950);
    // Each line item is sent to the model already converted to PHP.
    expect(compact.map((c) => c.amount)).toEqual([2850, 100]);
    expect(compact.every((c) => c.currency === 'PHP')).toBe(true);
  });

  it('rounds the total to two decimals', () => {
    const { total } = buildInsightInput([exp(`${MONTH}-01`, 10.005, null)]);
    expect(total).toBe(10.01);
  });

  it('returns an empty month set when there are no current-month expenses', () => {
    const { thisMonth, total } = buildInsightInput([exp('1999-12-31', 500)]);
    expect(thisMonth).toHaveLength(0);
    expect(total).toBe(0);
  });
});
