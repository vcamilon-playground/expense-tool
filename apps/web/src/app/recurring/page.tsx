'use client';

import { useEffect, useState } from 'react';
import type { Category, RecurringCadence, RecurringExpense, RecurringInput } from '@expense/shared';
import { formatMoney } from '@expense/shared';
import {
  createRecurring,
  deleteRecurring,
  listCategories,
  listRecurring,
  updateRecurring,
} from '@/lib/db';

const cadences: RecurringCadence[] = ['weekly', 'monthly', 'yearly'];

const empty: RecurringInput = {
  name: '',
  amount: 0,
  category_id: null,
  cadence: 'monthly',
  next_charge_date: new Date().toISOString().slice(0, 10),
  active: true,
};

export default function RecurringPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [draft, setDraft] = useState<RecurringInput>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    const [c, r] = await Promise.all([listCategories(), listRecurring()]);
    setCategories(c);
    setItems(r);
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

  function startEdit(r: RecurringExpense) {
    setEditingId(r.id);
    setDraft({
      name: r.name,
      amount: r.amount,
      category_id: r.category_id,
      cadence: r.cadence,
      next_charge_date: r.next_charge_date,
      active: r.active,
    });
  }

  function reset() {
    setEditingId(null);
    setDraft(empty);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name || draft.amount <= 0) {
      setErr('Name and a positive amount required');
      return;
    }
    setErr(null);
    if (editingId) {
      await updateRecurring(editingId, draft);
    } else {
      await createRecurring(draft);
    }
    reset();
    await reload();
  }

  if (loading) return <p className="muted">Loading…</p>;
  const catMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <div>
      <h1>Recurring expenses</h1>
      <p className="muted">Track subscriptions (Netflix, rent, gym). They show on the dashboard so you can plan ahead.</p>

      <form onSubmit={handleSubmit} className="card">
        <div className="grid cols-3">
          <label>
            <div className="muted">Name</div>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              required
            />
          </label>
          <label>
            <div className="muted">Amount</div>
            <input
              type="number"
              step="0.01"
              min="0"
              value={draft.amount}
              onChange={(e) => setDraft({ ...draft, amount: parseFloat(e.target.value) || 0 })}
              required
            />
          </label>
          <label>
            <div className="muted">Cadence</div>
            <select
              value={draft.cadence}
              onChange={(e) => setDraft({ ...draft, cadence: e.target.value as RecurringCadence })}
            >
              {cadences.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <div className="muted">Category</div>
            <select
              value={draft.category_id ?? ''}
              onChange={(e) => setDraft({ ...draft, category_id: e.target.value || null })}
            >
              <option value="">— uncategorized —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <div className="muted">Next charge date</div>
            <input
              type="date"
              value={draft.next_charge_date}
              onChange={(e) => setDraft({ ...draft, next_charge_date: e.target.value })}
              required
            />
          </label>
          <label className="row" style={{ alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
              style={{ width: 'auto' }}
            />
            <span>Active</span>
          </label>
        </div>
        {err && <p style={{ color: 'var(--bad)' }}>{err}</p>}
        <div className="row" style={{ marginTop: 12 }}>
          <button type="submit" className="primary">
            {editingId ? 'Update' : 'Add recurring'}
          </button>
          {editingId && (
            <button type="button" className="ghost" onClick={reset}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Current recurring</h2>
        {items.length === 0 ? (
          <p className="muted">None yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Cadence</th>
                  <th>Next charge</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => {
                  const cat = r.category_id ? catMap.get(r.category_id) : null;
                  return (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>{cat ? `${cat.icon ?? ''} ${cat.name}` : '—'}</td>
                      <td>{r.cadence}</td>
                      <td>{r.next_charge_date}</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(r.amount)}</td>
                      <td>{r.active ? 'Yes' : 'No'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="ghost" style={{ width: 'auto' }} onClick={() => startEdit(r)}>Edit</button>{' '}
                        <button
                          className="danger"
                          style={{ width: 'auto' }}
                          onClick={() => {
                            if (confirm('Delete?')) deleteRecurring(r.id).then(reload);
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
          </div>
        )}
      </div>
    </div>
  );
}
