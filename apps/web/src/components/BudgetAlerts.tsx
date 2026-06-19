'use client';

import type { BudgetStatus } from '@expense/shared';
import { formatMoney } from '@expense/shared';

function statusClass(status: BudgetStatus['status']): string {
  return status === 'warning' ? 'warn' : status; // ok | warn | over
}

function BudgetRow({ status, summary }: { status: BudgetStatus; summary?: boolean }) {
  const pct = Math.round(status.pct_used * 100);
  const fillPct = Math.min(100, pct);
  const css = statusClass(status.status);
  return (
    <tr className={summary ? 'budget-status-summary' : undefined}>
      <td data-label="Category">{status.category_name}</td>
      <td data-label="Budget" className="num">{formatMoney(status.limit)}</td>
      <td data-label="Actual" className="num">{formatMoney(status.spent)}</td>
      <td data-label="Difference" className="num">{formatMoney(status.remaining)}</td>
      <td data-label="% of Budget">
        <div className={`pct-pill pct-${css}`} role="img" aria-label={`${pct}% of budget used`}>
          <div className="pct-pill-fill" style={{ width: `${fillPct}%` }} />
          <span className="pct-pill-label">{pct}%</span>
        </div>
      </td>
    </tr>
  );
}

export default function BudgetAlerts({ statuses }: { statuses: BudgetStatus[] }) {
  if (statuses.length === 0) {
    return <p className="muted">No budgets set. Add one on the Budgets page.</p>;
  }
  const overall = statuses.find((s) => s.category_id === null) ?? null;
  const categories = statuses.filter((s) => s.category_id !== null);

  return (
    <div className="table-wrap">
      <table className="budget-status-table">
        <thead>
          <tr>
            <th>Category</th>
            <th className="num">Budget</th>
            <th className="num">Actual</th>
            <th className="num">Difference</th>
            <th>% of Budget</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((s) => (
            <BudgetRow key={s.category_id ?? 'overall'} status={s} />
          ))}
        </tbody>
        {overall && (
          <tfoot>
            <BudgetRow status={overall} summary />
          </tfoot>
        )}
      </table>
    </div>
  );
}
