'use client';

import { useEffect, useMemo, useState } from 'react';
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
import FormModal from '@/components/FormModal';
import MonthEndBanner from '@/components/MonthEndBanner';
import { useAuth } from '@/contexts/AuthContext';

export default function ExpensesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [allowPastEdit, setAllowPastEdit] = useState(false);

  async function reload() {
    if (!user) return;
    const [c, e] = await Promise.all([listCategories(user.id), listExpenses(user.id)]);
    setCategories(c);
    setExpenses(e);
  }

  useEffect(() => {
    if (!user) return;
    setAllowPastEdit(localStorage.getItem('allow-past-edit') === 'true');
    (async () => {
      try {
        await reload();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  function closeModal() {
    setShowAdd(false);
    setEditing(null);
  }

  async function handleCreate(input: ExpenseInput) {
    if (!user) return;
    await createExpense(input, user.id);
    closeModal();
    await reload();
  }

  async function handleUpdate(input: ExpenseInput) {
    if (!editing) return;
    await updateExpense(editing.id, input);
    closeModal();
    await reload();
  }

  async function handleDelete(id: string) {
    await deleteExpense(id);
    await reload();
  }

  const filteredExpenses = useMemo(() => {
    const q = search.toLowerCase().trim();
    return expenses.filter((e) => {
      const matchesSearch =
        !q ||
        (e.merchant?.toLowerCase().includes(q) ?? false) ||
        (e.description?.toLowerCase().includes(q) ?? false);
      const matchesCategory = !categoryFilter || e.category_id === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, search, categoryFilter]);

  if (!user || loading) return <p className="muted">Loading…</p>;
  if (err) return <p style={{ color: 'var(--bad)' }}>{err}</p>;

  const modalOpen = showAdd || editing !== null;
  const modalTitle = editing ? 'Edit Expense' : 'Add Expense';
  const formCategories = categories.filter(
    (c) => c.active !== false || c.id === editing?.category_id,
  );

  return (
    <div>
      <FormModal open={modalOpen} title={modalTitle} onClose={closeModal}>
        <ExpenseForm
          categories={formCategories}
          initial={editing}
          onSubmit={editing ? handleUpdate : handleCreate}
          onCancel={closeModal}
          embedded
        />
      </FormModal>

      <MonthEndBanner />

      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Expenses</h1>
        <button className="primary" style={{ width: 'auto' }} onClick={() => setShowAdd(true)}>
          + Add Expense
        </button>
      </div>

      <div className="card" style={{ padding: '12px 16px', marginBottom: 8 }}>
        <div className="grid cols-2" style={{ gap: 8 }}>
          <input
            type="search"
            placeholder="Search merchant or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon ? `${c.icon} ${c.name}` : c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        {filteredExpenses.length === 0 && (search || categoryFilter) ? (
          <p className="muted">No expenses match your search.</p>
        ) : (
          <ExpenseList
            expenses={filteredExpenses}
            categories={categories}
            onEdit={(e) => setEditing(e)}
            onDelete={handleDelete}
            allowPastEdit={allowPastEdit}
          />
        )}
      </div>
    </div>
  );
}
