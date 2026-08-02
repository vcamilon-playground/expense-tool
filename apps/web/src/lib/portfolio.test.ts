import { describe, expect, it } from 'vitest';
import type { Debt, Investment } from '@expense/shared';
import {
  debtPaidAmount,
  debtPaidPercent,
  debtTotals,
  investmentGain,
  investmentTotals,
  netWorth,
  ordinalDay,
  sortDebtsByDueDay,
} from './portfolio';

function investment(principal: number, current_value: number): Investment {
  return {
    id: 'i1',
    user_id: 'u1',
    name: 'Fund',
    type: 'fund',
    platform: null,
    principal,
    current_value,
    active: true,
  };
}

function debt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: 'd1',
    user_id: 'u1',
    name: 'Loan',
    kind: 'loan',
    lender: null,
    principal: 50000,
    balance: 25000,
    monthly_payment: 2500,
    interest_rate: null,
    due_day: null,
    active: true,
    ...overrides,
  };
}

describe('investmentGain', () => {
  it('reports a gain in pesos and percent', () => {
    expect(investmentGain(investment(50000, 54200))).toEqual({ amount: 4200, percent: 8.4 });
  });

  it('reports a loss as a negative amount and percent', () => {
    const gain = investmentGain(investment(30000, 27500));
    expect(gain.amount).toBe(-2500);
    expect(gain.percent).toBeCloseTo(-8.333, 3);
  });

  it('is flat when value equals principal', () => {
    expect(investmentGain(investment(1000, 1000))).toEqual({ amount: 0, percent: 0 });
  });

  it('avoids dividing by zero when nothing was invested', () => {
    expect(investmentGain(investment(0, 500))).toEqual({ amount: 500, percent: 0 });
  });
});

describe('investmentTotals', () => {
  it('sums principal and value across holdings and nets the gain', () => {
    const totals = investmentTotals([
      investment(50000, 54200),
      investment(30000, 27500),
      investment(24000, 25900),
      investment(10000, 10450),
    ]);
    expect(totals.principal).toBe(114000);
    expect(totals.currentValue).toBe(118050);
    expect(totals.gain.amount).toBe(4050);
    expect(totals.gain.percent).toBeCloseTo(3.553, 3);
  });

  it('is all zeros with no holdings', () => {
    expect(investmentTotals([])).toEqual({
      principal: 0,
      currentValue: 0,
      gain: { amount: 0, percent: 0 },
    });
  });
});

describe('debtPaidPercent', () => {
  it('reports how much of the original amount is cleared', () => {
    expect(debtPaidPercent(debt({ principal: 50000, balance: 18400 }))).toBeCloseTo(63.2, 1);
  });

  it('is 100 when fully paid and 0 when untouched', () => {
    expect(debtPaidPercent(debt({ principal: 50000, balance: 0 }))).toBe(100);
    expect(debtPaidPercent(debt({ principal: 50000, balance: 50000 }))).toBe(0);
  });

  it('clamps rather than going negative when the balance exceeds the principal', () => {
    expect(debtPaidPercent(debt({ principal: 10000, balance: 12000 }))).toBe(0);
  });

  it('is 0 for a zero principal instead of dividing by zero', () => {
    expect(debtPaidPercent(debt({ principal: 0, balance: 0 }))).toBe(0);
  });
});

describe('debtPaidAmount', () => {
  it('returns the amount cleared, never negative', () => {
    expect(debtPaidAmount(debt({ principal: 50000, balance: 18400 }))).toBe(31600);
    expect(debtPaidAmount(debt({ principal: 10000, balance: 12000 }))).toBe(0);
  });
});

describe('debtTotals', () => {
  it('sums balances, monthly payments, and original principals', () => {
    const totals = debtTotals([
      debt({ balance: 18400, monthly_payment: 3000, principal: 50000 }),
      debt({ balance: 25000, monthly_payment: 2500, principal: 50000 }),
    ]);
    expect(totals.balance).toBe(43400);
    expect(totals.monthlyPayment).toBe(5500);
    expect(totals.originalPrincipal).toBe(100000);
  });

  it('is all zeros with no debts', () => {
    expect(debtTotals([])).toEqual({ balance: 0, monthlyPayment: 0, originalPrincipal: 0 });
  });
});

describe('netWorth', () => {
  it('adds cash and investments then subtracts debt', () => {
    expect(netWorth(94000, 118050, 43400)).toBe(168650);
  });

  it('can go negative when debt outweighs assets', () => {
    expect(netWorth(1000, 2000, 10000)).toBe(-7000);
  });
});

describe('sortDebtsByDueDay', () => {
  it('puts the soonest due day first and undated debts last', () => {
    const sorted = sortDebtsByDueDay([
      debt({ name: 'Card', due_day: 20 }),
      debt({ name: 'No date', due_day: null }),
      debt({ name: 'Loan', due_day: 5 }),
    ]);
    expect(sorted.map((d) => d.name)).toEqual(['Loan', 'Card', 'No date']);
  });

  it('breaks ties on the same day alphabetically', () => {
    const sorted = sortDebtsByDueDay([
      debt({ name: 'Zeta', due_day: 5 }),
      debt({ name: 'Alpha', due_day: 5 }),
    ]);
    expect(sorted.map((d) => d.name)).toEqual(['Alpha', 'Zeta']);
  });

  it('does not mutate the input array', () => {
    const input = [debt({ name: 'B', due_day: 20 }), debt({ name: 'A', due_day: 1 })];
    sortDebtsByDueDay(input);
    expect(input.map((d) => d.name)).toEqual(['B', 'A']);
  });
});

describe('ordinalDay', () => {
  it('uses the right suffix', () => {
    expect(ordinalDay(1)).toBe('1st');
    expect(ordinalDay(2)).toBe('2nd');
    expect(ordinalDay(3)).toBe('3rd');
    expect(ordinalDay(4)).toBe('4th');
    expect(ordinalDay(11)).toBe('11th');
    expect(ordinalDay(12)).toBe('12th');
    expect(ordinalDay(13)).toBe('13th');
    expect(ordinalDay(21)).toBe('21st');
    expect(ordinalDay(22)).toBe('22nd');
    expect(ordinalDay(31)).toBe('31st');
  });
});
