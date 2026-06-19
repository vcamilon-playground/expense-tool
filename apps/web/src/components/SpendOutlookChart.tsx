'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney, spendOutlook } from '@expense/shared';
import type { Budget, Expense, RecurringExpense } from '@expense/shared';

type Props = { expenses: Expense[]; recurring: RecurringExpense[]; budgets: Budget[] };

function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

const tooltipStyle = {
  background: 'var(--panel)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontSize: 13,
};

export default function SpendOutlookChart({ expenses, recurring, budgets }: Props) {
  const { points, budget } = spendOutlook(expenses, recurring, budgets);

  const accent = cssVar('--accent', '#3b6fd4');
  const border = cssVar('--border', '#2a3447');
  const muted = cssVar('--muted', '#8a96ad');

  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={border} vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `₱${v.toLocaleString()}`}
            width={72}
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatMoney(value), name]}
            contentStyle={tooltipStyle}
            labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} formatter={(v: string) => <span style={{ color: muted }}>{v}</span>} />
          {budget > 0 && (
            <ReferenceLine
              y={budget}
              stroke={accent}
              strokeDasharray="5 4"
              label={{ value: 'Budget', position: 'insideTopRight', fill: muted, fontSize: 11 }}
            />
          )}
          <Bar name="Actual" dataKey="actual" fill={accent} radius={[4, 4, 0, 0]} maxBarSize={48} />
          <Bar name="Committed" dataKey="committed" stackId="forecast" fill={accent} fillOpacity={0.85} maxBarSize={48} />
          <Bar name="Projected" dataKey="variable" stackId="forecast" fill={accent} fillOpacity={0.3} radius={[4, 4, 0, 0]} maxBarSize={48} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
