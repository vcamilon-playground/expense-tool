'use client';

import { useEffect, useState } from 'react';
import type { Debt, DebtKind, Investment, InvestmentType } from '@expense/shared';
import { formatMoney } from '@expense/shared';
import {
  createDebt,
  createInvestment,
  deleteDebt,
  deleteInvestment,
  listDebts,
  listIncomeSources,
  listInvestments,
  updateDebt,
  updateInvestment,
} from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { useDataRefresh } from '@/contexts/DataRefreshContext';
import LoadingScreen from '@/components/LoadingScreen';
import FormModal from '@/components/FormModal';
import DeleteModal from '@/components/DeleteModal';
import { EyeIcon, EyeOffIcon } from '@/components/EyeIcons';
import { AMOUNT_MASK } from '@/lib/income-history';
import { errorMessage } from '@/lib/errors';
import {
  DEBT_KIND_LABELS,
  INVESTMENT_TYPE_LABELS,
  currentYearMonth,
  debtInstallments,
  debtPaidAmount,
  debtPaidPercent,
  debtTotals,
  investmentGain,
  investmentTotals,
  isDebtPaidThisMonth,
  netWorth,
  ordinalDay,
  sortDebtsByDueDay,
} from '@/lib/portfolio';

type InvestmentErrors = { name?: string; principal?: string; current_value?: string };
type DebtErrors = { name?: string; principal?: string; balance?: string; monthly_payment?: string; due_day?: string };

function money(amount: number, visible: boolean): string {
  return visible ? formatMoney(amount) : AMOUNT_MASK;
}

