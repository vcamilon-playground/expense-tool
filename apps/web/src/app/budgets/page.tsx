'use client';

import { useEffect, useState } from 'react';
import type { Budget, Category } from '@expense/shared';
import { formatMoney } from '@expense/shared';
import { deleteBudget, listBudgets, listCategories, upsertBudget } from '@/lib/db';

export default function BudgetsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    const [c, b] = await Promise.all([listCategories(), listBudgets()]);
    setCategories(c);
    setBudgets(b);
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(limit);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setErr('Enter a valid limit');
      return;
    }
    setErr(null);
    await upsertBudget({ category_id: categoryId || null, monthly_limit: parsed });
    setLimit('');
    setCategoryId('');
    await reload();
  }

  async function handleDelete(id: string) {
    await deleteBudget(id);
    await reload();
  }

  if (loading) return <p className="muted">Loading…</p>;
  const catMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <div>
      <h1>Budgets</h1>
      <p className="muted">Set a monthly limit overall or per category. Dashboard will warn at 80% and flag overspend.</p>

      <form onSubmit={handleSave} className="card">
        <div className="grid cols-3">
          <label>
            <div className="muted">Category</div>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Overall (any category)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <div className="muted">Monthly limit</div>
            <input
              type="number"
              step="0.01"
              min="0"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              required
            />
          </label>
          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button type="submit" className="primary">Save budget</button>
          </div>
        </div>
        {err && <p style={{ color: 'var(--bad)' }}>{err}</p>}
      </form>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Current budgets</h2>
        {budgets.length === 0 ? (
          <p className="muted">No budgets set.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Monthly limit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {budgets.map((b) => {
                const cat = b.category_id ? catMap.get(b.category_id) : null;
                return (
                  <tr key={b.id}>
                    <td>{cat ? `${cat.icon ?? ''} ${cat.name}` : 'Overall'}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(b.monthly_limit)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="danger"
                        onClick={() => {
                          if (confirm('Delete budget?')) handleDelete(b.id);
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
        )}
      </div>
    </div>
  );
}
