'use client';

import { useEffect, useState } from 'react';
import type { Budget, Category } from '@expense/shared';
import { formatMoney } from '@expense/shared';
import { deleteBudget, listBudgets, listCategories, updateBudget, upsertBudget } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { useSortState, SortIcon, sortRows } from '@/lib/sort';
import DeleteModal from '@/components/DeleteModal';

export default function BudgetsPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Budget | null>(null);
  const [editing, setEditing] = useState<Budget | null>(null);

  async function reload() {
    if (!user) return;
    const [c, b] = await Promise.all([listCategories(user.id), listBudgets(user.id)]);
    setCategories(c);
    setBudgets(b);
  }

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        await reload();
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  function handleEdit(b: Budget) {
    setEditing(b);
    setCategoryId(b.category_id ?? '');
    setLimit(String(b.monthly_limit));
    setLimitError(null);
  }

  function handleCancelEdit() {
    setEditing(null);
    setCategoryId('');
    setLimit('');
    setLimitError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(limit);
    if (!limit) {
      setLimitError('Monthly limit is required');
      return;
    }
    if (!Number.isFinite(parsed) || parsed < 0) {
      setLimitError('Enter a valid positive amount');
      return;
    }
    setLimitError(null);
    if (editing) {
      await updateBudget(editing.id, parsed);
      setEditing(null);
    } else {
      if (!user) return;
      await upsertBudget({ category_id: categoryId || null, monthly_limit: parsed }, user.id);
    }
    setLimit('');
    setCategoryId('');
    await reload();
  }

  async function handleDelete(id: string) {
    await deleteBudget(id);
    await reload();
  }

  const { sortCol, sortDir, handleSort } = useSortState<'category' | 'limit'>('category', 'asc');

  if (!user || loading) return <p className="muted">Loading…</p>;
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const activeCategories = categories.filter((c) => c.active !== false);
  const sortedBudgets = sortRows(budgets, (b) => {
    if (sortCol === 'limit') return b.monthly_limit;
    const cat = b.category_id ? catMap.get(b.category_id) : null;
    return cat ? cat.name : '';
  }, sortDir);

  return (
    <div>
      <DeleteModal
        open={pendingDelete !== null}
        itemLabel="Budget"
        onConfirm={() => {
          if (pendingDelete) handleDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <h1>Budgets</h1>
      <p className="muted">Set a monthly limit overall or per category. Dashboard will warn at 80% and flag overspend.</p>

      {loadError && <p style={{ color: 'var(--bad)', marginBottom: 12 }}>{loadError}</p>}
      <form onSubmit={handleSave} noValidate className="card">
        {editing && (
          <p className="muted" style={{ marginTop: 0 }}>
            Editing budget for <strong>{editing.category_id ? (catMap.get(editing.category_id)?.name ?? 'Unknown') : 'Overall'}</strong>
          </p>
        )}
        <div className="grid cols-3">
          <label>
            <div className="muted">Category</div>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={editing !== null}>
              <option value="">Overall (any category)</option>
              {activeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <div className="muted">Monthly Limit</div>
            <input
              type="number"
              step="0.01"
              min="0"
              value={limit}
              onChange={(e) => { setLimit(e.target.value); setLimitError(null); }}
              aria-invalid={!!limitError}
              required
            />
            {limitError && <p className="field-error">{limitError}</p>}
          </label>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <button type="submit" className="primary" style={{ flex: 1 }}>
              {editing ? 'Update Budget' : 'Save Budget'}
            </button>
            {editing && (
              <button type="button" className="ghost" style={{ flex: 1 }} onClick={handleCancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Current Budgets</h2>
        {budgets.length === 0 ? (
          <p className="muted">No budgets set.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleSort('category')}>Category <SortIcon col="category" sortCol={sortCol} sortDir={sortDir} /></th>
                  <th className="sortable" onClick={() => handleSort('limit')} style={{ textAlign: 'right' }}>Monthly Limit <SortIcon col="limit" sortCol={sortCol} sortDir={sortDir} /></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedBudgets.map((b) => {
                  const cat = b.category_id ? catMap.get(b.category_id) : null;
                  return (
                    <tr key={b.id}>
                      <td>{cat ? `${cat.icon ?? ''} ${cat.name}` : 'Overall'}</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(b.monthly_limit)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                          <button
                            className="ghost"
                            style={{ width: 'auto' }}
                            onClick={() => handleEdit(b)}
                          >
                            Edit
                          </button>
                          <button
                            className="danger"
                            style={{ width: 'auto' }}
                            onClick={() => setPendingDelete(b)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
