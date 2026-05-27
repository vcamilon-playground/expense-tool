import { describe, expect, it } from 'vitest';
import { advanceDate } from './recurring';

describe('advanceDate — weekly', () => {
  it('advances by 7 days', () => {
    expect(advanceDate('2026-01-01', 'weekly')).toBe('2026-01-08');
  });

  it('crosses a month boundary', () => {
    expect(advanceDate('2026-01-28', 'weekly')).toBe('2026-02-04');
  });

  it('crosses a year boundary', () => {
    expect(advanceDate('2026-12-29', 'weekly')).toBe('2027-01-05');
  });
});

describe('advanceDate — monthly', () => {
  it('advances by one month on a normal date', () => {
    expect(advanceDate('2026-03-15', 'monthly')).toBe('2026-04-15');
  });

  it('crosses a year boundary', () => {
    expect(advanceDate('2026-12-15', 'monthly')).toBe('2027-01-15');
  });

  it('clamps Jan 31 to Feb 28, not Mar 3', () => {
    expect(advanceDate('2026-01-31', 'monthly')).toBe('2026-02-28');
  });

  it('clamps Jan 31 to Feb 29 on a leap year', () => {
    expect(advanceDate('2024-01-31', 'monthly')).toBe('2024-02-29');
  });

  it('clamps Mar 31 to Apr 30', () => {
    expect(advanceDate('2026-03-31', 'monthly')).toBe('2026-04-30');
  });
});

describe('advanceDate — yearly', () => {
  it('advances by one year on a normal date', () => {
    expect(advanceDate('2026-06-15', 'yearly')).toBe('2027-06-15');
  });

  it('clamps Feb 29 to Feb 28 on a non-leap year', () => {
    expect(advanceDate('2024-02-29', 'yearly')).toBe('2025-02-28');
  });

  it('preserves Feb 29 when next year is also a leap year', () => {
    expect(advanceDate('2024-02-29', 'yearly')).not.toBe('2025-03-01');
  });
});
