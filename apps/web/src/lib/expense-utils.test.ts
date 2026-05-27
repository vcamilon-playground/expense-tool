import { describe, expect, it } from 'vitest';
import { monthKey, monthLabel, formatDateShort } from './expense-utils';

describe('monthKey', () => {
  it('extracts YYYY-MM from a full date', () => {
    expect(monthKey('2026-05-15')).toBe('2026-05');
  });

  it('works at year boundary', () => {
    expect(monthKey('2026-01-01')).toBe('2026-01');
  });

  it('works for December', () => {
    expect(monthKey('2026-12-31')).toBe('2026-12');
  });
});

describe('monthLabel', () => {
  it('includes the year', () => {
    expect(monthLabel('2026-05')).toContain('2026');
  });

  it('includes the month name for May', () => {
    expect(monthLabel('2026-05').toLowerCase()).toContain('may');
  });

  it('includes the month name for January', () => {
    expect(monthLabel('2026-01').toLowerCase()).toContain('january');
  });

  it('includes the month name for December', () => {
    expect(monthLabel('2026-12').toLowerCase()).toContain('december');
  });
});

describe('formatDateShort', () => {
  it('includes the day number', () => {
    expect(formatDateShort('2026-05-15')).toContain('15');
  });

  it('includes a month abbreviation for May', () => {
    expect(formatDateShort('2026-05-15').toLowerCase()).toMatch(/may/);
  });

  it('includes a weekday abbreviation', () => {
    // 2026-05-15 is a Friday
    expect(formatDateShort('2026-05-15').toLowerCase()).toMatch(/fri/);
  });
});
