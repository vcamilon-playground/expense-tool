'use client';

import { useEffect, useState } from 'react';
import type { Category, Expense, ExpenseInput } from '@expense/shared';
import {
  createExpense,
  deleteExpense,
  listCategories,
  listExpenses,
  updateExpense,
} from '@/lib/db';
import ExpenseForm from '@/components/ExpenseForm';
import ExpenseList from '@/components/ExpenseList';

export default function ExpensesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    const [c, e] = await Promise.all([listCategories(), listExpenses()]);
    setCategories(c);
    setExpenses(e);
  }

  useEffect(() => {
    (async () => {
      try {
        await reload();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleCreate(input: ExpenseInput) {
    await createExpense(input);
    setShowAdd(false);
    await reload();
  }

  async function handleUpdate(input: ExpenseInput) {
    if (!editing) return;
    await updateExpense(editing.id, input);
    setEditing(null);
    await reload();
  }

  async function handleDelete(id: string) {
    await deleteExpense(id);
    await reload();
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (err) return <p style={{ color: 'var(--bad)' }}>{err}</p>;

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Expenses</h1>
        {!showAdd && !editing && (
          <button className="primary" onClick={() => setShowAdd(true)}>
            + Add expense
          </button>
        )}
      </div>

      {showAdd && (
        <ExpenseForm
          categories={categories}
          onSubmit={handleCreate}
          onCancel={() => setShowAdd(false)}
        />
      )}
      {editing && (
        <ExpenseForm
          categories={categories}
          initial={editing}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className="card">
        <ExpenseList
          expenses={expenses}
          categories={categories}
          onEdit={setEditing}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
