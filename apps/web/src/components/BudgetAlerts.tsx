'use client';

import type { BudgetStatus } from '@expense/shared';
import { formatMoney } from '@expense/shared';
import { SortIcon, sortRows, useSortState } from '@/lib/sort';

type SortCol = 'category' | 'limit' | 'spent' | 'remaining' | 'pct';

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
  const { sortCol, sortDir, handleSort } = useSortState<SortCol>('category', 'asc');

  if (statuses.length === 0) {
    return <p className="muted">No budgets set. Add one on the Budgets page.</p>;
  }
  // The Overall summary stays pinned in the footer; only categories are sorted.
  const overall = statuses.find((s) => s.category_id === null) ?? null;
  const categories = sortRows(
    statuses.filter((s) => s.category_id !== null),
    (s) => (sortCol === 'category' ? s.category_name : sortCol === 'limit' ? s.limit : sortCol === 'spent' ? s.spent : sortCol === 'remaining' ? s.remaining : s.pct_used),
    sortDir,
  );

  return (
    <div className="table-wrap">
      <table className="budget-status-table">
        <thead>
          <tr>
            <th className="sortable" onClick={() => handleSort('category')}>Category <SortIcon col="category" sortCol={sortCol} sortDir={sortDir} /></th>
            <th className="num sortable" onClick={() => handleSort('limit')}>Budget <SortIcon col="limit" sortCol={sortCol} sortDir={sortDir} /></th>
            <th className="num sortable" onClick={() => handleSort('spent')}>Actual <SortIcon col="spent" sortCol={sortCol} sortDir={sortDir} /></th>
            <th className="num sortable" onClick={() => handleSort('remaining')}>Difference <SortIcon col="remaining" sortCol={sortCol} sortDir={sortDir} /></th>
            <th className="sortable" onClick={() => handleSort('pct')}>% of Budget <SortIcon col="pct" sortCol={sortCol} sortDir={sortDir} /></th>
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
