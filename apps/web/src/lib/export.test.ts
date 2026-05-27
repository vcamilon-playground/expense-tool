import { describe, expect, it } from 'vitest';
import { buildSummaryRows, buildCategoryRows, buildExpenseRows, rowsToCSV } from './export';
import type { PeriodSummary, CategoryTotal, Expense, Category } from '@expense/shared';

const baseSummary: PeriodSummary = {
  period: 'month',
  from: '2026-05-01',
  to: '2026-05-31',
  total: 5000,
  count: 3,
  by_category: [],
};

describe('buildSummaryRows', () => {
  it('includes period, from, to, total, count, and average', () => {
    const rows = buildSummaryRows(baseSummary);
    const metrics = rows.map((r) => r.Metric);
    expect(metrics).toContain('Period');
    expect(metrics).toContain('From');
    expect(metrics).toContain('To');
    expect(metrics).toContain('Total (PHP)');
    expect(metrics).toContain('Expense Count');
    expect(metrics).toContain('Average (PHP)');
  });

  it('calculates average correctly', () => {
    const rows = buildSummaryRows(baseSummary);
    const avg = rows.find((r) => r.Metric === 'Average (PHP)');
    expect(avg?.Value).toBeCloseTo(5000 / 3);
  });

  it('returns 0 average when count is 0', () => {
    const rows = buildSummaryRows({ ...baseSummary, count: 0, total: 0 });
    const avg = rows.find((r) => r.Metric === 'Average (PHP)');
    expect(avg?.Value).toBe(0);
  });
});

describe('buildCategoryRows', () => {
  const cats: CategoryTotal[] = [
    { category_id: '1', category_name: 'Food', total: 3000, count: 2 },
    { category_id: '2', category_name: 'Transport', total: 1000, count: 1 },
  ];

  it('returns one row per category', () => {
    expect(buildCategoryRows(cats, 4000)).toHaveLength(2);
  });

  it('calculates percentage correctly', () => {
    const rows = buildCategoryRows(cats, 4000);
    expect(rows[0]!['%']).toBe('75%');
    expect(rows[1]!['%']).toBe('25%');
  });

  it('returns — when total is 0', () => {
    const rows = buildCategoryRows(cats, 0);
    expect(rows[0]!['%']).toBe('—');
  });
});

describe('buildExpenseRows', () => {
  const categories: Category[] = [
    { id: 'cat1', name: 'Food', icon: '🍔' },
  ];

  const expenses: Expense[] = [
    {
      id: 'e1',
      amount: 500,
      currency: 'PHP',
      conversion_rate: null,
      category_id: 'cat1',
      merchant: 'Jollibee',
      description: 'lunch',
      occurred_at: '2026-05-15',
      receipt_url: null,
      source: 'manual',
    },
    {
      id: 'e2',
      amount: 10,
      currency: 'USD',
      conversion_rate: 56,
      category_id: null,
      merchant: null,
      description: null,
      occurred_at: '2026-05-10',
      receipt_url: null,
      source: 'manual',
    },
  ];

  it('returns one row per expense', () => {
    expect(buildExpenseRows(expenses, categories)).toHaveLength(2);
  });

  it('maps category name from categories list', () => {
    const rows = buildExpenseRows(expenses, categories);
    const row = rows.find((r) => r.Merchant === 'Jollibee');
    expect(row?.Category).toBe('Food');
  });

  it('sets Category to Uncategorized when category_id is null', () => {
    const rows = buildExpenseRows(expenses, categories);
    const row = rows.find((r) => r.Merchant === '');
    expect(row?.Category).toBe('Uncategorized');
  });

  it('computes PHP Amount using conversion_rate', () => {
    const rows = buildExpenseRows(expenses, categories);
    const row = rows.find((r) => r.Currency === 'USD');
    expect(row?.['PHP Amount']).toBe(560);
  });

  it('uses amount directly when conversion_rate is null', () => {
    const rows = buildExpenseRows(expenses, categories);
    const row = rows.find((r) => r.Currency === 'PHP');
    expect(row?.['PHP Amount']).toBe(500);
  });

  it('sorts newest first', () => {
    const rows = buildExpenseRows(expenses, categories);
    expect(rows[0]!.Date).toBe('2026-05-15');
    expect(rows[1]!.Date).toBe('2026-05-10');
  });
});

describe('rowsToCSV', () => {
  it('returns empty string for empty array', () => {
    expect(rowsToCSV([])).toBe('');
  });

  it('includes header row', () => {
    const rows = [{ Name: 'Alice', Amount: 100 }];
    const csv = rowsToCSV(rows);
    expect(csv.split('\n')[0]).toBe('Name,Amount');
  });

  it('includes data row', () => {
    const rows = [{ Name: 'Alice', Amount: 100 }];
    const csv = rowsToCSV(rows);
    expect(csv.split('\n')[1]).toBe('Alice,100');
  });

  it('wraps values containing commas in quotes', () => {
    const rows = [{ Name: 'Hello, World', Amount: 1 }];
    const csv = rowsToCSV(rows);
    expect(csv).toContain('"Hello, World"');
  });

  it('escapes double-quotes inside quoted values', () => {
    const rows = [{ Name: 'Say "hi"', Amount: 1 }];
    const csv = rowsToCSV(rows);
    expect(csv).toContain('"Say ""hi"""');
  });
});
