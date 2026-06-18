'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  formatMoney,
  inRange,
  summarize,
  summarizeRange,
  type Category,
  type Expense,
  type ReportPeriod,
} from '@expense/shared';
import { listCategories, listExpenses } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import LoadingScreen from '@/components/LoadingScreen';
import { useDataRefresh } from '@/contexts/DataRefreshContext';
import { useSortState, SortIcon, sortRows } from '@/lib/sort';

type ViewMode = 'preset' | 'custom';

const periods: ReportPeriod[] = ['day', 'week', 'month', 'year'];
const periodLabel: Record<ReportPeriod, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  year: 'Year',
  custom: 'Custom',
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function oneMonthAgoISO(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

function prevRefDate(refDateStr: string, period: ReportPeriod): Date {
  const d = new Date(refDateStr);
  const origDay = d.getDate();
  if (period === 'day') {
    d.setDate(origDay - 1);
  } else if (period === 'week') {
    d.setDate(origDay - 7);
  } else if (period === 'month') {
    d.setMonth(d.getMonth() - 1);
    if (d.getDate() !== origDay) d.setDate(0);
  } else {
    d.setFullYear(d.getFullYear() - 1);
    if (d.getDate() !== origDay) d.setDate(0);
  }
  return d;
}

function shiftBack(fromStr: string, toStr: string): { from: string; to: string } {
  const msPerDay = 86400000;
  const fromMs = new Date(fromStr).getTime();
  const toMs = new Date(toStr).getTime();
  const durationMs = toMs - fromMs;
  const newToMs = fromMs - msPerDay;
  const newFromMs = newToMs - durationMs;
  return {
    from: new Date(newFromMs).toISOString().slice(0, 10),
    to: new Date(newToMs).toISOString().slice(0, 10),
  };
}

function changePct(current: number, prev: number): string {
  if (prev === 0) return current > 0 ? '+100%' : '—';
  const pct = ((current - prev) / prev) * 100;
  return `${pct >= 0 ? '+' : ''}${Math.round(pct)}%`;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const { refreshKey } = useDataRefresh();
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [refDate, setRefDate] = useState<string>(todayISO);
  const [viewMode, setViewMode] = useState<ViewMode>('preset');
  const [customFrom, setCustomFrom] = useState<string>(oneMonthAgoISO);
  const [customTo, setCustomTo] = useState<string>(todayISO);
  const [compare, setCompare] = useState(false);
  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [c, e] = await Promise.all([listCategories(user.id), listExpenses(user.id)]);
        setCategories(c);
        setExpenses(e);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, refreshKey]);

  const summary = useMemo(
    () =>
      viewMode === 'custom'
        ? summarizeRange(expenses, categories, customFrom, customTo)
        : summarize(expenses, categories, period, new Date(refDate), true),
    [viewMode, expenses, categories, period, refDate, customFrom, customTo],
  );

  const periodExpenses = useMemo(
    () => expenses.filter((e) => inRange(e, summary.from, summary.to)),
    [expenses, summary.from, summary.to],
  );

  const prevSummary = useMemo(() => {
    if (!compare) return null;
    if (viewMode === 'custom') {
      const { from, to } = shiftBack(customFrom, customTo);
      return summarizeRange(expenses, categories, from, to);
    }
    return summarize(expenses, categories, period, prevRefDate(refDate, period), true);
  }, [compare, viewMode, expenses, categories, period, refDate, customFrom, customTo]);

  const { sortCol: catSortCol, sortDir: catSortDir, handleSort: catHandleSort } =
    useSortState<'category' | 'count' | 'total' | 'pct'>('total', 'desc');

  if (!user || loading) return <LoadingScreen />;
  if (err) return <p style={{ color: 'var(--bad)' }}>{err}</p>;

  const sortedByCategory = sortRows(summary.by_category, (c) => {
    if (catSortCol === 'category') return c.category_name;
    if (catSortCol === 'count') return c.count;
    if (catSortCol === 'pct') return summary.total > 0 ? c.total / summary.total : 0;
    return c.total;
  }, catSortDir);

  return (
    <div>
      <h1 style={{ marginBottom: 4 }}>Reports</h1>

      <div className="card">
        <button
          type="button"
          className="collapse-header"
          onClick={() => setOptionsExpanded((v) => !v)}
          aria-expanded={optionsExpanded}
        >
          <h2 style={{ margin: 0 }}>Report Options</h2>
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="muted" style={{ fontSize: 13 }}>{summary.from} → {summary.to}</span>
            <span className="collapse-chevron" aria-hidden="true">{optionsExpanded ? '▾' : '▸'}</span>
          </span>
        </button>
        {optionsExpanded && (
        <div style={{ marginTop: 16 }}>
        <div className="row" style={{ gap: 8, marginBottom: 16 }}>
          <button
            className={viewMode === 'preset' ? 'primary' : 'ghost'}
            style={{ width: 'auto' }}
            onClick={() => setViewMode('preset')}
          >
            Preset Period
          </button>
          <button
            className={viewMode === 'custom' ? 'primary' : 'ghost'}
            style={{ width: 'auto' }}
            onClick={() => setViewMode('custom')}
          >
            Date Range
          </button>
        </div>

        {viewMode === 'preset' ? (
          <div className="grid cols-2">
            <label>
              <div className="muted">Period</div>
              <select value={period} onChange={(e) => setPeriod(e.target.value as ReportPeriod)}>
                {periods.map((p) => (
                  <option key={p} value={p}>{periodLabel[p]}</option>
                ))}
              </select>
            </label>
            <label>
              <div className="muted">Reference Date</div>
              <input
                type="date"
                value={refDate}
                onChange={(e) => setRefDate(e.target.value)}
                style={{ maxWidth: '100%' }}
              />
            </label>
          </div>
        ) : (
          <div className="grid cols-2">
            <label>
              <div className="muted">From</div>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{ maxWidth: '100%' }}
              />
            </label>
            <label>
              <div className="muted">To</div>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{ maxWidth: '100%' }}
              />
            </label>
          </div>
        )}

        <div className="row" style={{ marginTop: 12, justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="muted" style={{ margin: 0 }}>
            Showing {summary.from} → {summary.to}
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
            />
            <span className="muted" style={{ fontSize: 13 }}>Compare with previous period</span>
          </label>
        </div>
        </div>
        )}
      </div>

      <div className="grid cols-3 stat-grid">
        <div className="card stat">
          <div className="label">Total</div>
          <div className="value">{formatMoney(summary.total)}</div>
        </div>
        <div className="card stat">
          <div className="label">Expenses</div>
          <div className="value">{summary.count}</div>
        </div>
        <div className="card stat">
          <div className="label">Average</div>
          <div className="value">
            {summary.count ? formatMoney(summary.total / summary.count) : formatMoney(0)}
          </div>
        </div>
      </div>

      {compare && prevSummary && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Period Comparison</h2>
          <p className="muted" style={{ marginTop: 0, marginBottom: 12, fontSize: 13 }}>
            {summary.from} → {summary.to} &nbsp;vs&nbsp; {prevSummary.from} → {prevSummary.to}
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th style={{ textAlign: 'right' }}>Current</th>
                  <th style={{ textAlign: 'right' }}>Previous</th>
                  <th style={{ textAlign: 'right' }}>Change</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(summary.total)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(prevSummary.total)}</td>
                  <td style={{ textAlign: 'right' }}>{changePct(summary.total, prevSummary.total)}</td>
                </tr>
                <tr>
                  <td>Expenses</td>
                  <td style={{ textAlign: 'right' }}>{summary.count}</td>
                  <td style={{ textAlign: 'right' }}>{prevSummary.count}</td>
                  <td style={{ textAlign: 'right' }}>{changePct(summary.count, prevSummary.count)}</td>
                </tr>
                <tr>
                  <td>Average</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatMoney(summary.count ? summary.total / summary.count : 0)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {formatMoney(prevSummary.count ? prevSummary.total / prevSummary.count : 0)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {changePct(
                      summary.count ? summary.total / summary.count : 0,
                      prevSummary.count ? prevSummary.total / prevSummary.count : 0,
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>By Category</h2>
        {summary.by_category.length === 0 ? (
          <p className="muted">No expenses in this period.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="sortable" onClick={() => catHandleSort('category')}>Category <SortIcon col="category" sortCol={catSortCol} sortDir={catSortDir} /></th>
                  <th className="sortable" onClick={() => catHandleSort('count')} style={{ textAlign: 'right' }}>Count <SortIcon col="count" sortCol={catSortCol} sortDir={catSortDir} /></th>
                  <th className="sortable" onClick={() => catHandleSort('total')} style={{ textAlign: 'right' }}>Total <SortIcon col="total" sortCol={catSortCol} sortDir={catSortDir} /></th>
                  <th className="sortable" onClick={() => catHandleSort('pct')} style={{ textAlign: 'right' }}>% <SortIcon col="pct" sortCol={catSortCol} sortDir={catSortDir} /></th>
                </tr>
              </thead>
              <tbody>
                {sortedByCategory.map((c) => (
                  <tr key={c.category_id ?? 'none'}>
                    <td>{c.category_name}</td>
                    <td style={{ textAlign: 'right' }}>{c.count}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(c.total)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {summary.total > 0 ? `${Math.round((c.total / summary.total) * 100)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
