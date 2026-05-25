'use client';

import type { BudgetStatus } from '@expense/shared';
import { formatMoney } from '@expense/shared';

export default function BudgetAlerts({ statuses }: { statuses: BudgetStatus[] }) {
  if (statuses.length === 0) {
    return <p className="muted">No budgets set. Add one on the Budgets page.</p>;
  }
  return (
    <div>
      {statuses.map((s) => {
        const pct = Math.min(100, Math.round(s.pct_used * 100));
        const css = s.status === 'warning' ? 'warn' : s.status; // ok | warn | over
        return (
          <div key={`${s.category_id ?? 'overall'}`} style={{ marginBottom: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>{s.category_name}</strong>
              <span className={`pill ${css}`}>
                {pct}% — {formatMoney(s.spent)} / {formatMoney(s.limit)}
              </span>
            </div>
            <div className={`bar bar-${css}`} style={{ marginTop: 6 }}>
              <div style={{ width: `${pct}%` }} />
            </div>
            {s.status === 'over' && (
              <p style={{ color: 'var(--bad)', margin: '6px 0 0', fontSize: 13 }}>
                Over budget by {formatMoney(-s.remaining)} this month.
              </p>
            )}
            {s.status === 'warning' && (
              <p style={{ color: 'var(--warn)', margin: '6px 0 0', fontSize: 13 }}>
                Approaching limit — {formatMoney(s.remaining)} left.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
