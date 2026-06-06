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
  allowPastEdit?: boolean;
};

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ExpenseCalendar({
  expenses,
  categories,
  onEdit,
  onDelete,
  allowPastEdit = false,
}: Props) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);

  const catMap = new Map(categories.map((c) => [c.id, c]));

  const byDay = new Map<string, Expense[]>();
  for (const e of expenses) {
    const key = e.occurred_at.slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e);
  }

  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const monthName = new Date(viewYear, viewMonth, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDay(null);
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDay(null);
  }

  const selectedExpenses = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  return (
    <div>
      <DeleteModal
        open={pendingDelete !== null}
        itemLabel="Expense"
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <div className="cal-nav">
        <button className="ghost btn-sm" onClick={prevMonth}>‹ Prev</button>
        <span className="cal-month-label">{monthName}</span>
        <button className="ghost btn-sm" onClick={nextMonth}>Next ›</button>
      </div>

      <div className="cal-grid">
        {DOW.map((d) => (
          <div key={d} className="cal-dow">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="cal-cell cal-cell-empty" />;

          const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
          const dayExpenses = byDay.get(dateStr) ?? [];
          const total = dayExpenses.reduce(
            (s, e) => s + (e.conversion_rate ? e.amount * e.conversion_rate : e.amount),
            0,
          );
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDay;
          const hasExpenses = dayExpenses.length > 0;

          const cls = [
            'cal-cell',
            hasExpenses ? 'cal-cell-has-expense' : '',
            isToday ? 'cal-cell-today' : '',
            isSelected ? 'cal-cell-selected' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div
              key={i}
              className={cls}
              onClick={() => hasExpenses && setSelectedDay(isSelected ? null : dateStr)}
              role={hasExpenses ? 'button' : undefined}
            >
              <span className="cal-day-num">{day}</span>
              {hasExpenses && <span className="cal-day-total">{formatMoney(total)}</span>}
            </div>
          );
        })}
      </div>

      {selectedDay && selectedExpenses.length > 0 && (
        <div className="cal-day-detail">
          <p style={{ fontWeight: 600, margin: '0 0 12px' }}>
            {new Date(selectedDay + 'T00:00:00').toLocaleDateString('default', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <div className="table-wrap">
            <table className="expense-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Merchant</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {selectedExpenses.map((e) => {
                  const cat = e.category_id ? catMap.get(e.category_id) : null;
                  const editable = allowPastEdit || e.occurred_at.startsWith(currentMonthStr);
                  return (
                    <tr key={e.id}>
                      <td data-label="Category">
                        {cat ? `${cat.icon ?? ''} ${cat.name}` : <span className="muted">—</span>}
                      </td>
                      <td data-label="Merchant">
                        {e.merchant ?? <span className="muted">—</span>}
                      </td>
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
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                            <button className="btn-sm" onClick={() => onEdit(e)}>Edit</button>
                            <button className="danger btn-sm" onClick={() => setPendingDelete(e)}>Delete</button>
                          </div>
                        ) : (
                          <span
                            className="muted"
                            style={{ fontSize: 12, padding: '0 6px' }}
                            title="Only current-month expenses can be edited or deleted"
                          >
                            🔒
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
