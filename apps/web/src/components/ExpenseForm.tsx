'use client';

import { useState } from 'react';
import type { Category, Expense, ExpenseInput } from '@expense/shared';

type Props = {
  categories: Category[];
  initial?: Expense | null;
  onSubmit: (input: ExpenseInput) => Promise<void>;
  onCancel?: () => void;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function ExpenseForm({ categories, initial, onSubmit, onCancel }: Props) {
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [currency, setCurrency] = useState(initial?.currency ?? 'USD');
  const [categoryId, setCategoryId] = useState<string>(initial?.category_id ?? '');
  const [merchant, setMerchant] = useState(initial?.merchant ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [occurredAt, setOccurredAt] = useState(initial?.occurred_at ?? today());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Enter a valid amount');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        amount: parsed,
        currency: currency.toUpperCase(),
        category_id: categoryId || null,
        merchant: merchant || null,
        description: description || null,
        occurred_at: occurredAt,
        receipt_url: initial?.receipt_url ?? null,
        source: initial?.source ?? 'manual',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="grid cols-3">
        <label>
          <div className="muted">Amount</div>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label>
          <div className="muted">Currency</div>
          <input value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={4} />
        </label>
        <label>
          <div className="muted">Date</div>
          <input
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            required
          />
        </label>
        <label>
          <div className="muted">Category</div>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— uncategorized —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon ? `${c.icon} ` : ''}
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <div className="muted">Merchant</div>
          <input value={merchant} onChange={(e) => setMerchant(e.target.value)} />
        </label>
        <label style={{ gridColumn: '1 / -1' }}>
          <div className="muted">Description</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            style={{ width: '100%' }}
          />
        </label>
      </div>
      {error && <p style={{ color: 'var(--bad)' }}>{error}</p>}
      <div className="row" style={{ marginTop: 12 }}>
        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Update' : 'Add expense'}
        </button>
        {onCancel && (
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
