'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { formatMoney } from '@expense/shared';
import { useAuth } from '@/contexts/AuthContext';
import { useDataRefresh } from '@/contexts/DataRefreshContext';
import LoadingScreen from '@/components/LoadingScreen';
import { ensureMayaSavings, getMayaSavings, setMayaSavingsWeeks } from '@/lib/db';
import {
  currentMayaWeek,
  formatMayaDate,
  initialDoneWeeks,
  mayaSchedule,
  mayaTotals,
} from '@/lib/maya-savings';

const LOAD_ERROR = 'Could not load your Maya savings. Check your connection and refresh.';
const SAVE_ERROR = 'Failed to save — check your connection and try again.';

export default function MayaSavingsPage() {
  const { user } = useAuth();
  const { refreshKey } = useDataRefresh();
  const schedule = useMemo(() => mayaSchedule(), []);
  const [doneWeeks, setDoneWeeks] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // The authoritative done-set, mirrored in a ref so overlapping toggles always
  // build on the latest value (not a stale render closure).
  const doneRef = useRef<Set<number>>(new Set());
  // Persist writes run one-at-a-time through this chain so racing toggles can't
  // clobber each other with stale arrays (the DB ends at the last toggle).
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());

  function applyDone(next: Set<number>) {
    doneRef.current = next;
    setDoneWeeks(next);
  }

  // Done state is persisted per-user in the DB so it syncs across devices.
  // First visit ever (no row): seed every Friday already past today (the
  // ₱100–₱2500 the user has transferred), persist it, then it's manual.
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const seed = initialDoneWeeks(schedule, new Date());
        const weeks = await ensureMayaSavings(user.id, seed);
        applyDone(new Set(weeks));
        setLoadError(null);
      } catch {
        setLoadError(LOAD_ERROR);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, refreshKey, schedule]);

  function toggleWeek(week: number) {
    if (!user) return;
    const userId = user.id;
    setSaveError(null);

    const next = new Set(doneRef.current);
    next.has(week) ? next.delete(week) : next.add(week);
    applyDone(next);

    const snapshot = [...next].sort((a, b) => a - b);
    saveChain.current = saveChain.current
      .catch(() => {})
      .then(() => setMayaSavingsWeeks(userId, snapshot))
      .catch(async () => {
        setSaveError(SAVE_ERROR);
        // Resync to the authoritative DB state so the UI never claims a change
        // that wasn't persisted.
        try {
          const row = await getMayaSavings(userId);
          if (row) applyDone(new Set(row.done_weeks));
        } catch {
          // Network still down — keep the optimistic view; the banner explains.
        }
      });
  }

  if (!user || loading) return <LoadingScreen />;

  if (loadError) {
    return (
      <div>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h1 style={{ margin: 0 }}>💜 Maya Weekly Savings</h1>
          <Link href="/income" className="ghost" style={{ width: 'auto', display: 'inline-flex', alignItems: 'center' }}>
            ← Back to Income
          </Link>
        </div>
        <p style={{ color: 'var(--bad)' }}>{loadError}</p>
      </div>
    );
  }

  const totals = mayaTotals(schedule, doneWeeks);
  const current = currentMayaWeek(schedule, new Date());
  const percent = totals.goal > 0 ? Math.round((totals.saved / totals.goal) * 100) : 0;

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h1 style={{ margin: 0 }}>💜 Maya Weekly Savings</h1>
        <Link href="/income" className="ghost" style={{ width: 'auto', display: 'inline-flex', alignItems: 'center' }}>
          ← Back to Income
        </Link>
      </div>
      <p className="muted">
        Every Friday you transfer to Maya, growing by ₱100 each week — ₱100 on the first Friday
        (Jan 9, 2026), ₱200 the next, and so on through the end of 2026. Tick each week off once
        you&apos;ve made the transfer. Your ticks sync across all your devices.
      </p>

      {saveError && <p className="field-error" style={{ marginBottom: 12 }}>{saveError}</p>}

      {/* Summary */}
      <div className="grid cols-4 stat-grid">
        <div className="stat card">
          <div className="label muted">Total Saved</div>
          <div className="value" style={{ color: 'var(--accent)' }}>{formatMoney(totals.saved)}</div>
        </div>
        <div className="stat card">
          <div className="label muted">Weeks Completed</div>
          <div className="value">{totals.doneCount} / {totals.totalWeeks}</div>
        </div>
        <div className="stat card">
          <div className="label muted">Year-End Goal</div>
          <div className="value">{formatMoney(totals.goal)}</div>
        </div>
        <div className="stat card">
          <div className="label muted">Remaining</div>
          <div className="value">{formatMoney(totals.remaining)}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="muted">Progress to goal</span>
          <span style={{ fontWeight: 600 }}>{percent}%</span>
        </div>
        <div style={{ height: 10, borderRadius: 6, background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{ width: `${percent}%`, height: '100%', background: 'var(--accent)' }} />
        </div>
      </div>

      {/* This week's transfer */}
      {current && (
        <div className="card" style={{ marginTop: 12, borderColor: 'var(--accent)' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="muted" style={{ fontSize: 14 }}>This Friday · Week {current.week}</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{formatMoney(current.amount)}</div>
              <div className="muted" style={{ fontSize: 13 }}>{formatMayaDate(current.date)}</div>
            </div>
            <button
              className={doneWeeks.has(current.week) ? 'ghost' : 'primary'}
              style={{ width: 'auto' }}
              onClick={() => toggleWeek(current.week)}
            >
              {doneWeeks.has(current.week) ? '✓ Saved — Undo' : `Mark ${formatMoney(current.amount)} as saved`}
            </button>
          </div>
        </div>
      )}

      {/* Full schedule */}
      <div className="card" style={{ marginTop: 12 }}>
        <h2 style={{ margin: '0 0 12px' }}>Weekly Schedule</h2>
        <div className="table-wrap">
          <table className="income-table">
            <thead>
              <tr>
                <th>Week</th>
                <th>Friday</th>
                <th style={{ textAlign: 'right' }}>Transfer</th>
                <th style={{ textAlign: 'right' }}>Running Total</th>
                <th style={{ textAlign: 'center' }}>Done</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((w) => {
                const done = doneWeeks.has(w.week);
                const isCurrent = current?.week === w.week;
                return (
                  <tr
                    key={w.week}
                    style={isCurrent ? { background: 'var(--accent-subtle)' } : undefined}
                  >
                    <td style={{ fontWeight: 500 }}>{w.week}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatMayaDate(w.date)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(w.amount)}</td>
                    <td style={{ textAlign: 'right' }} className="muted">{formatMoney(w.cumulative)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <label
                        className="row"
                        style={{ justifyContent: 'center', gap: 6, alignItems: 'center', width: 'auto', margin: 0, cursor: 'pointer' }}
                      >
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={() => toggleWeek(w.week)}
                          aria-label={`Mark week ${w.week} (${formatMayaDate(w.date)}) as saved`}
                          style={{ width: 'auto', margin: 0 }}
                        />
                        {done && <span className="pill ok" style={{ fontSize: 11 }}>Saved</span>}
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
