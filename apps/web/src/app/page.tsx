'use client';

import { useEffect, useState } from 'react';
import {
  budgetStatus,
  summarize,
  type Budget,
  type BudgetStatus,
  type Category,
  type Expense,
  type PeriodSummary,
} from '@expense/shared';
import { listBudgets, listCategories, listExpenses } from '@/lib/db';
import SummaryCards from '@/components/SummaryCards';
import BudgetAlerts from '@/components/BudgetAlerts';
import InsightCard from '@/components/InsightCard';

export default function DashboardPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [cats, exps, buds] = await Promise.all([
          listCategories(),
          listExpenses(),
          listBudgets(),
        ]);
        setCategories(cats);
        setExpenses(exps);
        setBudgets(buds);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="muted">Loading…</p>;
  if (err) return <p style={{ color: 'var(--bad)' }}>{err}</p>;

  const day: PeriodSummary = summarize(expenses, categories, 'day');
  const week: PeriodSummary = summarize(expenses, categories, 'week');
  const month: PeriodSummary = summarize(expenses, categories, 'month');
  const year: PeriodSummary = summarize(expenses, categories, 'year');
  const statuses: BudgetStatus[] = budgetStatus(expenses, categories, budgets);

  return (
    <div>
      <h1>Dashboard</h1>
      <SummaryCards day={day} week={week} month={month} year={year} />

      <div className="card">
        <h2 style={{ marginTop: 0 }}>This month by category</h2>
        {month.by_category.length === 0 ? (
          <p className="muted">No expenses yet this month.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Count</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {month.by_category.map((c) => (
                  <tr key={c.category_id ?? 'none'}>
                    <td>{c.category_name}</td>
                    <td style={{ textAlign: 'right' }}>{c.count}</td>
                    <td style={{ textAlign: 'right' }}>{c.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Budget status</h2>
        <BudgetAlerts statuses={statuses} />
      </div>

      <InsightCard expenses={expenses} />
    </div>
  );
}
