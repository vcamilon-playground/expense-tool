'use client';

import type { Category, Expense } from '@expense/shared';
import { formatMoney } from '@expense/shared';

type Props = {
  expenses: Expense[];
  categories: Category[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
};

export default function ExpenseList({ expenses, categories, onEdit, onDelete }: Props) {
  const catMap = new Map(categories.map((c) => [c.id, c]));

  if (expenses.length === 0) {
    return <p className="muted">No expenses yet.</p>;
  }

  return (
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
                <button className="ghost" style={{ width: 'auto' }} onClick={() => onEdit(e)}>Edit</button>
                <button
                  className="danger"
                  style={{ width: 'auto' }}
                  onClick={() => {
                    if (confirm('Delete this expense?')) onDelete(e.id);
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
