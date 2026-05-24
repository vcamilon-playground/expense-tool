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
    <table>
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
              <td>{e.occurred_at}</td>
              <td>
                {cat ? `${cat.icon ?? ''} ${cat.name}` : <span className="muted">—</span>}
              </td>
              <td>{e.merchant ?? <span className="muted">—</span>}</td>
              <td>
                {e.description ?? <span className="muted">—</span>}
                {e.source === 'receipt' && <span className="pill ok" style={{ marginLeft: 6 }}>receipt</span>}
              </td>
              <td style={{ textAlign: 'right' }}>
                {formatMoney(e.amount, e.currency)}
                {e.conversion_rate && (
                  <div className="muted" style={{ fontSize: 11 }}>
                    ≈ {formatMoney(e.amount * e.conversion_rate, 'PHP')}
                  </div>
                )}
              </td>
              <td style={{ textAlign: 'right' }}>
                <button className="ghost" onClick={() => onEdit(e)}>Edit</button>{' '}
                <button
                  className="danger"
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
