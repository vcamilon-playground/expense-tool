'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  formatMoney,
  summarize,
  type Category,
  type Expense,
  type ReportPeriod,
} from '@expense/shared';
import { listCategories, listExpenses } from '@/lib/db';

const periods: ReportPeriod[] = ['day', 'week', 'month', 'year'];
const periodLabel: Record<ReportPeriod, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  year: 'Year',
};

export default function ReportsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [refDate, setRefDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, e] = await Promise.all([listCategories(), listExpenses()]);
        setCategories(c);
        setExpenses(e);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const summary = useMemo(
    () => summarize(expenses, categories, period, new Date(refDate)),
    [expenses, categories, period, refDate],
  );

  if (loading) return <p className="muted">Loading…</p>;
  if (err) return <p style={{ color: 'var(--bad)' }}>{err}</p>;

  return (
    <div>
      <h1>Reports</h1>

      <div className="card">
        {/* Grid keeps Period and Reference Date side-by-side on desktop, stacked on mobile */}
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
        <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
          Showing {summary.from} → {summary.to}
        </p>
      </div>

      <div className="grid cols-3">
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

      <div className="card">
        <h2 style={{ marginTop: 0 }}>By Category</h2>
        {summary.by_category.length === 0 ? (
          <p className="muted">No expenses in this period.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Count</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>%</th>
                </tr>
              </thead>
              <tbody>
                {summary.by_category.map((c) => (
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
