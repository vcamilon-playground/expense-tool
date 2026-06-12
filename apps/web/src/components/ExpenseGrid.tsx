'use client';

import { useEffect, useState } from 'react';
import type { Category, Expense } from '@expense/shared';
import { formatMoney } from '@expense/shared';
import { formatDateShort } from '@/lib/expense-utils';
import DeleteModal from './DeleteModal';

type Props = {
  expenses: Expense[];
  categories: Category[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  allowPastEdit?: boolean;
};

const currentMonth = new Date().toISOString().slice(0, 7);
const PAGE_SIZE = 20; // 5 columns × 4 rows on a wide grid

export default function ExpenseGrid({
  expenses,
  categories,
  onEdit,
  onDelete,
  allowPastEdit = false,
}: Props) {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const sorted = [...expenses].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

  // When the underlying set changes (filter/search/refresh), keep the user's
  // loaded position but never exceed what's available, and never drop below one page.
  useEffect(() => {
    setVisibleCount((prev) => Math.min(Math.max(prev, PAGE_SIZE), Math.max(expenses.length, PAGE_SIZE)));
  }, [expenses]);

  if (sorted.length === 0) {
    return <p className="muted">No expenses yet.</p>;
  }

  const visible = sorted.slice(0, visibleCount);
  const remaining = sorted.length - visible.length;

  return (
    <>
      <DeleteModal
        open={pendingDelete !== null}
        itemLabel="Expense"
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <div className="expense-grid">
        {visible.map((e) => {
          const cat = e.category_id ? catMap.get(e.category_id) : null;
          const editable = allowPastEdit || e.occurred_at.startsWith(currentMonth);
          return (
            <div key={e.id} className="expense-grid-card">
              <div className="expense-grid-card-head">
                <span className="expense-grid-cat">
                  {cat ? `${cat.icon ?? ''} ${cat.name}` : <span className="muted">Uncategorized</span>}
                </span>
                <span className="muted" style={{ fontSize: 12 }}>{formatDateShort(e.occurred_at)}</span>
              </div>

              <div className="expense-grid-amount">
                {formatMoney(e.amount, e.currency)}
                {e.conversion_rate && (
                  <span className="muted" style={{ fontSize: 11, fontWeight: 400 }}>
                    {' '}≈ {formatMoney(e.amount * e.conversion_rate, 'PHP')}
                  </span>
                )}
              </div>

              <div className="expense-grid-meta">
                <span>{e.merchant ?? <span className="muted">No merchant</span>}</span>
                {e.source === 'receipt' && <span className="pill ok">receipt</span>}
              </div>

              {e.description && <p className="expense-grid-desc">{e.description}</p>}

              <div className="expense-grid-actions">
                {editable ? (
                  <>
                    <button className="btn-sm" onClick={() => onEdit(e)}>Edit</button>
                    <button className="danger btn-sm" onClick={() => setPendingDelete(e)}>Delete</button>
                  </>
                ) : (
                  <span
                    className="muted"
                    style={{ fontSize: 12 }}
                    title="Only current-month expenses can be edited or deleted"
                  >
                    🔒
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {remaining > 0 && (
        <div className="expense-grid-more">
          <button
            className="ghost"
            style={{ width: 'auto' }}
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
          >
            Load More… ({remaining} more)
          </button>
        </div>
      )}
    </>
  );
}
