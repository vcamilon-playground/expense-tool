import { describe, expect, it } from 'vitest';
import type { IncomeTransaction } from '@expense/shared';
import {
  ARCHIVE_AFTER_MONTHS,
  DELETE_AFTER_MONTHS,
  archiveCutoff,
  deleteCutoff,
  groupTransactionsByMonth,
  incomeSourceLabel,
  isArchived,
  transactionSign,
} from './income-history';

function tx(id: string, created_at: string): IncomeTransaction {
  return {
    id,
    user_id: 'u1',
    source_id: 's1',
    source_label: 'GCash',
    counterparty_id: null,
    counterparty_label: null,
    kind: 'add',
    amount: 1,
    balance_before: 0,
    balance_after: 1,
    note: null,
    archived: false,
    created_at,
  };
}

describe('incomeSourceLabel', () => {
  it('always labels cash as Cash on Hand, ignoring stored name/brand', () => {
    expect(incomeSourceLabel({ type: 'cash', name: null, brand: null })).toBe('Cash on Hand');
    expect(incomeSourceLabel({ type: 'cash', name: 'Wallet', brand: 'X' })).toBe('Cash on Hand');
  });

  it('prefers the display name, then brand, then a type fallback', () => {
    expect(incomeSourceLabel({ type: 'bank', name: 'Payroll', brand: 'BPI' })).toBe('Payroll');
    expect(incomeSourceLabel({ type: 'bank', name: null, brand: 'BPI' })).toBe('BPI');
    expect(incomeSourceLabel({ type: 'bank', name: '', brand: '' })).toBe('Bank');
    expect(incomeSourceLabel({ type: 'ewallet', name: null, brand: null })).toBe('E-Wallet');
  });
});

describe('archiveCutoff / isArchived', () => {
  const now = new Date('2026-06-25T12:00:00Z');

  it('puts the cutoff exactly ARCHIVE_AFTER_MONTHS months back', () => {
    const cutoff = archiveCutoff(now);
    expect(cutoff.getFullYear()).toBe(2026);
    expect(cutoff.getMonth()).toBe(now.getMonth() - ARCHIVE_AFTER_MONTHS);
  });

  it('archives transactions older than the cutoff but keeps recent ones', () => {
    expect(isArchived('2026-01-01T00:00:00Z', now)).toBe(true); // ~6 months old
    expect(isArchived('2026-06-01T00:00:00Z', now)).toBe(false); // within 3 months
    expect(isArchived('2026-06-25T11:00:00Z', now)).toBe(false); // an hour ago
  });

  it('treats exactly-3-months-old as not yet archived (boundary is strict <)', () => {
    expect(isArchived(archiveCutoff(now), now)).toBe(false);
  });
});

describe('deleteCutoff', () => {
  const now = new Date('2026-06-25T12:00:00Z');

  it('puts the delete cutoff DELETE_AFTER_MONTHS months back, older than archive', () => {
    const del = deleteCutoff(now);
    const expected = new Date(now);
    expected.setMonth(expected.getMonth() - DELETE_AFTER_MONTHS);
    expect(del.getTime()).toBe(expected.getTime());
    // delete cutoff is strictly older than the archive cutoff
    expect(del.getTime()).toBeLessThan(archiveCutoff(now).getTime());
    expect(DELETE_AFTER_MONTHS).toBeGreaterThan(ARCHIVE_AFTER_MONTHS);
  });
});

describe('groupTransactionsByMonth', () => {
  it('buckets transactions by calendar month, newest month first', () => {
    const groups = groupTransactionsByMonth([
      tx('a', '2026-06-20T10:00:00Z'),
      tx('b', '2026-06-02T10:00:00Z'),
      tx('c', '2026-05-28T10:00:00Z'),
      tx('d', '2026-03-15T10:00:00Z'),
    ]);
    expect(groups.map((g) => g.key)).toEqual(['2026-06', '2026-05', '2026-03']);
    expect(groups.map((g) => g.transactions.map((t) => t.id))).toEqual([['a', 'b'], ['c'], ['d']]);
    expect(groups.every((g) => /2026/.test(g.label))).toBe(true);
  });

  it('returns an empty array for no transactions', () => {
    expect(groupTransactionsByMonth([])).toEqual([]);
  });

  it('preserves the input (newest-first) order within a month', () => {
    const groups = groupTransactionsByMonth([
      tx('newer', '2026-06-20T10:00:00Z'),
      tx('older', '2026-06-19T10:00:00Z'),
    ]);
    expect(groups.map((g) => g.transactions.map((t) => t.id))).toEqual([['newer', 'older']]);
  });
});

describe('transactionSign', () => {
  it('is negative for deductions and transfers, positive for adds', () => {
    expect(transactionSign('deduct', 100, 80)).toBe(-1);
    expect(transactionSign('transfer', 100, 80)).toBe(-1);
    expect(transactionSign('add', 80, 100)).toBe(1);
  });

  it('derives edit direction from the balance delta', () => {
    expect(transactionSign('edit', 100, 150)).toBe(1);
    expect(transactionSign('edit', 100, 50)).toBe(-1);
    expect(transactionSign('edit', 100, 100)).toBe(0);
    expect(transactionSign('edit', null, 100)).toBe(0);
  });
});
