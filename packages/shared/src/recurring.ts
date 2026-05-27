import type { RecurringCadence } from './types';

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
