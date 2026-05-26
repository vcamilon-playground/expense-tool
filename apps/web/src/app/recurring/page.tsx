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
import DeleteModal from '@/components/DeleteModal';
import FormModal from '@/components/FormModal';

const cadences: RecurringCadence[] = ['weekly', 'monthly', 'yearly'];
const cadenceLabel: Record<RecurringCadence, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

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
  const [amountInput, setAmountInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<RecurringExpense | null>(null);

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
    setAmountInput(String(r.amount));
    setDraft({
      name: r.name,
      amount: r.amount,
      category_id: r.category_id,
      cadence: r.cadence,
      next_charge_date: r.next_charge_date,
      active: r.active,
    });
    setShowForm(true);
  }

  function reset() {
    setEditingId(null);
    setDraft(empty);
    setAmountInput('');
    setShowForm(false);
    setErr(null);
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
      <DeleteModal
        open={pendingDelete !== null}
        itemLabel="Recurring Expense"
        onConfirm={() => {
          if (pendingDelete) deleteRecurring(pendingDelete.id).then(reload);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <FormModal
        open={showForm}
        title={editingId ? 'Edit Recurring Expense' : 'Add Recurring Expense'}
        onClose={reset}
      >
        <form onSubmit={handleSubmit}>
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
                placeholder="0.00"
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value);
                  setDraft({ ...draft, amount: parseFloat(e.target.value) || 0 });
                }}
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
                  <option key={c} value={c}>{cadenceLabel[c]}</option>
                ))}
              </select>
            </label>
            <label>
              <div className="muted">Category</div>
              <select
                value={draft.category_id ?? ''}
                onChange={(e) => setDraft({ ...draft, category_id: e.target.value || null })}
              >
                <option value="">— Uncategorized —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </label>
            <label>
              <div className="muted">Next Charge Date</div>
              <input
                type="date"
                value={draft.next_charge_date}
                onChange={(e) => setDraft({ ...draft, next_charge_date: e.target.value })}
                required
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
              />
              <span>Active</span>
            </label>
          </div>
          {err && <p style={{ color: 'var(--bad)', marginTop: 8 }}>{err}</p>}
          <div className="row" style={{ marginTop: 16 }}>
            <button type="submit" className="primary" style={{ width: 'auto' }}>
              {editingId ? 'Update' : 'Add Recurring'}
            </button>
            <button type="button" className="ghost" style={{ width: 'auto' }} onClick={reset}>
              Cancel
            </button>
          </div>
        </form>
      </FormModal>

      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ margin: 0 }}>Recurring Expenses</h1>
        <button
          className="primary"
          style={{ width: 'auto' }}
          onClick={() => setShowForm(true)}
        >
          + Add Recurring
        </button>
      </div>
      <p className="muted" style={{ marginBottom: 16 }}>
        Track subscriptions (Netflix, rent, gym). They show on the dashboard so you can plan ahead.
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Current Recurring</h2>
        {items.length === 0 ? (
          <p className="muted">None yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="recurring-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Cadence</th>
                  <th>Next Charge</th>
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
                      <td data-label="Name">{r.name}</td>
                      <td data-label="Category">{cat ? `${cat.icon ?? ''} ${cat.name}` : '—'}</td>
                      <td data-label="Cadence">{cadenceLabel[r.cadence]}</td>
                      <td data-label="Next Charge">{r.next_charge_date}</td>
                      <td data-label="Amount" style={{ textAlign: 'right' }}>{formatMoney(r.amount)}</td>
                      <td data-label="Active">{r.active ? 'Yes' : 'No'}</td>
                      <td data-label="">
                        <button className="ghost" style={{ width: 'auto' }} onClick={() => startEdit(r)}>Edit</button>
                        <button className="danger" style={{ width: 'auto' }} onClick={() => setPendingDelete(r)}>Delete</button>
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
