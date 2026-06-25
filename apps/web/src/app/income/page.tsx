'use client';

import { useEffect, useState } from 'react';
import type { IncomeSource, IncomeTransaction, IncomeType } from '@expense/shared';
import { formatMoney } from '@expense/shared';
import {
  addToIncomeSource,
  archiveOldIncomeTransactions,
  createIncomeSource,
  deleteIncomeSource,
  listIncomeSources,
  listIncomeTransactions,
  transferIncome,
  updateIncomeSource,
} from '@/lib/db';
import { TRANSACTION_TYPE_LABELS, transactionSign } from '@/lib/income-history';
import { useAuth } from '@/contexts/AuthContext';
import LoadingScreen from '@/components/LoadingScreen';
import { useDataRefresh } from '@/contexts/DataRefreshContext';
import { errorMessage } from '@/lib/errors';
import DeleteModal from '@/components/DeleteModal';
import FormModal from '@/components/FormModal';
import BrandLogo from '@/components/BrandLogo';
import { brandLabelFromText, brandsForType, type BrandType } from '@/lib/brand-logos';

const OTHER_BRAND = '__other__';

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

function sourceLabel(s: IncomeSource): string {
  return s.type === 'cash' ? 'Cash on Hand' : (s.name ?? typeLabel[s.type]);
}

const AMOUNT_MASK = '••••••';

// Display-only mask (for amounts inside the section header buttons, which can't
// nest their own eye button — they mirror the matching summary card's key).
function maskText(amount: number, visible: boolean): string {
  return visible ? formatMoney(amount) : AMOUNT_MASK;
}