export default function PortfolioPage() {
  const { user } = useAuth();
  const { refreshKey } = useDataRefresh();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [cash, setCash] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Shares the Income page's privacy preference so the eye stays in sync.
  const [amountsVisible, setAmountsVisible] = useState(false);

  const [investmentOpen, setInvestmentOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [investmentName, setInvestmentName] = useState('');
  const [investmentType, setInvestmentType] = useState<InvestmentType>('fund');
  const [investmentPlatform, setInvestmentPlatform] = useState('');
  const [investmentPrincipal, setInvestmentPrincipal] = useState('');
  const [investmentValue, setInvestmentValue] = useState('');
  const [investmentErrors, setInvestmentErrors] = useState<InvestmentErrors>({});
  const [investmentSubmitError, setInvestmentSubmitError] = useState<string | null>(null);
  const [savingInvestment, setSavingInvestment] = useState(false);

  const [debtOpen, setDebtOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [debtName, setDebtName] = useState('');
  const [debtKind, setDebtKind] = useState<DebtKind>('loan');
  const [debtLender, setDebtLender] = useState('');
  const [debtPrincipal, setDebtPrincipal] = useState('');
  const [debtBalance, setDebtBalance] = useState('');
  const [debtMonthly, setDebtMonthly] = useState('');
  const [debtRate, setDebtRate] = useState('');
  const [debtDueDay, setDebtDueDay] = useState('');
  const [debtErrors, setDebtErrors] = useState<DebtErrors>({});
  const [debtSubmitError, setDebtSubmitError] = useState<string | null>(null);
  const [savingDebt, setSavingDebt] = useState(false);

  const [pendingDeleteInvestment, setPendingDeleteInvestment] = useState<Investment | null>(null);
  const [pendingDeleteDebt, setPendingDeleteDebt] = useState<Debt | null>(null);

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

  async function reload(userId: string) {
    const [nextInvestments, nextDebts, sources] = await Promise.all([
      listInvestments(userId),
      listDebts(userId),
      listIncomeSources(userId),
    ]);
    setInvestments(nextInvestments);
    setDebts(nextDebts);
    setCash(sources.reduce((sum, s) => sum + s.balance, 0));
  }

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        await reload(user.id);
        setLoadError(null);
      } catch (e) {
        setLoadError(errorMessage(e, 'Failed to load'));
      } finally {
        setLoading(false);
      }
    })();
  }, [user, refreshKey]);

  function openAddInvestment() {
    setEditingInvestment(null);
    setInvestmentName('');
    setInvestmentType('fund');
    setInvestmentPlatform('');
    setInvestmentPrincipal('');
    setInvestmentValue('');
    setInvestmentErrors({});
    setInvestmentSubmitError(null);
    setInvestmentOpen(true);
  }

  function openEditInvestment(investment: Investment) {
    setEditingInvestment(investment);
    setInvestmentName(investment.name);
    setInvestmentType(investment.type);
    setInvestmentPlatform(investment.platform ?? '');
    setInvestmentPrincipal(String(investment.principal));
    setInvestmentValue(String(investment.current_value));
    setInvestmentErrors({});
    setInvestmentSubmitError(null);
    setInvestmentOpen(true);
  }

  async function handleSaveInvestment(e: React.FormEvent) {
    e.preventDefault();
    if (!user || savingInvestment) return;
    setInvestmentSubmitError(null);

    const newErrors: InvestmentErrors = {};
    if (!investmentName.trim()) newErrors.name = 'Name is required';
    const principal = parseFloat(investmentPrincipal);
    if (!investmentPrincipal) {
      newErrors.principal = 'Amount invested is required';
    } else if (!Number.isFinite(principal) || principal < 0) {
      newErrors.principal = 'Enter a valid amount (0 or more)';
    }
    const currentValue = parseFloat(investmentValue);
    if (!investmentValue) {
      newErrors.current_value = 'Current value is required';
    } else if (!Number.isFinite(currentValue) || currentValue < 0) {
      newErrors.current_value = 'Enter a valid amount (0 or more)';
    }
    if (Object.keys(newErrors).length > 0) {
      setInvestmentErrors(newErrors);
      return;
    }
    setInvestmentErrors({});

    setSavingInvestment(true);
    try {
      const input = {
        name: investmentName.trim(),
        type: investmentType,
        platform: investmentPlatform.trim() || null,
        principal,
        current_value: currentValue,
        active: true,
      };
      if (editingInvestment) {
        await updateInvestment(editingInvestment.id, input);
      } else {
        await createInvestment(input, user.id);
      }
      setInvestmentOpen(false);
      await reload(user.id);
    } catch (err) {
      setInvestmentSubmitError(errorMessage(err, 'Save failed'));
    } finally {
      setSavingInvestment(false);
    }
  }

  function openAddDebt() {
    setEditingDebt(null);
    setDebtName('');
    setDebtKind('loan');
    setDebtLender('');
    setDebtPrincipal('');
    setDebtBalance('');
    setDebtMonthly('');
    setDebtRate('');
    setDebtDueDay('');
    setDebtErrors({});
    setDebtSubmitError(null);
    setDebtOpen(true);
  }

  function openEditDebt(debt: Debt) {
    setEditingDebt(debt);
    setDebtName(debt.name);
    setDebtKind(debt.kind);
    setDebtLender(debt.lender ?? '');
    setDebtPrincipal(String(debt.principal));
    setDebtBalance(String(debt.balance));
    setDebtMonthly(String(debt.monthly_payment));
    setDebtRate(debt.interest_rate === null ? '' : String(debt.interest_rate));
    setDebtDueDay(debt.due_day === null ? '' : String(debt.due_day));
    setDebtErrors({});
    setDebtSubmitError(null);
    setDebtOpen(true);
  }

  async function handleSaveDebt(e: React.FormEvent) {
    e.preventDefault();
    if (!user || savingDebt) return;
    setDebtSubmitError(null);

    const newErrors: DebtErrors = {};
    if (!debtName.trim()) newErrors.name = 'Name is required';
    const principal = parseFloat(debtPrincipal);
    if (!debtPrincipal) {
      newErrors.principal = 'Original amount is required';
    } else if (!Number.isFinite(principal) || principal < 0) {
      newErrors.principal = 'Enter a valid amount (0 or more)';
    }
    const balance = parseFloat(debtBalance);
    if (!debtBalance) {
      newErrors.balance = 'Remaining balance is required';
    } else if (!Number.isFinite(balance) || balance < 0) {
      newErrors.balance = 'Enter a valid amount (0 or more)';
    }
    const monthly = debtMonthly ? parseFloat(debtMonthly) : 0;
    if (debtMonthly && (!Number.isFinite(monthly) || monthly < 0)) {
      newErrors.monthly_payment = 'Enter a valid amount (0 or more)';
    }
    const dueDay = debtDueDay ? parseInt(debtDueDay, 10) : null;
    if (dueDay !== null && (!Number.isFinite(dueDay) || dueDay < 1 || dueDay > 31)) {
      newErrors.due_day = 'Enter a day between 1 and 31';
    }
    if (Object.keys(newErrors).length > 0) {
      setDebtErrors(newErrors);
      return;
    }
    setDebtErrors({});

    const rate = debtRate ? parseFloat(debtRate) : null;

    setSavingDebt(true);
    try {
      const input = {
        name: debtName.trim(),
        kind: debtKind,
        lender: debtLender.trim() || null,
        principal,
        balance,
        monthly_payment: monthly,
        interest_rate: rate !== null && Number.isFinite(rate) ? rate : null,
        due_day: dueDay,
        active: true,
      };
      if (editingDebt) {
        await updateDebt(editingDebt.id, input);
      } else {
        await createDebt(input, user.id);
      }
      setDebtOpen(false);
      await reload(user.id);
    } catch (err) {
      setDebtSubmitError(errorMessage(err, 'Save failed'));
    } finally {
      setSavingDebt(false);
    }
  }

  async function handleDeleteInvestment(id: string) {
    if (!user) return;
    await deleteInvestment(id);
    await reload(user.id);
  }

  async function handleDeleteDebt(id: string) {
    if (!user) return;
    await deleteDebt(id);
    await reload(user.id);
  }

  // Toggle this month's paid status. Pure status flag — it only sets/clears
  // last_paid_month and never touches the balance or net worth (the payment itself
  // is the user's separately-recorded expense).
  async function toggleDebtPaid(debt: Debt) {
    if (!user) return;
    await updateDebt(debt.id, {
      last_paid_month: isDebtPaidThisMonth(debt) ? null : currentYearMonth(),
    });
    await reload(user.id);
  }

  if (!user || loading) return <LoadingScreen />;

  const totals = investmentTotals(investments);
  const owed = debtTotals(debts);
  const net = netWorth(cash, totals.currentValue, owed.balance);
  const gainColor = totals.gain.amount > 0 ? 'var(--ok)' : totals.gain.amount < 0 ? 'var(--bad)' : 'var(--muted)';
  const sortedDebts = sortDebtsByDueDay(debts);

  return (
    <div>
      <DeleteModal
        open={pendingDeleteInvestment !== null}
        itemLabel="Investment"
        onConfirm={() => {
          if (pendingDeleteInvestment) handleDeleteInvestment(pendingDeleteInvestment.id);
          setPendingDeleteInvestment(null);
        }}
        onCancel={() => setPendingDeleteInvestment(null)}
      />
      <DeleteModal
        open={pendingDeleteDebt !== null}
        itemLabel="Debt"
        onConfirm={() => {
          if (pendingDeleteDebt) handleDeleteDebt(pendingDeleteDebt.id);
          setPendingDeleteDebt(null);
        }}
        onCancel={() => setPendingDeleteDebt(null)}
      />

      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ margin: 0 }}>Portfolio</h1>
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
          <button className="primary" style={{ width: 'auto' }} onClick={openAddInvestment}>
            + Add Investment
          </button>
          <button style={{ width: 'auto' }} onClick={openAddDebt}>
            + Add Debt
          </button>
        </div>
      </div>
      <p className="muted">
        What you own and what you owe, in one place. Net worth combines your income balances with
        your investments, minus outstanding debt. Update values yourself — nothing here moves money.
      </p>

      {loadError && <p style={{ color: 'var(--bad)', marginBottom: 12 }}>{loadError}</p>}

      {/* Summary */}
      <div className="grid cols-4 stat-grid">
        <div className="stat card">
          <div className="label muted">Net Worth</div>
          <div className="value" style={{ color: 'var(--accent)' }}>{money(net, amountsVisible)}</div>
        </div>
        <div className="stat card">
          <div className="label muted">Invested</div>
          <div className="value">{money(totals.principal, amountsVisible)}</div>
        </div>
        <div className="stat card">
          <div className="label muted">Current Value</div>
          <div className="value">{money(totals.currentValue, amountsVisible)}</div>
          {totals.principal > 0 && (
            <div style={{ fontSize: 12, marginTop: 2, color: gainColor }}>
              {totals.gain.amount >= 0 ? '+' : '−'}
              {money(Math.abs(totals.gain.amount), amountsVisible)} ({totals.gain.percent.toFixed(1)}%)
            </div>
          )}
        </div>
        <div className="stat card">
          <div className="label muted">Total Debt</div>
          <div className="value" style={{ color: owed.balance > 0 ? 'var(--bad)' : 'var(--text)' }}>
            {money(owed.balance, amountsVisible)}
          </div>
          {owed.monthlyPayment > 0 && (
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              {money(owed.monthlyPayment, amountsVisible)} due monthly
            </div>
          )}
        </div>
      </div>

      {/* Investment form */}
      <FormModal
        open={investmentOpen}
        title={editingInvestment ? 'Edit Investment' : 'Add Investment'}
        onClose={() => setInvestmentOpen(false)}
      >
        <form onSubmit={handleSaveInvestment} noValidate>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <div className="muted" style={{ marginBottom: 4 }}>Name</div>
            <input
              value={investmentName}
              placeholder="e.g. BPI Invest UITF"
              onChange={(e) => { setInvestmentName(e.target.value); setInvestmentErrors((p) => ({ ...p, name: undefined })); }}
              aria-invalid={!!investmentErrors.name}
            />
            {investmentErrors.name && <p className="field-error">{investmentErrors.name}</p>}
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <div className="muted" style={{ marginBottom: 4 }}>Type</div>
            <select value={investmentType} onChange={(e) => setInvestmentType(e.target.value as InvestmentType)}>
              {Object.entries(INVESTMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <div className="muted" style={{ marginBottom: 4 }}>Platform <span style={{ fontWeight: 400 }}>(optional)</span></div>
            <input
              value={investmentPlatform}
              placeholder="e.g. COL Financial, GCash"
              onChange={(e) => setInvestmentPlatform(e.target.value)}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <div className="muted" style={{ marginBottom: 4 }}>Amount invested (₱)</div>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={investmentPrincipal}
              onChange={(e) => { setInvestmentPrincipal(e.target.value); setInvestmentErrors((p) => ({ ...p, principal: undefined })); }}
              aria-invalid={!!investmentErrors.principal}
            />
            {investmentErrors.principal && <p className="field-error">{investmentErrors.principal}</p>}
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <div className="muted" style={{ marginBottom: 4 }}>Current value (₱)</div>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={investmentValue}
              onChange={(e) => { setInvestmentValue(e.target.value); setInvestmentErrors((p) => ({ ...p, current_value: undefined })); }}
              aria-invalid={!!investmentErrors.current_value}
            />
            {investmentErrors.current_value && <p className="field-error">{investmentErrors.current_value}</p>}
          </label>
          {investmentSubmitError && <p className="field-error">{investmentSubmitError}</p>}
          <div className="row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button type="button" className="ghost" style={{ width: 'auto' }} onClick={() => setInvestmentOpen(false)} disabled={savingInvestment}>
              Cancel
            </button>
            <button type="submit" className="primary" style={{ width: 'auto' }} disabled={savingInvestment}>
              {savingInvestment ? 'Saving…' : editingInvestment ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </FormModal>

      {/* Debt form */}
      <FormModal
        open={debtOpen}
        title={editingDebt ? 'Edit Debt' : 'Add Debt'}
        onClose={() => setDebtOpen(false)}
      >
        <form onSubmit={handleSaveDebt} noValidate>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <div className="muted" style={{ marginBottom: 4 }}>Name</div>
            <input
              value={debtName}
              placeholder="e.g. BDO credit card"
              onChange={(e) => { setDebtName(e.target.value); setDebtErrors((p) => ({ ...p, name: undefined })); }}
              aria-invalid={!!debtErrors.name}
            />
            {debtErrors.name && <p className="field-error">{debtErrors.name}</p>}
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <div className="muted" style={{ marginBottom: 4 }}>Kind</div>
            <select value={debtKind} onChange={(e) => setDebtKind(e.target.value as DebtKind)}>
              {Object.entries(DEBT_KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <div className="muted" style={{ marginBottom: 4 }}>Lender <span style={{ fontWeight: 400 }}>(optional)</span></div>
            <input
              value={debtLender}
              placeholder="e.g. BDO, Pag-IBIG"
              onChange={(e) => setDebtLender(e.target.value)}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <div className="muted" style={{ marginBottom: 4 }}>Original amount (₱)</div>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={debtPrincipal}
              onChange={(e) => { setDebtPrincipal(e.target.value); setDebtErrors((p) => ({ ...p, principal: undefined })); }}
              aria-invalid={!!debtErrors.principal}
            />
            {debtErrors.principal && <p className="field-error">{debtErrors.principal}</p>}
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <div className="muted" style={{ marginBottom: 4 }}>Remaining balance (₱)</div>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={debtBalance}
              onChange={(e) => { setDebtBalance(e.target.value); setDebtErrors((p) => ({ ...p, balance: undefined })); }}
              aria-invalid={!!debtErrors.balance}
            />
            {debtErrors.balance && <p className="field-error">{debtErrors.balance}</p>}
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <div className="muted" style={{ marginBottom: 4 }}>Monthly payment (₱) <span style={{ fontWeight: 400 }}>(optional)</span></div>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={debtMonthly}
              onChange={(e) => { setDebtMonthly(e.target.value); setDebtErrors((p) => ({ ...p, monthly_payment: undefined })); }}
              aria-invalid={!!debtErrors.monthly_payment}
            />
            {debtErrors.monthly_payment && <p className="field-error">{debtErrors.monthly_payment}</p>}
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <div className="muted" style={{ marginBottom: 4 }}>Interest rate (% per year) <span style={{ fontWeight: 400 }}>(optional)</span></div>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 6"
              value={debtRate}
              onChange={(e) => setDebtRate(e.target.value)}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <div className="muted" style={{ marginBottom: 4 }}>Due day of month <span style={{ fontWeight: 400 }}>(optional)</span></div>
            <input
              type="number"
              step="1"
              min="1"
              max="31"
              placeholder="e.g. 20"
              value={debtDueDay}
              onChange={(e) => { setDebtDueDay(e.target.value); setDebtErrors((p) => ({ ...p, due_day: undefined })); }}
              aria-invalid={!!debtErrors.due_day}
            />
            {debtErrors.due_day && <p className="field-error">{debtErrors.due_day}</p>}
          </label>
          {debtSubmitError && <p className="field-error">{debtSubmitError}</p>}
          <div className="row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button type="button" className="ghost" style={{ width: 'auto' }} onClick={() => setDebtOpen(false)} disabled={savingDebt}>
              Cancel
            </button>
            <button type="submit" className="primary" style={{ width: 'auto' }} disabled={savingDebt}>
              {savingDebt ? 'Saving…' : editingDebt ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </FormModal>

      {/* Investments */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Investments</h2>
          <span className="muted" style={{ fontSize: 14, fontWeight: 600 }}>{money(totals.currentValue, amountsVisible)}</span>
        </div>
        {investments.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No investments yet. Click "+ Add Investment" to track a fund, stock, or savings plan.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="portfolio-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Invested</th>
                  <th style={{ textAlign: 'right' }}>Value</th>
                  <th style={{ textAlign: 'right' }}>Gain / Loss</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {investments.map((investment) => {
                  const gain = investmentGain(investment);
                  const color = gain.amount > 0 ? 'var(--ok)' : gain.amount < 0 ? 'var(--bad)' : 'var(--muted)';
                  return (
                    <tr key={investment.id}>
                      <td data-label="Name" style={{ fontWeight: 500 }}>
                        {investment.name}
                        {investment.platform && (
                          <div className="muted" style={{ fontSize: 12 }}>{investment.platform}</div>
                        )}
                      </td>
                      <td data-label="Type"><span className="pill">{INVESTMENT_TYPE_LABELS[investment.type]}</span></td>
                      <td data-label="Invested" style={{ textAlign: 'right' }}>{money(investment.principal, amountsVisible)}</td>
                      <td data-label="Value" style={{ textAlign: 'right', fontWeight: 600 }}>{money(investment.current_value, amountsVisible)}</td>
                      <td data-label="Gain / Loss" style={{ textAlign: 'right', color, whiteSpace: 'nowrap' }}>
                        <span>
                          {gain.amount >= 0 ? '+' : '−'}{money(Math.abs(gain.amount), amountsVisible)}
                          {investment.principal > 0 && (
                            <span style={{ fontSize: 11 }}> ({gain.percent.toFixed(1)}%)</span>
                          )}
                        </span>
                      </td>
                      <td data-label="" style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn-sm" onClick={() => openEditInvestment(investment)}>Edit</button>
                          <button className="danger btn-sm" onClick={() => setPendingDeleteInvestment(investment)}>Delete</button>
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

      {/* Debts */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
          <h2 style={{ margin: 0 }}>Debts</h2>
          <span className="muted" style={{ fontSize: 14, fontWeight: 600 }}>
            {money(owed.balance, amountsVisible)} remaining
          </span>
        </div>
        <p className="muted" style={{ margin: '0 0 12px', fontSize: 12 }}>
          "Mark paid" is a monthly status only — it doesn't change your net worth (record the actual payment as an expense).
        </p>
        {debts.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No debts tracked. Click "+ Add Debt" to track a loan, credit card, or installment.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sortedDebts.map((debt) => {
              const percent = debtPaidPercent(debt);
              const barClass = percent >= 100 ? 'bar bar-ok' : percent >= 50 ? 'bar bar-warn' : 'bar bar-over';
              const inst = debtInstallments(debt);
              const paidThisMonth = isDebtPaidThisMonth(debt);
              return (
                <div key={debt.id} data-testid="debt-row" style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ fontWeight: 500 }}>{debt.name}</span>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {' · '}{DEBT_KIND_LABELS[debt.kind]}
                        {debt.lender && ` · ${debt.lender}`}
                        {debt.interest_rate !== null && ` · ${debt.interest_rate}% interest`}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--bad)' }}>{money(debt.balance, amountsVisible)}</div>
                  </div>
                  <div className={barClass} style={{ margin: '9px 0 6px' }}>
                    <div style={{ width: `${percent}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {percent.toFixed(0)}% paid off · {money(debtPaidAmount(debt), amountsVisible)} of {money(debt.principal, amountsVisible)}
                      {debt.monthly_payment > 0 && (
                        <> · {money(debt.monthly_payment, amountsVisible)}/mo
                          {debt.due_day !== null && ` due on the ${ordinalDay(debt.due_day)}`}
                        </>
                      )}
                      {inst && (
                        <> · {inst.remaining} of {inst.total} month{inst.total === 1 ? '' : 's'} left</>
                      )}
                    </span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      {debt.monthly_payment > 0 && (
                        paidThisMonth ? (
                          <>
                            <span className="pill ok" style={{ fontSize: 11 }}>✓ Paid this month</span>
                            <button className="btn-sm" onClick={() => toggleDebtPaid(debt)}>Undo</button>
                          </>
                        ) : (
                          <button className="btn-sm" onClick={() => toggleDebtPaid(debt)}>Mark paid</button>
                        )
                      )}
                      <button className="btn-sm" onClick={() => openEditDebt(debt)}>Edit</button>
                      <button className="danger btn-sm" onClick={() => setPendingDeleteDebt(debt)}>Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
