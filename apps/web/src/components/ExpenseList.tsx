'use client';

import { useState } from 'react';
import type { Category, Expense } from '@expense/shared';
import { formatMoney } from '@expense/shared';
import DeleteModal from './DeleteModal';

type Props = {
  expenses: Expense[];
  categories: Category[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
};

const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

export default function ExpenseList({ expenses, categories, onEdit, onDelete }: Props) {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);

  if (expenses.length === 0) {
    return <p className="muted">No expenses yet.</p>;
  }

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
          {expenses.map((e) => {
            const cat = e.category_id ? catMap.get(e.category_id) : null;
            const editable = e.occurred_at.startsWith(currentMonth);

            return (
              <tr key={e.id}>
                <td data-label="Date">{e.occurred_at}</td>
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
                    <button
                      className="ghost"
                      style={{ width: 'auto' }}
                      onClick={() => onEdit(e)}
                    >
                      Edit
                    </button>
                  ) : (
                    <span
                      className="muted"
                      style={{ fontSize: 12, padding: '0 6px' }}
                      title="Only current-month expenses can be edited"
                    >
                      🔒 Locked
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
    </>
  );
}
