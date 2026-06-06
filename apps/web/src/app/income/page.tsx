'use client';

import { useEffect, useState } from 'react';
import type { IncomeSource, IncomeType } from '@expense/shared';
import { formatMoney } from '@expense/shared';
import {
  createIncomeSource,
  deleteIncomeSource,
  listIncomeSources,
  updateIncomeSource,
} from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { errorMessage } from '@/lib/errors';
import DeleteModal from '@/components/DeleteModal';

const typeLabel: Record<IncomeType, string> = {
  bank: 'Bank',
  ewallet: 'E-Wallet',
  cash: 'Cash on Hand',
};

const typeIcon: Record<IncomeType, string> = {
  bank: '🏦',
  ewallet: '📱',
  cash: '💵',
};

export default function IncomePage() {
  const { user } = useAuth();
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<IncomeSource | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formType, setFormType] = useState<IncomeType>('bank');
  const [formName, setFormName] = useState('');
  const [formBalance, setFormBalance] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; balance?: string }>({});

  async function reload() {
    if (!user) return;
    setSources(await listIncomeSources(user.id));
  }

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        await reload();
      } catch (e) {
        setLoadError(errorMessage(e, 'Failed to load'));
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  function startEdit(s: IncomeSource) {
    setEditingId(s.id);
    setFormType(s.type);
    setFormName(s.name ?? '');
    setFormBalance(String(s.balance));
    setFieldErrors({});
    setSubmitError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId(null);
    setFormType('bank');
    setFormName('');
    setFormBalance('');
    setFieldErrors({});
    setSubmitError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const newErrors: { name?: string; balance?: string } = {};

    if (formType !== 'cash' && !formName.trim()) {
      newErrors.name = `${typeLabel[formType]} name is required`;
    }
    const parsedBalance = parseFloat(formBalance);
    if (!formBalance) {
      newErrors.balance = 'Balance is required';
    } else if (!Number.isFinite(parsedBalance) || parsedBalance < 0) {
      newErrors.balance = 'Enter a valid amount (0 or more)';
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }
    setFieldErrors({});

    try {
      if (editingId) {
        await updateIncomeSource(editingId, {
          name: formType !== 'cash' ? formName.trim() : null,
          balance: parsedBalance,
        });
      } else {
        if (!user) return;
        if (formType === 'cash' && sources.some((s) => s.type === 'cash')) {
          setSubmitError('You already have a Cash on Hand entry. Edit it to update the balance.');
          return;
        }
        await createIncomeSource(
          { type: formType, name: formType !== 'cash' ? formName.trim() : null, balance: parsedBalance },
          user.id,
        );
      }
      resetForm();
      await reload();
    } catch (err) {
      setSubmitError(errorMessage(err, 'Save failed'));
    }
  }

  async function handleDelete(id: string) {
    await deleteIncomeSource(id);
    await reload();
  }

  if (!user || loading) return <p className="muted">Loading…</p>;

  const bankSources = sources.filter((s) => s.type === 'bank');
  const ewalletSources = sources.filter((s) => s.type === 'ewallet');
  const cashSource = sources.find((s) => s.type === 'cash');

  const totalBank = bankSources.reduce((sum, s) => sum + s.balance, 0);
  const totalEwallet = ewalletSources.reduce((sum, s) => sum + s.balance, 0);
  const totalCash = cashSource?.balance ?? 0;
  const grandTotal = totalBank + totalEwallet + totalCash;

  return (
    <div>
      <DeleteModal
        open={pendingDelete !== null}
        itemLabel="Income Source"
        onConfirm={() => {
          if (pendingDelete) handleDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <h1>Income</h1>
      <p className="muted">Track your money across bank accounts, e-wallets, and cash. Expenses can be deducted from any source when recorded.</p>

      {loadError && <p style={{ color: 'var(--bad)', marginBottom: 12 }}>{loadError}</p>}

      {/* Summary */}
      <div className="grid cols-4">
        <div className="stat card">
          <div className="label muted">Bank Total</div>
          <div className="value">{formatMoney(totalBank)}</div>
        </div>
        <div className="stat card">
          <div className="label muted">E-Wallet Total</div>
          <div className="value">{formatMoney(totalEwallet)}</div>
        </div>
        <div className="stat card">
          <div className="label muted">Cash on Hand</div>
          <div className="value">{formatMoney(totalCash)}</div>
        </div>
        <div className="stat card">
          <div className="label muted">Grand Total</div>
          <div className="value" style={{ color: 'var(--accent)' }}>{formatMoney(grandTotal)}</div>
        </div>
      </div>

      {/* Add / Edit form */}
      <form onSubmit={handleSave} noValidate className="card">
        <h2 style={{ marginTop: 0 }}>{editingId ? `Edit ${typeLabel[formType]}` : 'Add Income Source'}</h2>
        <div className="grid cols-3">
          <label>
            <div className="muted">Type</div>
            <select
              value={formType}
              onChange={(e) => { setFormType(e.target.value as IncomeType); setFieldErrors({}); }}
              disabled={!!editingId}
            >
              <option value="bank">Bank</option>
              <option value="ewallet">E-Wallet</option>
              <option value="cash">Cash on Hand</option>
            </select>
          </label>

          {formType !== 'cash' && (
            <label>
              <div className="muted">{formType === 'bank' ? 'Bank Name' : 'E-Wallet Name'}</div>
              <input
                value={formName}
                placeholder={formType === 'bank' ? 'e.g. BDO Savings' : 'e.g. GCash'}
                onChange={(e) => { setFormName(e.target.value); setFieldErrors((p) => ({ ...p, name: undefined })); }}
                aria-invalid={!!fieldErrors.name}
              />
              {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
            </label>
          )}

          <label>
            <div className="muted">Balance (₱)</div>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formBalance}
              onChange={(e) => { setFormBalance(e.target.value); setFieldErrors((p) => ({ ...p, balance: undefined })); }}
              aria-invalid={!!fieldErrors.balance}
            />
            {fieldErrors.balance && <p className="field-error">{fieldErrors.balance}</p>}
          </label>
        </div>

        {submitError && <p style={{ color: 'var(--bad)', marginTop: 8 }}>{submitError}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="submit" className="primary" style={{ width: 'auto' }}>
            {editingId ? 'Update' : 'Add'}
          </button>
          {editingId && (
            <button type="button" className="ghost" style={{ width: 'auto' }} onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Bank Accounts */}
      <IncomeSection
        title="Bank Accounts"
        icon="🏦"
        sources={bankSources}
        emptyText="No bank accounts added yet."
        onEdit={startEdit}
        onDelete={setPendingDelete}
      />

      {/* E-Wallets */}
      <IncomeSection
        title="E-Wallets"
        icon="📱"
        sources={ewalletSources}
        emptyText="No e-wallets added yet."
        onEdit={startEdit}
        onDelete={setPendingDelete}
      />

      {/* Cash on Hand */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>💵 Cash on Hand</h2>
        {!cashSource ? (
          <p className="muted">No cash balance set. Select "Cash on Hand" in the form above to add it.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>
              {formatMoney(cashSource.balance)}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-sm" onClick={() => startEdit(cashSource)}>Edit Balance</button>
              <button className="danger btn-sm" onClick={() => setPendingDelete(cashSource)}>Delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IncomeSection({
  title, icon, sources, emptyText, onEdit, onDelete,
}: {
  title: string;
  icon: string;
  sources: IncomeSource[];
  emptyText: string;
  onEdit: (s: IncomeSource) => void;
  onDelete: (s: IncomeSource) => void;
}) {
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>{icon} {title}</h2>
      {sources.length === 0 ? (
        <p className="muted">{emptyText}</p>
      ) : (
        <div className="table-wrap">
          <table className="income-table">
            <thead>
              <tr>
                <th>Name</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(s.balance)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn-sm" onClick={() => onEdit(s)}>Edit</button>
                      <button className="danger btn-sm" onClick={() => onDelete(s)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
