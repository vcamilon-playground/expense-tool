import { describe, expect, it } from 'vitest';
import type { Reminder, RecurringExpense } from '@expense/shared';
import { computeNotifications } from './notifications';

const TODAY = '2026-06-15';

function reminder(overrides: Partial<Reminder>): Reminder {
  return {
    id: 'r1',
    user_id: 'u1',
    title: 'Pay rent',
    remind_date: TODAY,
    cadence: 'once',
    active: true,
    ...overrides,
  };
}

describe('computeNotifications — custom reminders', () => {
  it('emits a notification for a reminder due today', () => {
    const result = computeNotifications([], [reminder({ remind_date: TODAY })], TODAY, true);
    const rem = result.find((n) => n.type === 'custom_reminder');
    expect(rem).toBeDefined();
    expect(rem?.body).toBe('Pay rent');
    expect(rem?.reminderId).toBe('r1');
  });

  it('emits a notification for a past-due reminder', () => {
    const result = computeNotifications([], [reminder({ remind_date: '2026-06-01' })], TODAY, true);
    expect(result.some((n) => n.type === 'custom_reminder')).toBe(true);
  });

  it('does not emit for a future-dated reminder', () => {
    const result = computeNotifications([], [reminder({ remind_date: '2026-06-20' })], TODAY, true);
    expect(result.some((n) => n.type === 'custom_reminder')).toBe(false);
  });

  it('does not emit for an inactive reminder', () => {
    const result = computeNotifications([], [reminder({ active: false })], TODAY, true);
    expect(result.some((n) => n.type === 'custom_reminder')).toBe(false);
  });

  it('labels recurring reminders distinctly from one-time', () => {
    const once = computeNotifications([], [reminder({ cadence: 'once' })], TODAY, true);
    const monthly = computeNotifications([], [reminder({ cadence: 'monthly' })], TODAY, true);
    expect(once.find((n) => n.type === 'custom_reminder')?.title).toBe('Reminder');
    expect(monthly.find((n) => n.type === 'custom_reminder')?.title).toBe('Recurring Reminder');
  });
});

describe('computeNotifications — still handles recurring + income', () => {
  const dueRecurring: RecurringExpense = {
    id: 'rec1',
    name: 'Netflix',
    amount: 549,
    category_id: null,
    cadence: 'monthly',
    next_charge_date: TODAY,
    active: true,
  };

  it('emits a high-urgency notification for recurring due today', () => {
    const result = computeNotifications([dueRecurring], [], TODAY, true);
    const due = result.find((n) => n.type === 'recurring_due_today');
    expect(due?.urgency).toBe('high');
  });

  it('emits the monthly income reminder on/after the 15th when not dismissed', () => {
    const result = computeNotifications([], [], TODAY, false);
    expect(result.some((n) => n.type === 'income_reminder')).toBe(true);
  });

  it('suppresses the income reminder when dismissed', () => {
    const result = computeNotifications([], [], TODAY, true);
    expect(result.some((n) => n.type === 'income_reminder')).toBe(false);
  });
});
