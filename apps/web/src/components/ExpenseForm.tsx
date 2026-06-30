'use client';

import { useState } from 'react';
import type { Category, Expense, ExpenseInput, IncomeSource } from '@expense/shared';

type Props = {
  categories: Category[];
  incomeSources?: IncomeSource[];
  initial?: Expense | null;
  onSubmit: (input: ExpenseInput, incomeSourceId: string | null) => Promise<void>;
  onCancel?: () => void;
  embedded?: boolean;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function ExpenseForm({ categories, incomeSources, initial, onSubmit, onCancel, embedded }: Props) {
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [currency, setCurrency] = useState(initial?.currency ?? 'PHP');
  const [conversionRate, setConversionRate] = useState(
    initial?.conversion_rate ? String(initial.conversion_rate) : '',
  );
  const [categoryId, setCategoryId] = useState<string>(initial?.category_id ?? '');
  const [merchant, setMerchant] = useState(initial?.merchant ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [occurredAt, setOccurredAt] = useState(initial?.occurred_at ?? today());
  const [incomeSourceId, setIncomeSourceId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ amount?: string; date?: string; category?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isOverseas = currency.toUpperCase() !== 'PHP';
  const parsedAmount = parseFloat(amount) || 0;
  const parsedRate = parseFloat(conversionRate) || 0;
  const phpPreview = isOverseas && parsedAmount > 0 && parsedRate > 0
    ? parsedAmount * parsedRate
    : null;

  const isCreating = !initial;
  const bankSources = (incomeSources ?? []).filter((s) => s.type === 'bank');
  const ewalletSources = (incomeSources ?? []).filter((s) => s.type === 'ewallet');
  const cashSource = (incomeSources ?? []).find((s) => s.type === 'cash');
  const hasIncomeSources = (incomeSources ?? []).length > 0;

  function clearFieldError(field: keyof typeof fieldErrors) {
    setFieldErrors((p) => { const n = { ...p }; delete n[field]; return n; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const newErrors: { amount?: string; date?: string; category?: string } = {};
    const parsed = parseFloat(amount);
    if (!amount) {
      newErrors.amount = 'Amount is required';
    } else if (!Number.isFinite(parsed) || parsed < 0) {
      newErrors.amount = 'Enter a valid positive amount';
    }
    if (!occurredAt) {
      newErrors.date = 'Date is required';
    }
    if (!categoryId) {
      newErrors.category = 'Category is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const rate = parseFloat(conversionRate);
      await onSubmit(
        {
          amount: parsed,
          currency: currency.toUpperCase(),
          conversion_rate: isOverseas && Number.isFinite(rate) && rate > 0 ? rate : null,
          category_id: categoryId || null,
          merchant: merchant || null,
          description: description || null,
          occurred_at: occurredAt,
          receipt_url: initial?.receipt_url ?? null,
          source: initial?.source ?? 'manual',
        },
        isCreating ? (incomeSourceId || null) : null,
      );
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={embedded ? undefined : 'card'}>
      <div className="grid cols-3">
        <label>
          <div className="muted">Amount</div>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); clearFieldError('amount'); }}
            aria-invalid={!!fieldErrors.amount}
            required
          />
          {fieldErrors.amount && <p className="field-error">{fieldErrors.amount}</p>}
        </label>
        <label>
          <div className="muted">Currency</div>
          <input value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={4} />
        </label>
        {isOverseas && (
          <label>
            <div className="muted">Rate to PHP</div>
            <input
              type="number"
              step="0.000001"
              min="0"
              placeholder="e.g. 56.50"
              value={conversionRate}
              onChange={(e) => setConversionRate(e.target.value)}
            />
            {phpPreview !== null && (
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                ≈ ₱{phpPreview.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
          </label>
        )}
        <label>
          <div className="muted">Date</div>
          <input
            type="date"
            value={occurredAt}
            onChange={(e) => { setOccurredAt(e.target.value); clearFieldError('date'); }}
            aria-invalid={!!fieldErrors.date}
            required
          />
          {fieldErrors.date && <p className="field-error">{fieldErrors.date}</p>}
        </label>
        <label>
          <div className="muted">Category</div>
          <select
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); clearFieldError('category'); }}
            aria-invalid={!!fieldErrors.category}
            required
          >
            <option value="">— Select category —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon ? `${c.icon} ` : ''}{c.name}
              </option>
            ))}
          </select>
          {fieldErrors.category && <p className="field-error">{fieldErrors.category}</p>}
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
          />
        </label>
        {isCreating && hasIncomeSources && (
          <label style={{ gridColumn: '1 / -1' }}>
            <div className="muted">Deduct from (optional)</div>
            <select value={incomeSourceId} onChange={(e) => setIncomeSourceId(e.target.value)}>
              <option value="">— Don't deduct —</option>
              {bankSources.length > 0 && (
                <optgroup label="Bank">
                  {bankSources.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              )}
              {ewalletSources.length > 0 && (
                <optgroup label="E-Wallet">
                  {ewalletSources.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              )}
              {cashSource && (
                <optgroup label="Cash">
                  <option value={cashSource.id}>Cash on Hand</option>
                </optgroup>
              )}
            </select>
          </label>
        )}
      </div>
      {submitError && <p style={{ color: 'var(--bad)', marginTop: 8 }}>{submitError}</p>}
      <div className="row" style={{ marginTop: 12 }}>
        <button type="submit" className="primary" style={{ width: 'auto' }} disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Update' : 'Add Expense'}
        </button>
        {onCancel && (
          <button type="button" className="ghost" style={{ width: 'auto' }} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
