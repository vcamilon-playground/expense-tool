import { describe, expect, it } from 'vitest';
import { budgetStatus, periodBounds } from './reports';
import type { Budget, Category, Expense } from './types';

function ref(iso: string) {
  return new Date(iso + 'T12:00:00');
}

function expense(category_id: string | null, amount: number, occurred_at = '2026-06-10'): Expense {
  return {
    id: `e-${Math.random()}`,
    amount,
    currency: 'PHP',
    conversion_rate: null,
    category_id,
    merchant: null,
    description: null,
    occurred_at,
    receipt_url: null,
    source: 'manual',
  };
}

function category(id: string, name: string): Category {
  return { id, name, icon: null, active: true };
}

function budget(category_id: string | null, monthly_limit: number): Budget {
  return { id: `b-${category_id ?? 'overall'}`, category_id, monthly_limit };
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

// ── budgetStatus ───────────────────────────────────────────────────────────

const refDate = ref('2026-06-15');
const cats = [category('food', 'Food'), category('rent', 'Rent')];

function statusFor(statuses: ReturnType<typeof budgetStatus>, name: string) {
  const s = statuses.find((x) => x.category_name === name);
  if (!s) throw new Error(`no status for ${name}`);
  return s;
}

describe('budgetStatus — status thresholds', () => {
  it('flags "over" only when spent strictly exceeds the limit', () => {
    const statuses = budgetStatus([expense('food', 16200)], cats, [budget('food', 16100)], refDate);
    expect(statusFor(statuses, 'Food').status).toBe('over');
    expect(statusFor(statuses, 'Food').remaining).toBe(-100);
  });

  it('does NOT flag "over" when spending is just under the limit (99%)', () => {
    const statuses = budgetStatus([expense('food', 16000)], cats, [budget('food', 16100)], refDate);
    const food = statusFor(statuses, 'Food');
    expect(food.status).toBe('warning');
    expect(food.remaining).toBe(100);
  });

  it('does NOT flag "over" when spending exactly meets the limit (100%)', () => {
    const statuses = budgetStatus([expense('rent', 8700)], cats, [budget('rent', 8700)], refDate);
    const rent = statusFor(statuses, 'Rent');
    expect(rent.status).toBe('warning');
    expect(rent.remaining).toBe(0);
  });

  it('is "ok" below 80% used', () => {
    const statuses = budgetStatus([expense('food', 1000)], cats, [budget('food', 5000)], refDate);
    expect(statusFor(statuses, 'Food').status).toBe('ok');
  });

  it('is "warning" at exactly 80% used', () => {
    const statuses = budgetStatus([expense('food', 4000)], cats, [budget('food', 5000)], refDate);
    expect(statusFor(statuses, 'Food').status).toBe('warning');
  });
});

describe('budgetStatus — computed Overall', () => {
  it('synthesises an Overall row from the sum of category limits', () => {
    const statuses = budgetStatus(
      [expense('food', 1000), expense('rent', 2000)],
      cats,
      [budget('food', 5000), budget('rent', 8000)],
      refDate,
    );
    const overall = statusFor(statuses, 'Overall');
    expect(overall.category_id).toBeNull();
    expect(overall.limit).toBe(13000);
    expect(overall.spent).toBe(3000);
    expect(overall.remaining).toBe(10000);
    expect(statuses[0]?.category_name).toBe('Overall');
  });

  it('ignores any stored null-category (legacy Overall) budget', () => {
    const statuses = budgetStatus(
      [expense('food', 1000)],
      cats,
      [budget('food', 5000), budget(null, 99999)],
      refDate,
    );
    expect(statusFor(statuses, 'Overall').limit).toBe(5000);
    expect(statuses).toHaveLength(2);
  });

  it('returns no statuses when there are no category budgets', () => {
    expect(budgetStatus([expense('food', 1000)], cats, [], refDate)).toEqual([]);
    expect(budgetStatus([], cats, [budget(null, 5000)], refDate)).toEqual([]);
  });

  it('Overall spend counts every expense, including uncategorised ones', () => {
    const statuses = budgetStatus(
      [expense('food', 1000), expense(null, 500)],
      cats,
      [budget('food', 5000)],
      refDate,
    );
    expect(statusFor(statuses, 'Overall').spent).toBe(1500);
  });
});