const EyeIcon = ({ size = 18 }: { size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = ({ size = 18 }: { size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

// An amount with its own inline eye toggle. `visible` comes from the global
// toggle OR a per-item reveal; clicking the eye toggles just this item.
function AmountWithEye({ amount, visible, onToggle }: { amount: number; visible: boolean; onToggle: () => void }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span>{visible ? formatMoney(amount) : AMOUNT_MASK}</span>
      <button
        type="button"
        className="amount-eye"
        onClick={onToggle}
        aria-label={visible ? 'Hide amount' : 'Show amount'}
        title={visible ? 'Hide amount' : 'Show amount'}
      >
        {visible ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
      </button>
    </span>
  );
}

export default function IncomePage() {
  const { user } = useAuth();
  const { refreshKey } = useDataRefresh();
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [transactions, setTransactions] = useState<IncomeTransaction[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<IncomeSource | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formType, setFormType] = useState<IncomeType>('bank');
  const [formBrand, setFormBrand] = useState(''); // '' = none, a brand label, or OTHER_BRAND
  const [formCustomBrand, setFormCustomBrand] = useState('');
  const [formName, setFormName] = useState('');
  const [formBalance, setFormBalance] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ brand?: string; name?: string; balance?: string }>({});

  // Transfer modal state
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [cashExpanded, setCashExpanded] = useState(true);

  // Add-money (top-up) modal state
  const [addMoneyTarget, setAddMoneyTarget] = useState<IncomeSource | null>(null);
  const [addMoneyAmount, setAddMoneyAmount] = useState('');
  const [addMoneyError, setAddMoneyError] = useState<string | null>(null);
  const [addingMoney, setAddingMoney] = useState(false);

  // Privacy: amounts hidden by default; global preference persisted per device,
  // plus a per-item reveal set so individual cards/sources can be peeked.
  const [amountsVisible, setAmountsVisible] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setAmountsVisible(localStorage.getItem('income-amounts-visible') === 'true');
  }, []);

  function toggleAmounts() {
    setAmountsVisible((v) => {
      const next = !v;
      localStorage.setItem('income-amounts-visible', String(next));
      return next;
    });
  }

  const isVisible = (key: string) => amountsVisible || revealed.has(key);
  function toggleKey(key: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function reload() {
    if (!user) return;
    setSources(await listIncomeSources(user.id));
    // History is additive — never let it block the core income view (e.g. if the
    // income_transactions migration has not been applied yet).
    try {
      setTransactions(await listIncomeTransactions(user.id, showArchived));
    } catch (e) {
      console.error('Failed to load income transactions', e);
    }
  }

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        await archiveOldIncomeTransactions(user.id);
      } catch (e) {
        console.error('Failed to archive old income transactions', e);
      }
      try {
        await reload();
      } catch (e) {
        setLoadError(errorMessage(e, 'Failed to load'));
      } finally {
        setLoading(false);
      }
    })();
  }, [user, refreshKey]);

  // Re-fetch history when the archived filter toggles (after the initial load).
  useEffect(() => {
    if (!user || loading) return;
    listIncomeTransactions(user.id, showArchived)
      .then(setTransactions)
      .catch((e) => console.error('Failed to load income transactions', e));
  }, [showArchived]);

  function startEdit(s: IncomeSource) {
    setEditingId(s.id);
    setFormType(s.type);
    // Prefer the stored brand; for legacy rows (no brand) infer it from the name.
    const knownLabel = brandLabelFromText(s.brand ?? s.name);
    if (s.type === 'cash') {
      setFormBrand('');
      setFormCustomBrand('');
    } else if (knownLabel) {
      setFormBrand(knownLabel);
      setFormCustomBrand('');
    } else {
      setFormBrand(OTHER_BRAND);
      setFormCustomBrand(s.brand ?? '');
    }
    setFormName(s.name ?? '');
    setFormBalance(String(s.balance));
    setFieldErrors({});
    setSubmitError(null);
    setFormOpen(true);
  }

  function openAddForm() {
    resetForm();
    setFormOpen(true);
  }

  function resetForm() {
    setEditingId(null);
    setFormType('bank');
    setFormBrand('');
    setFormCustomBrand('');
    setFormName('');
    setFormBalance('');
    setFieldErrors({});
    setSubmitError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const newErrors: { brand?: string; name?: string; balance?: string } = {};

    // For bank/e-wallet, the company comes from the dropdown or a custom entry.
    const effectiveBrand =
      formType === 'cash'
        ? null
        : formBrand === OTHER_BRAND
        ? formCustomBrand.trim()
        : formBrand;

    if (formType !== 'cash' && !effectiveBrand) {
      newErrors.brand =
        formBrand === OTHER_BRAND ? `Enter the ${typeLabel[formType].toLowerCase()} name` : 'Select a company';
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

    // Alias is optional; default the display name to the company.
    const displayName = formType === 'cash' ? null : (formName.trim() || effectiveBrand);

    try {
      if (editingId) {
        await updateIncomeSource(editingId, {
          name: displayName,
          brand: effectiveBrand,
          balance: parsedBalance,
        });
      } else {
        if (!user) return;
        if (formType === 'cash' && sources.some((s) => s.type === 'cash')) {
          setSubmitError('You already have a Cash on Hand entry. Edit it to update the balance.');
          return;
        }
        await createIncomeSource(
          { type: formType, name: displayName, brand: effectiveBrand, balance: parsedBalance },
          user.id,
        );
      }
      resetForm();
      setFormOpen(false);
      await reload();
    } catch (err) {
      setSubmitError(errorMessage(err, 'Save failed'));
    }
  }

  async function handleDelete(id: string) {
    await deleteIncomeSource(id);
    await reload();
  }

  function openTransfer() {
    setTransferFrom('');
    setTransferTo('');
    setTransferAmount('');
    setTransferError(null);
    setTransferOpen(true);
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    setTransferError(null);

    if (!transferFrom || !transferTo) {
      setTransferError('Select both a source and a destination.');
      return;
    }
    if (transferFrom === transferTo) {
      setTransferError('Source and destination must be different.');
      return;
    }
    const amount = parseFloat(transferAmount);
    if (!transferAmount || !Number.isFinite(amount) || amount <= 0) {
      setTransferError('Enter a valid amount greater than zero.');
      return;
    }
    const fromSource = sources.find((s) => s.id === transferFrom);
    if (fromSource && amount > fromSource.balance) {
      setTransferError(`Amount exceeds the ${sourceLabel(fromSource)} balance (${formatMoney(fromSource.balance)}).`);
      return;
    }

    setTransferring(true);
    try {
      await transferIncome(transferFrom, transferTo, amount);
      setTransferOpen(false);
      await reload();
    } catch (err) {
      setTransferError(errorMessage(err, 'Transfer failed'));
    } finally {
      setTransferring(false);
    }
  }

  function openAddMoney(source: IncomeSource) {
    setAddMoneyTarget(source);
    setAddMoneyAmount('');
    setAddMoneyError(null);
  }

  async function handleAddMoney(e: React.FormEvent) {
    e.preventDefault();
    if (!addMoneyTarget || addingMoney) return;
    setAddMoneyError(null);

    const amount = parseFloat(addMoneyAmount);
    if (!addMoneyAmount || !Number.isFinite(amount) || amount <= 0) {
      setAddMoneyError('Enter a valid amount greater than zero.');
      return;
    }

    setAddingMoney(true);
    try {
      await addToIncomeSource(addMoneyTarget.id, amount);
      setAddMoneyTarget(null);
      await reload();
    } catch (err) {
      setAddMoneyError(errorMessage(err, 'Failed to add money'));
    } finally {
      setAddingMoney(false);
    }
  }

  if (!user || loading) return <LoadingScreen />;

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

      {transferOpen && (
        <div className="modal-overlay" onClick={() => setTransferOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Transfer Between Sources</h3>
              <button className="ghost close-btn" onClick={() => setTransferOpen(false)} aria-label="Close">✕</button>
            </div>
            <form onSubmit={handleTransfer} noValidate>
              <label style={{ display: 'block', marginBottom: 12 }}>
                <div className="muted" style={{ marginBottom: 4 }}>From</div>
                <select value={transferFrom} onChange={(e) => { setTransferFrom(e.target.value); setTransferError(null); }}>
                  <option value="">— Select source —</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>{sourceLabel(s)} ({formatMoney(s.balance)})</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'block', marginBottom: 12 }}>
                <div className="muted" style={{ marginBottom: 4 }}>To</div>
                <select value={transferTo} onChange={(e) => { setTransferTo(e.target.value); setTransferError(null); }}>
                  <option value="">— Select destination —</option>
                  {sources.filter((s) => s.id !== transferFrom).map((s) => (
                    <option key={s.id} value={s.id}>{sourceLabel(s)} ({formatMoney(s.balance)})</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'block', marginBottom: 12 }}>
                <div className="muted" style={{ marginBottom: 4 }}>Amount (₱)</div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => { setTransferAmount(e.target.value); setTransferError(null); }}
                />
              </label>
              {transferError && <p className="field-error">{transferError}</p>}
              <div className="row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button type="button" className="ghost" style={{ width: 'auto' }} onClick={() => setTransferOpen(false)} disabled={transferring}>
                  Cancel
                </button>
                <button type="submit" className="primary" style={{ width: 'auto' }} disabled={transferring}>
                  {transferring ? 'Transferring…' : 'Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ margin: 0 }}>Income</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="ghost"
            style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={toggleAmounts}
            aria-label={amountsVisible ? 'Hide amounts' : 'Show amounts'}
            title={amountsVisible ? 'Hide amounts' : 'Show amounts'}
          >
            {amountsVisible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
          <button className="primary" style={{ width: 'auto' }} onClick={openAddForm}>
            + Add Source
          </button>
          {sources.length >= 2 && (
            <button className="ghost" style={{ width: 'auto' }} onClick={openTransfer}>
              ⇄ Transfer
            </button>
          )}
        </div>
      </div>
      <p className="muted">Track your money across bank accounts, e-wallets, and cash. Expenses can be deducted from any source when recorded.</p>

      {loadError && <p style={{ color: 'var(--bad)', marginBottom: 12 }}>{loadError}</p>}

      {/* Summary */}
      <div className="grid cols-4 stat-grid">
        <div className="stat card">
          <div className="label muted">Bank Total</div>
          <div className="value"><AmountWithEye amount={totalBank} visible={isVisible('sum-bank')} onToggle={() => toggleKey('sum-bank')} /></div>
        </div>
        <div className="stat card">
          <div className="label muted">E-Wallet Total</div>
          <div className="value"><AmountWithEye amount={totalEwallet} visible={isVisible('sum-ewallet')} onToggle={() => toggleKey('sum-ewallet')} /></div>
        </div>
        <div className="stat card">
          <div className="label muted">Cash on Hand</div>
          <div className="value"><AmountWithEye amount={totalCash} visible={isVisible('sum-cash')} onToggle={() => toggleKey('sum-cash')} /></div>
        </div>
        <div className="stat card">
          <div className="label muted">Grand Total</div>
          <div className="value" style={{ color: 'var(--accent)' }}><AmountWithEye amount={grandTotal} visible={isVisible('sum-grand')} onToggle={() => toggleKey('sum-grand')} /></div>
        </div>
      </div>

      {/* Add / Edit modal */}
      <FormModal
        open={formOpen}
        title={editingId ? `Edit ${typeLabel[formType]}` : 'Add Income Source'}
        onClose={() => setFormOpen(false)}
      >
        <form onSubmit={handleSave} noValidate>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <div className="muted" style={{ marginBottom: 4 }}>Type</div>
            <select
              value={formType}
              onChange={(e) => {
                setFormType(e.target.value as IncomeType);
                setFormBrand('');
                setFormCustomBrand('');
                setFieldErrors({});
              }}
              disabled={!!editingId}
            >
              <option value="bank">Bank</option>
              <option value="ewallet">E-Wallet</option>
              <option value="cash">Cash on Hand</option>
            </select>
          </label>

          {formType !== 'cash' && (
            <>
              <label style={{ display: 'block', marginBottom: 12 }}>
                <div className="muted" style={{ marginBottom: 4 }}>{formType === 'bank' ? 'Bank' : 'E-Wallet'}</div>
                <select
                  value={formBrand}
                  onChange={(e) => { setFormBrand(e.target.value); setFieldErrors((p) => ({ ...p, brand: undefined })); }}
                  aria-invalid={!!fieldErrors.brand}
                >
                  <option value="">{formType === 'bank' ? 'Select a bank…' : 'Select an e-wallet…'}</option>
                  {brandsForType(formType as BrandType).map((b) => (
                    <option key={b.label} value={b.label}>{b.label}</option>
                  ))}
                  <option value={OTHER_BRAND}>Other (not listed)</option>
                </select>
                {fieldErrors.brand && formBrand !== OTHER_BRAND && <p className="field-error">{fieldErrors.brand}</p>}
              </label>

              {formBrand === OTHER_BRAND && (
                <label style={{ display: 'block', marginBottom: 12 }}>
                  <div className="muted" style={{ marginBottom: 4 }}>{formType === 'bank' ? 'Bank name' : 'E-Wallet name'}</div>
                  <input
                    value={formCustomBrand}
                    placeholder={formType === 'bank' ? 'e.g. Rural Bank of Cebu' : 'e.g. Starpay'}
                    onChange={(e) => { setFormCustomBrand(e.target.value); setFieldErrors((p) => ({ ...p, brand: undefined })); }}
                    aria-invalid={!!fieldErrors.brand}
                  />
                  {fieldErrors.brand && <p className="field-error">{fieldErrors.brand}</p>}
                </label>
              )}

              <label style={{ display: 'block', marginBottom: 12 }}>
                <div className="muted" style={{ marginBottom: 4 }}>Display name <span style={{ fontWeight: 400 }}>(optional)</span></div>
                <input
                  value={formName}
                  placeholder="e.g. Payroll, Savings — defaults to the company"
                  onChange={(e) => { setFormName(e.target.value); setFieldErrors((p) => ({ ...p, name: undefined })); }}
                />
              </label>
            </>
          )}

          <label style={{ display: 'block', marginBottom: 12 }}>
            <div className="muted" style={{ marginBottom: 4 }}>Balance (₱)</div>
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

          {submitError && <p className="field-error">{submitError}</p>}
          <div className="row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button type="button" className="ghost" style={{ width: 'auto' }} onClick={() => setFormOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="primary" style={{ width: 'auto' }}>
              {editingId ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </FormModal>

      {/* Add Money (top-up) modal */}
      <FormModal
        open={addMoneyTarget !== null}
        title={addMoneyTarget ? `Add Money to ${sourceLabel(addMoneyTarget)}` : 'Add Money'}
        onClose={() => setAddMoneyTarget(null)}
      >
        <form onSubmit={handleAddMoney} noValidate>
          {addMoneyTarget && (
            <p className="muted" style={{ marginTop: 0, marginBottom: 12 }}>
              Current balance: {formatMoney(addMoneyTarget.balance)}
            </p>
          )}
          <label style={{ display: 'block', marginBottom: 12 }}>
            <div className="muted" style={{ marginBottom: 4 }}>Amount to add (₱)</div>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={addMoneyAmount}
              onChange={(e) => { setAddMoneyAmount(e.target.value); setAddMoneyError(null); }}
              aria-invalid={!!addMoneyError}
              autoFocus
            />
          </label>
          {addMoneyError && <p className="field-error">{addMoneyError}</p>}
          <div className="row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button type="button" className="ghost" style={{ width: 'auto' }} onClick={() => setAddMoneyTarget(null)} disabled={addingMoney}>
              Cancel
            </button>
            <button type="submit" className="primary" style={{ width: 'auto' }} disabled={addingMoney}>
              {addingMoney ? 'Adding…' : 'Add Money'}
            </button>
          </div>
        </form>
      </FormModal>

      {/* Bank Accounts */}
      <IncomeSection
        title="Bank Accounts"
        icon="🏦"
        sources={bankSources}
        emptyText="No bank accounts added yet."
        onEdit={startEdit}
        onDelete={setPendingDelete}
        onAddMoney={openAddMoney}
        totalKey="sum-bank"
        isVisible={isVisible}
        toggleKey={toggleKey}
      />

      {/* E-Wallets */}
      <IncomeSection
        title="E-Wallets"
        icon="📱"
        sources={ewalletSources}
        emptyText="No e-wallets added yet."
        onEdit={startEdit}
        onDelete={setPendingDelete}
        onAddMoney={openAddMoney}
        totalKey="sum-ewallet"
        isVisible={isVisible}
        toggleKey={toggleKey}
      />

      {/* Cash on Hand */}
      <div className="card">
        <button
          type="button"
          className="collapse-header"
          onClick={() => setCashExpanded((v) => !v)}
          aria-expanded={cashExpanded}
        >
          <h2 style={{ margin: 0 }}>💵 Cash on Hand</h2>
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="muted" style={{ fontSize: 14, fontWeight: 600 }}>{maskText(totalCash, isVisible('sum-cash'))}</span>
            <span className="collapse-chevron" aria-hidden="true">{cashExpanded ? '▾' : '▸'}</span>
          </span>
        </button>
        {cashExpanded && (
          !cashSource ? (
            <p className="muted" style={{ marginBottom: 0, marginTop: 12 }}>No cash balance set. Click "+ Add Source" and choose "Cash on Hand".</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>
                <AmountWithEye amount={cashSource.balance} visible={isVisible(cashSource.id)} onToggle={() => toggleKey(cashSource.id)} />
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="primary btn-sm" style={{ width: 'auto' }} onClick={() => openAddMoney(cashSource)}>+ Add Money</button>
                <button className="btn-sm" onClick={() => startEdit(cashSource)}>Edit Balance</button>
                <button className="danger btn-sm" onClick={() => setPendingDelete(cashSource)}>Delete</button>
              </div>
            </div>
          )
        )}
      </div>

      {/* Transaction History */}
      <div className="card">
        <button
          type="button"
          className="collapse-header"
          onClick={() => setHistoryExpanded((v) => !v)}
          aria-expanded={historyExpanded}
        >
          <h2 style={{ margin: 0 }}>🧾 Transaction History</h2>
          <span className="collapse-chevron" aria-hidden="true">{historyExpanded ? '▾' : '▸'}</span>
        </button>
        {historyExpanded && (
          <>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <p className="muted" style={{ margin: 0 }}>
                Deductions, top-ups, transfers, and balance edits. Kept even after a source is deleted; entries older than 3 months are archived.
              </p>
              <label className="row" style={{ gap: 6, alignItems: 'center', width: 'auto', margin: 0, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  style={{ width: 'auto', margin: 0 }}
                />
                <span className="muted" style={{ fontSize: 14 }}>Show archived</span>
              </label>
            </div>
            {transactions.length === 0 ? (
              <p className="muted" style={{ marginBottom: 0, marginTop: 12 }}>
                {showArchived ? 'No transactions yet.' : 'No recent transactions. Toggle "Show archived" to see older entries.'}
              </p>
            ) : (
              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table className="income-table history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Source</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => (
                      <TransactionRow key={t.id} t={t} visible={isVisible('history')} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TransactionRow({ t, visible }: { t: IncomeTransaction; visible: boolean }) {
  const sign = transactionSign(t.kind, t.balance_before, t.balance_after);
  const created = new Date(t.created_at);
  const dateStr = created.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = created.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const amountText = visible ? formatMoney(t.amount) : AMOUNT_MASK;
  const prefix = sign > 0 ? '+' : sign < 0 ? '−' : '';

  const details =
    t.kind === 'edit' && t.balance_before !== null && t.balance_after !== null
      ? (visible
          ? `${formatMoney(t.balance_before)} → ${formatMoney(t.balance_after)}`
          : `${AMOUNT_MASK} → ${AMOUNT_MASK}`)
      : t.note ?? '';

  return (
    <tr>
      <td style={{ whiteSpace: 'nowrap' }}>
        {dateStr}
        <div className="muted" style={{ fontSize: 12 }}>{timeStr}</div>
      </td>
      <td>{TRANSACTION_TYPE_LABELS[t.kind]}</td>
      <td style={{ fontWeight: 500 }}>
        {t.kind === 'transfer' && t.counterparty_label
          ? `${t.source_label} → ${t.counterparty_label}`
          : t.source_label}
      </td>
      <td style={{ textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap', color: sign < 0 ? 'var(--bad)' : 'var(--text)' }}>
        {prefix}{amountText}
      </td>
      <td className="muted">
        {details}
        {t.archived && <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.8 }}>(archived)</span>}
      </td>
    </tr>
  );
}

function IncomeSection({
  title, icon, sources, emptyText, onEdit, onDelete, onAddMoney, totalKey, isVisible, toggleKey,
}: {
  title: string;
  icon: string;
  sources: IncomeSource[];
  emptyText: string;
  onEdit: (s: IncomeSource) => void;
  onDelete: (s: IncomeSource) => void;
  onAddMoney: (s: IncomeSource) => void;
  totalKey: string;
  isVisible: (key: string) => boolean;
  toggleKey: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const total = sources.reduce((sum, s) => sum + s.balance, 0);

  return (
    <div className="card">
      <button
        type="button"
        className="collapse-header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <h2 style={{ margin: 0 }}>{icon} {title}</h2>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="muted" style={{ fontSize: 14, fontWeight: 600 }}>{maskText(total, isVisible(totalKey))}</span>
          <span className="collapse-chevron" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        </span>
      </button>
      {expanded && (
        sources.length === 0 ? (
          <p className="muted" style={{ marginBottom: 0 }}>{emptyText}</p>
        ) : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
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
                    <td style={{ fontWeight: 500 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <BrandLogo name={s.brand ?? s.name} />
                        {s.name}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}><AmountWithEye amount={s.balance} visible={isVisible(s.id)} onToggle={() => toggleKey(s.id)} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="primary btn-sm" style={{ width: 'auto' }} onClick={() => onAddMoney(s)}>+ Add</button>
                        <button className="btn-sm" onClick={() => onEdit(s)}>Edit</button>
                        <button className="danger btn-sm" onClick={() => onDelete(s)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
