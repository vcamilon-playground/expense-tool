import type { RecurringCadence, RecurringExpense } from './types';
import { formatMoney } from './reports';

/**
 * The label to show for a recurring expense's amount:
 * - fixed → the formatted amount
 * - variable with an estimate → `~<estimate>` (a tilde marks it as approximate)
 * - variable with no estimate → `Varies`
 */
export function recurringAmountLabel(r: Pick<RecurringExpense, 'amount' | 'is_variable'>): string {
  if (!r.is_variable) return formatMoney(r.amount);
  return r.amount > 0 ? `~${formatMoney(r.amount)}` : 'Varies';
}

export function advanceDate(dateStr: string, cadence: RecurringCadence): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDate();

  if (cadence === 'weekly') {
    d.setUTCDate(day + 7);
  } else if (cadence === 'monthly') {
    d.setUTCMonth(d.getUTCMonth() + 1);
    // Clamp overflow: Jan 31 → Feb 28, not Mar 3
    if (d.getUTCDate() !== day) d.setUTCDate(0);
  } else {
    d.setUTCFullYear(d.getUTCFullYear() + 1);
    // Clamp overflow: Feb 29 on non-leap year → Feb 28, not Mar 1
    if (d.getUTCDate() !== day) d.setUTCDate(0);
  }

  return d.toISOString().slice(0, 10);
}
