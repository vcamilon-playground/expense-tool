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
import TrendChart from '@/components/TrendChart';
import CategoryChart from '@/components/CategoryChart';

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

  const catChartData = month.by_category.map((c) => ({
    name: c.category_name,
    total: c.total,
  }));

  return (
    <div>
      <h1>Dashboard</h1>

      {/* KPIs */}
      <SummaryCards day={day} week={week} month={month} year={year} />

      {/* Budget Status */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Budget Status</h2>
        <BudgetAlerts statuses={statuses} />
      </div>

      {/* This Month by Category — vertical bar chart */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>This Month by Category</h2>
        <CategoryChart data={catChartData} />
      </div>

      {/* 6-Month Spending Trend */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>6-Month Trend</h2>
        <TrendChart expenses={expenses} budgets={budgets} />
      </div>

      {/* AI Insight */}
      <InsightCard expenses={expenses} />
    </div>
  );
}
