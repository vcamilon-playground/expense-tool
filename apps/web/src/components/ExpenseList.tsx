'use client';

import { useState } from 'react';
import type { Category, Expense } from '@expense/shared';
import { formatMoney } from '@expense/shared';
import { monthKey, monthLabel, formatDateShort } from '@/lib/expense-utils';
import DeleteModal from './DeleteModal';

type Props = {
  expenses: Expense[];
  categories: Category[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  allowPastEdit?: boolean;
};

const currentMonth = new Date().toISOString().slice(0, 7);

function get6MonthCutoff(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().slice(0, 10);
}


export default function ExpenseList({ expenses, categories, onEdit, onDelete, allowPastEdit = false }: Props) {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const inactive = new Set(expenses.map((e) => monthKey(e.occurred_at)));
    inactive.delete(currentMonth);
    return inactive;
  });
  const [showArchived, setShowArchived] = useState(false);

  const cutoff = get6MonthCutoff();
  const recent = expenses.filter((e) => e.occurred_at >= cutoff);
  const archived = expenses.filter((e) => e.occurred_at < cutoff);
  const display = showArchived ? expenses : recent;

  function toggleMonth(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // Group by month, newest first
  const grouped = new Map<string, Expense[]>();
  for (const e of display) {
    const key = monthKey(e.occurred_at);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(e);
  }
  const months = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));

  if (display.length === 0) {
    return (
      <div>
        <p className="muted">No expenses in the last 6 months.</p>
        {archived.length > 0 && (
          <button className="ghost" style={{ width: 'auto', fontSize: 13 }} onClick={() => setShowArchived(true)}>
            Show {archived.length} archived expense{archived.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <DeleteModal
        open={pendingDelete !== null}
        itemLabel="Expense"
        onConfirm={() => { if (pendingDelete) onDelete(pendingDelete.id); setPendingDelete(null); }}
        onCancel={() => setPendingDelete(null)}
      />

      {archived.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button
            className="ghost"
            style={{ width: 'auto', fontSize: 12 }}
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? '↑ Hide archived' : `↓ Show ${archived.length} archived`}
          </button>
        </div>
      )}

      {months.map((key) => {
        const items = grouped.get(key)!.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
        const isCollapsed = collapsed.has(key);
        const isArchived = key < monthKey(cutoff);
        const total = items.reduce(
          (s, e) => s + (e.conversion_rate ? e.amount * e.conversion_rate : e.amount),
          0,
        );

        return (
          <div key={key} className={`date-group${isArchived ? ' date-group-archived' : ''}`}>
            <div
              className="date-group-header"
              onClick={() => toggleMonth(key)}
              role="button"
              aria-expanded={!isCollapsed}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="date-group-chevron">{isCollapsed ? '▶' : '▼'}</span>
                <span className="date-group-date">{monthLabel(key)}</span>
                <span className="muted" style={{ fontSize: 12 }}>
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </span>
                {isArchived && <span className="pill warn" style={{ fontSize: 10 }}>archived</span>}
              </div>
              <span style={{ fontWeight: 600, flexShrink: 0 }}>{formatMoney(total)}</span>
            </div>

            {!isCollapsed && (
              <div className="date-group-body">
                <table className="expense-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Merchant</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((e) => {
                      const cat = e.category_id ? catMap.get(e.category_id) : null;
                      const editable = allowPastEdit || e.occurred_at.startsWith(currentMonth);
                      return (
                        <tr key={e.id}>
                          <td data-label="Date">{formatDateShort(e.occurred_at)}</td>
                          <td data-label="Category">
                            {cat ? `${cat.icon ?? ''} ${cat.name}` : <span className="muted">—</span>}
                          </td>
                          <td data-label="Merchant">{e.merchant ?? <span className="muted">—</span>}</td>
                          <td data-label="Description">
                            <span>
                              {e.description ?? <span className="muted">—</span>}
                              {e.source === 'receipt' && (
                                <span className="pill ok" style={{ marginLeft: 6 }}>receipt</span>
                              )}
                            </span>
                          </td>
                          <td data-label="Amount" style={{ textAlign: 'right' }}>
                            <span>
                              {formatMoney(e.amount, e.currency)}
                              {e.conversion_rate && (
                                <div className="muted" style={{ fontSize: 11 }}>
                                  ≈ {formatMoney(e.amount * e.conversion_rate, 'PHP')}
                                </div>
                              )}
                            </span>
                          </td>
                          <td data-label="">
                            {editable ? (
                              <button className="ghost" style={{ width: 'auto' }} onClick={() => onEdit(e)}>
                                Edit
                              </button>
                            ) : (
                              <span
                                className="muted"
                                style={{ fontSize: 12, padding: '0 6px' }}
                                title="Only current-month expenses can be edited"
                              >
                                🔒
                              </span>
                            )}
                            <button
                              className="danger"
                              style={{ width: 'auto' }}
                              onClick={() => setPendingDelete(e)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
