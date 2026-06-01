'use client';

import { useEffect, useState } from 'react';
import type { Category, RecurringCadence, RecurringExpense, RecurringInput } from '@expense/shared';
import { advanceDate, formatMoney } from '@expense/shared';
import {
  createExpense,
  createRecurring,
  deleteRecurring,
  listCategories,
  listRecurring,
  updateRecurring,
} from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [draft, setDraft] = useState<RecurringInput>(empty);
  const [amountInput, setAmountInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<RecurringExpense | null>(null);

  // Confirmation flow state
  const [pendingItem, setPendingItem] = useState<RecurringExpense | null>(null);
  const [confirmStep, setConfirmStep] = useState<'confirm' | 'reminder' | null>(null);
  const [confirmErr, setConfirmErr] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const isDue = (r: RecurringExpense) => r.active && r.next_charge_date <= today;

  async function reload() {
    if (!user) return;
    const [c, r] = await Promise.all([listCategories(user.id), listRecurring(user.id)]);
    setCategories(c);
    setItems(r);
  }

  useEffect(() => {
    if (!user) return;
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
      if (!user) return;
      await createRecurring(draft, user.id);
    }
    reset();
    await reload();
  }

  function openConfirm(r: RecurringExpense) {
    setPendingItem(r);
    setConfirmStep('confirm');
  }

  function dismissConfirm() {
    setPendingItem(null);
    setConfirmStep(null);
  }

  async function handleConfirmYes() {
    if (!pendingItem || !user) return;
    setConfirmErr(null);
    const item = pendingItem;
    setPendingItem(null);
    setConfirmStep(null);
    try {
      await createExpense(
        {
          amount: item.amount,
          currency: 'PHP',
          conversion_rate: null,
          category_id: item.category_id,
          merchant: item.name,
          description: null,
          occurred_at: item.next_charge_date,
          receipt_url: null,
          source: 'recurring',
        },
        user.id,
      );
      await updateRecurring(item.id, {
        next_charge_date: advanceDate(item.next_charge_date, item.cadence),
      });
    } catch (e) {
      setConfirmErr(e instanceof Error ? e.message : 'Failed to record payment. Please try again.');
    }
    await reload();
  }

  function handleConfirmNo() {
    setConfirmStep('reminder');
  }

  async function handleReminderOk() {
    if (!pendingItem) return;
    await updateRecurring(pendingItem.id, {
      next_charge_date: advanceDate(pendingItem.next_charge_date, pendingItem.cadence),
    });
    setPendingItem(null);
    setConfirmStep(null);
    await reload();
  }

  if (!user || loading) return <p className="muted">Loading…</p>;
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const activeCategories = categories.filter(
    (c) => c.active !== false || c.id === draft.category_id,
  );

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
                {activeCategories.map((c) => (
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

      {/* Confirmation modal — was the expense paid? */}
      {confirmStep === 'confirm' && pendingItem && (
        <div className="modal-overlay" onClick={dismissConfirm}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Confirm Payment</h3>
              <button className="ghost close-btn" onClick={dismissConfirm} aria-label="Close">✕</button>
            </div>
            <p style={{ marginBottom: 20 }}>
              Has <strong>{pendingItem.name}</strong> ({formatMoney(pendingItem.amount)}) already been paid?
            </p>
            <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
              <button className="primary" style={{ width: 'auto' }} onClick={handleConfirmYes}>
                Yes, it&apos;s been paid
              </button>
              <button className="ghost" style={{ width: 'auto' }} onClick={handleConfirmNo}>
                No, not yet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder modal — must click OK, not dismissible any other way */}
      {confirmStep === 'reminder' && pendingItem && (
        <div className="modal-overlay">
          <div className="modal" role="dialog" aria-modal="true">
            <h3 style={{ marginBottom: 12 }}>⚠️ Reminder</h3>
            <p style={{ marginBottom: 8 }}>
              <strong>{pendingItem.name}</strong> ({formatMoney(pendingItem.amount)}) has not been settled.
            </p>
            <p className="muted" style={{ fontSize: 14, marginBottom: 24 }}>
              This expense will <strong>not</strong> be added to your records. Please add it manually to your expenses once you have paid.
            </p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="primary" style={{ width: 'auto' }} onClick={handleReminderOk}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmErr && (
        <div className="banner banner-danger" style={{ marginBottom: 12 }} role="alert">
          {confirmErr}
        </div>
      )}

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
                  const due = isDue(r);
                  return (
                    <tr key={r.id} style={due ? { background: 'rgba(192,57,43,0.04)' } : undefined}>
                      <td data-label="Name">{r.name}</td>
                      <td data-label="Category">{cat ? `${cat.icon ?? ''} ${cat.name}` : '—'}</td>
                      <td data-label="Cadence">{cadenceLabel[r.cadence]}</td>
                      <td data-label="Next Charge">
                        {r.next_charge_date}
                        {due && <span className="pill over" style={{ marginLeft: 6 }}>Due</span>}
                      </td>
                      <td data-label="Amount" style={{ textAlign: 'right' }}>{formatMoney(r.amount)}</td>
                      <td data-label="Active">{r.active ? 'Yes' : 'No'}</td>
                      <td data-label="">
                        {due && (
                          <button
                            className="primary"
                            style={{ width: 'auto' }}
                            onClick={() => openConfirm(r)}
                          >
                            Confirm Payment
                          </button>
                        )}
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
