'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  budgetStatus,
  formatMoney,
  summarize,
  type Budget,
  type BudgetStatus,
  type Category,
  type Expense,
  type PeriodSummary,
  type RecurringExpense,
} from '@expense/shared';
import { listBudgets, listCategories, listExpenses, listRecurring } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { useDataRefresh } from '@/contexts/DataRefreshContext';
import { useSortState, SortIcon, sortRows } from '@/lib/sort';
import SummaryCards from '@/components/SummaryCards';
import BudgetAlerts from '@/components/BudgetAlerts';
import InsightCard from '@/components/InsightCard';
import TrendChart from '@/components/TrendChart';
import CategoryChart from '@/components/CategoryChart';
import LineTrendChart from '@/components/LineTrendChart';
import MonthEndBanner from '@/components/MonthEndBanner';
import { dailyTrend, weeklyTrend } from '@/lib/trends';

export default function DashboardPage() {
  const { user } = useAuth();
  const { refreshKey } = useDataRefresh();
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [cats, exps, buds, recs] = await Promise.all([
          listCategories(user.id),
          listExpenses(user.id),
          listBudgets(user.id),
          listRecurring(user.id),
        ]);
        setCategories(cats);
        setExpenses(exps);
        setBudgets(buds);
        setRecurring(recs);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, refreshKey]);

  const { sortCol: upSortCol, sortDir: upSortDir, handleSort: upHandleSort } =
    useSortState<'name' | 'amount' | 'due_date' | 'cadence'>('due_date', 'asc');

  const today = new Date().toISOString().slice(0, 10);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const upcoming = useMemo(() => {
    const filtered = recurring.filter(
      (r) => r.active && r.next_charge_date >= today && r.next_charge_date <= cutoffStr,
    );
    return sortRows(filtered, (r) => {
      if (upSortCol === 'name') return r.name;
      if (upSortCol === 'amount') return r.amount;
      if (upSortCol === 'cadence') return r.cadence;
      return r.next_charge_date;
    }, upSortDir);
  }, [recurring, today, cutoffStr, upSortCol, upSortDir]);

  if (!user || loading) return <p className="muted">Loading…</p>;
  if (loadError) return <p style={{ color: 'var(--bad)' }}>{loadError}</p>;

  const day: PeriodSummary = summarize(expenses, categories, 'day');
  const week: PeriodSummary = summarize(expenses, categories, 'week');
  const month: PeriodSummary = summarize(expenses, categories, 'month');
  const year: PeriodSummary = summarize(expenses, categories, 'year');
  const statuses: BudgetStatus[] = budgetStatus(expenses, categories, budgets);

  const catChartData = month.by_category.map((c) => ({
    name: c.category_name,
    total: c.total,
  }));

  return (
    <div>
      <MonthEndBanner />

      {/* KPIs */}
      <SummaryCards day={day} week={week} month={month} year={year} />

      {/* Budget Status */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Budget Status</h2>
        <BudgetAlerts statuses={statuses} />
      </div>

      {/* Daily + Weekly expense trends — side by side on desktop, stacked on mobile */}
      <div className="grid cols-2 chart-grid">
        <div className="card chart-card">
          <h2 style={{ marginTop: 0 }}>Daily Spend — Past 7 Days</h2>
          <LineTrendChart data={dailyTrend(expenses, 7)} />
        </div>
        <div className="card chart-card">
          <h2 style={{ marginTop: 0 }}>Weekly Spend — Past 5 Weeks</h2>
          <LineTrendChart data={weeklyTrend(expenses, 5)} />
        </div>
      </div>

      {/* Charts — side by side on desktop, stacked on mobile */}
      <div className="grid cols-2 chart-grid">
        <div className="card chart-card">
          <h2 style={{ marginTop: 0 }}>This Month by Category</h2>
          <CategoryChart data={catChartData} />
        </div>
        <div className="card chart-card">
          <h2 style={{ marginTop: 0 }}>6-Month Trend</h2>
          <TrendChart expenses={expenses} budgets={budgets} />
        </div>
      </div>

      {/* Upcoming Charges */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Upcoming Charges</h2>
        {upcoming.length === 0 ? (
          <p className="muted">No charges due in the next 30 days.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="sortable" onClick={() => upHandleSort('name')}>Name <SortIcon col="name" sortCol={upSortCol} sortDir={upSortDir} /></th>
                  <th className="sortable" onClick={() => upHandleSort('amount')} style={{ textAlign: 'right' }}>Amount <SortIcon col="amount" sortCol={upSortCol} sortDir={upSortDir} /></th>
                  <th className="sortable" onClick={() => upHandleSort('due_date')}>Due Date <SortIcon col="due_date" sortCol={upSortCol} sortDir={upSortDir} /></th>
                  <th className="sortable" onClick={() => upHandleSort('cadence')}>Cadence <SortIcon col="cadence" sortCol={upSortCol} sortDir={upSortDir} /></th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(r.amount)}</td>
                    <td>{r.next_charge_date}</td>
                    <td style={{ textTransform: 'capitalize' }}>{r.cadence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI Insight */}
      <InsightCard expenses={expenses} />
    </div>
  );
}
