import { describe, expect, it } from 'vitest';
import { periodBounds } from './reports';

function ref(iso: string) {
  return new Date(iso + 'T12:00:00');
}

// ── Calendar mode (rolling = false, default) ───────────────────────────────

describe('periodBounds — calendar — day', () => {
  it('returns the ref date for both bounds', () => {
    expect(periodBounds('day', ref('2026-05-27'))).toEqual({ from: '2026-05-27', to: '2026-05-27' });
  });
});

describe('periodBounds — calendar — week', () => {
  it('returns Monday to Sunday of the ref week (Wednesday)', () => {
    // 2026-05-27 is a Wednesday → Mon 05-25 to Sun 05-31
    expect(periodBounds('week', ref('2026-05-27'))).toEqual({ from: '2026-05-25', to: '2026-05-31' });
  });

  it('handles Sunday as start of next week', () => {
    // 2026-05-24 is a Sunday → Mon 05-18 to Sun 05-24
    expect(periodBounds('week', ref('2026-05-24'))).toEqual({ from: '2026-05-18', to: '2026-05-24' });
  });
});

describe('periodBounds — calendar — month', () => {
  it('returns the full calendar month', () => {
    expect(periodBounds('month', ref('2026-05-27'))).toEqual({ from: '2026-05-01', to: '2026-05-31' });
  });

  it('handles February in a non-leap year', () => {
    expect(periodBounds('month', ref('2026-02-15'))).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });
});

describe('periodBounds — calendar — year', () => {
  it('returns Jan 1 to Dec 31 of the ref year', () => {
    expect(periodBounds('year', ref('2026-05-27'))).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });
});

// ── Rolling mode (rolling = true) ─────────────────────────────────────────

describe('periodBounds — rolling — day', () => {
  it('returns the ref date for both bounds', () => {
    expect(periodBounds('day', ref('2026-05-27'), true)).toEqual({ from: '2026-05-27', to: '2026-05-27' });
  });
});

describe('periodBounds — rolling — week', () => {
  it('returns ref-7 days to ref', () => {
    expect(periodBounds('week', ref('2026-05-27'), true)).toEqual({ from: '2026-05-20', to: '2026-05-27' });
  });

  it('crosses a month boundary', () => {
    expect(periodBounds('week', ref('2026-05-04'), true)).toEqual({ from: '2026-04-27', to: '2026-05-04' });
  });
});

describe('periodBounds — rolling — month', () => {
  it('returns ref-1 month to ref (normal date)', () => {
    expect(periodBounds('month', ref('2026-05-27'), true)).toEqual({ from: '2026-04-27', to: '2026-05-27' });
  });

  it('crosses a year boundary', () => {
    expect(periodBounds('month', ref('2026-01-15'), true)).toEqual({ from: '2025-12-15', to: '2026-01-15' });
  });

  it('clamps Mar 31 to Feb 28 (non-leap)', () => {
    expect(periodBounds('month', ref('2026-03-31'), true)).toEqual({ from: '2026-02-28', to: '2026-03-31' });
  });

  it('clamps Mar 31 to Feb 29 (leap year)', () => {
    expect(periodBounds('month', ref('2024-03-31'), true)).toEqual({ from: '2024-02-29', to: '2024-03-31' });
  });
});

describe('periodBounds — rolling — year', () => {
  it('returns ref-1 year to ref (normal date)', () => {
    expect(periodBounds('year', ref('2026-05-27'), true)).toEqual({ from: '2025-05-27', to: '2026-05-27' });
  });

  it('crosses a century boundary', () => {
    expect(periodBounds('year', ref('2000-03-15'), true)).toEqual({ from: '1999-03-15', to: '2000-03-15' });
  });

  it('clamps Feb 29 to Feb 28 on a non-leap year', () => {
    expect(periodBounds('year', ref('2024-02-29'), true)).toEqual({ from: '2023-02-28', to: '2024-02-29' });
  });
});
