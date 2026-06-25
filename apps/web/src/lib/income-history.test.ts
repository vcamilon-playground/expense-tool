import { describe, expect, it } from 'vitest';
import {
  ARCHIVE_AFTER_MONTHS,
  archiveCutoff,
  incomeSourceLabel,
  isArchived,
  transactionSign,
} from './income-history';

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
