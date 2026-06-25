'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Category, Expense, ExpenseInput, IncomeSource } from '@expense/shared';
import {
  createExpense,
  deductFromIncomeSource,
  deleteExpense,
  listCategories,
  listExpenses,
  listIncomeSources,
  updateExpense,
} from '@/lib/db';
import ExpenseCalendar from '@/components/ExpenseCalendar';
import ExpenseForm from '@/components/ExpenseForm';
import ExpenseGrid from '@/components/ExpenseGrid';
import ExpenseList from '@/components/ExpenseList';
import FormModal from '@/components/FormModal';
import MonthEndBanner from '@/components/MonthEndBanner';
import LoadingScreen from '@/components/LoadingScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useDataRefresh } from '@/contexts/DataRefreshContext';

export default function ExpensesPage() {
  const { user } = useAuth();
  const { refreshKey } = useDataRefresh();
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [allowPastEdit, setAllowPastEdit] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  async function reload() {
    if (!user) return;
    const [c, e, inc] = await Promise.all([
      listCategories(user.id),
      listExpenses(user.id),
      listIncomeSources(user.id),
    ]);
    setCategories(c);
    setExpenses(e);
    setIncomeSources(inc);
  }

  useEffect(() => {
    if (!user) return;
    setAllowPastEdit(localStorage.getItem('allow-past-edit') === 'true');
    (async () => {
      try {
        await reload();
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, refreshKey]);

  function closeModal() {
    setShowAdd(false);
    setEditing(null);
  }

  async function handleCreate(input: ExpenseInput, incomeSourceId: string | null) {
    if (!user) return;
    await createExpense(input, user.id);
    if (incomeSourceId) {
      const phpAmount = input.conversion_rate
        ? input.amount * input.conversion_rate
        : input.amount;
      await deductFromIncomeSource(incomeSourceId, phpAmount, input.merchant ?? input.description ?? undefined);
    }
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

  if (!user || loading) return <LoadingScreen />;
  if (loadError) return <p style={{ color: 'var(--bad)' }}>{loadError}</p>;

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
          incomeSources={incomeSources}
          initial={editing}
          onSubmit={editing ? handleUpdate : handleCreate}
          onCancel={closeModal}
          embedded
        />
      </FormModal>

      <MonthEndBanner />

      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Expenses</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="view-toggle">
            <button
              className={viewMode === 'list' ? 'primary btn-sm' : 'ghost btn-sm'}
              onClick={() => setViewMode('list')}
            >List</button>
            <button
              className={viewMode === 'grid' ? 'primary btn-sm' : 'ghost btn-sm'}
              onClick={() => setViewMode('grid')}
            >Grid</button>
            <button
              className={viewMode === 'calendar' ? 'primary btn-sm' : 'ghost btn-sm'}
              onClick={() => setViewMode('calendar')}
            >Calendar</button>
          </div>
          <button className="primary" style={{ width: 'auto' }} onClick={() => setShowAdd(true)}>
            + Add Expense
          </button>
        </div>
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
        {viewMode === 'calendar' ? (
          <ExpenseCalendar
            expenses={filteredExpenses}
            categories={categories}
            onEdit={(e) => setEditing(e)}
            onDelete={handleDelete}
            allowPastEdit={allowPastEdit}
          />
        ) : filteredExpenses.length === 0 && (search || categoryFilter) ? (
          <p className="muted">No expenses match your search.</p>
        ) : viewMode === 'grid' ? (
          <ExpenseGrid
            expenses={filteredExpenses}
            categories={categories}
            onEdit={(e) => setEditing(e)}
            onDelete={handleDelete}
            allowPastEdit={allowPastEdit}
          />
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
