'use client';

import {
  Bar,
  Cell,
  ComposedChart,
  CartesianGrid,
  Line,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney } from '@expense/shared';
import type { Budget, Expense } from '@expense/shared';

type Props = { expenses: Expense[]; budgets: Budget[] };
type Point = { month: string; Spent: number; Budget?: number };

function barColor(spent: number, budget?: number): string {
  if (!budget || budget === 0) return '#5b8def';
  const pct = spent / budget;
  if (pct > 0.90) return '#ef6f6c'; // red
  if (pct > 0.75) return '#f6c177'; // amber
  return '#4cc38a';                  // green
}

function buildTrend(expenses: Expense[], budgets: Budget[]): Point[] {
  const overall = budgets.find((b) => b.category_id === null);
  const budgetLimit = overall
    ? overall.monthly_limit
    : budgets.reduce((s, b) => s + b.monthly_limit, 0);

  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const spent = expenses
      .filter((e) => e.occurred_at.startsWith(key))
      .reduce((s, e) => s + (e.conversion_rate ? e.amount * e.conversion_rate : e.amount), 0);
    const point: Point = { month: label, Spent: Math.round(spent) };
    if (budgetLimit > 0) point.Budget = Math.round(budgetLimit);
    return point;
  });
}

const tooltipStyle = {
  background: 'var(--panel)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontSize: 13,
};

export default function TrendChart({ expenses, budgets }: Props) {
  const data = buildTrend(expenses, budgets);
  const hasBudget = data.some((d) => d.Budget);

  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3447" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: '#8a96ad', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#8a96ad', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `₱${v.toLocaleString()}`}
            width={76}
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatMoney(value), name]}
            contentStyle={tooltipStyle}
            labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(v: string) => <span style={{ color: 'var(--muted)' }}>{v}</span>}
          />
          <Bar dataKey="Spent" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data.map((entry, i) => (
              <Cell key={i} fill={barColor(entry.Spent, entry.Budget)} />
            ))}
          </Bar>
          {hasBudget && (
            <Line
              dataKey="Budget"
              stroke="#4cc38a"
              strokeWidth={2}
              dot={false}
              strokeDasharray="6 3"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
