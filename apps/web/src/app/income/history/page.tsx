'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { IncomeTransaction } from '@expense/shared';
import { formatMoney } from '@expense/shared';
import {
  archiveOldIncomeTransactions,
  deleteOldIncomeTransactions,
  listIncomeTransactions,
} from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { useDataRefresh } from '@/contexts/DataRefreshContext';
import LoadingScreen from '@/components/LoadingScreen';
import { EyeIcon, EyeOffIcon } from '@/components/EyeIcons';
import { errorMessage } from '@/lib/errors';
import {
  AMOUNT_MASK,
  TRANSACTION_TYPE_LABELS,
  groupTransactionsByMonth,
  transactionSign,
} from '@/lib/income-history';

export default function IncomeHistoryPage() {
  const { user } = useAuth();
  const { refreshKey } = useDataRefresh();
  const [transactions, setTransactions] = useState<IncomeTransaction[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [amountsVisible, setAmountsVisible] = useState(false);

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

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // Retention is enforced lazily on load: delete > 6 months, archive > 3.
        await deleteOldIncomeTransactions(user.id);
        await archiveOldIncomeTransactions(user.id);
      } catch (e) {
        console.error('Failed to apply income history retention', e);
      }
      try {
        setTransactions(await listIncomeTransactions(user.id, showArchived));
      } catch (e) {
        setLoadError(errorMessage(e, 'Failed to load'));
      } finally {
        setLoading(false);
      }
    })();
  }, [user, refreshKey]);

  // Re-fetch when the archived filter toggles (after the initial load).
  useEffect(() => {
    if (!user || loading) return;
    listIncomeTransactions(user.id, showArchived)
      .then(setTransactions)
      .catch((e) => setLoadError(errorMessage(e, 'Failed to load')));
  }, [showArchived]);

  if (!user || loading) return <LoadingScreen />;

  const groups = groupTransactionsByMonth(transactions);

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h1 style={{ margin: 0 }}>Transaction History</h1>
        <button
          className="ghost"
          style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={toggleAmounts}
          aria-label={amountsVisible ? 'Hide amounts' : 'Show amounts'}
          title={amountsVisible ? 'Hide amounts' : 'Show amounts'}
        >
          {amountsVisible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      <p className="muted">
        Deductions, top-ups, transfers, and balance edits, grouped by month. Entries are archived after 3 months and deleted after 6.
      </p>

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <Link href="/income" className="ghost" style={{ width: 'auto', display: 'inline-flex', alignItems: 'center' }}>
          ← Back to Income
        </Link>
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

      {loadError && <p style={{ color: 'var(--bad)', marginBottom: 12 }}>{loadError}</p>}

      {groups.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            {showArchived ? 'No transactions yet.' : 'No recent transactions. Toggle "Show archived" to see older entries.'}
          </p>
        </div>
      ) : (
        groups.map((group) => (
          <div className="card" key={group.key}>
            <h2 style={{ margin: '0 0 12px' }}>{group.label}</h2>
            <div className="table-wrap">
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
                  {group.transactions.map((t) => (
                    <TransactionRow key={t.id} t={t} visible={amountsVisible} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
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
