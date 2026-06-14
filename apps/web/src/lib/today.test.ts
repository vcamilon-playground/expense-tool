import { describe, it, expect } from 'vitest';
import { formatToday } from './today';

describe('formatToday', () => {
  it('formats as "Today is yyyy/mm/dd, DDD"', () => {
    // 2026-06-15 is a Monday
    expect(formatToday(new Date(2026, 5, 15))).toBe('Today is 2026/06/15, Mon');
  });

  it('zero-pads single-digit months and days', () => {
    // 2026-01-05 is a Monday
    expect(formatToday(new Date(2026, 0, 5))).toBe('Today is 2026/01/05, Mon');
  });

  it('renders the correct weekday abbreviation', () => {
    // 2026-06-14 is a Sunday
    expect(formatToday(new Date(2026, 5, 14))).toBe('Today is 2026/06/14, Sun');
    // 2026-06-20 is a Saturday
    expect(formatToday(new Date(2026, 5, 20))).toBe('Today is 2026/06/20, Sat');
  });
});
