'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney, monthProjection } from '@expense/shared';
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

export default function MonthProjectionChart({ expenses, recurring, budgets }: Props) {
  const { points, budget, projectedTotal } = monthProjection(expenses, recurring, budgets);

  const accent = cssVar('--accent', '#3b6fd4');
  const border = cssVar('--border', '#2a3447');
  const muted = cssVar('--muted', '#8a96ad');
  const bad = cssVar('--bad', '#c0392b');

  const overBudget = budget > 0 && projectedTotal > budget;
  const projectedColor = overBudget ? bad : muted;

  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={border} vertical={false} />
          <XAxis
            dataKey="day"
            interval={4}
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
            labelFormatter={(d: number) => `Day ${d}`}
            contentStyle={tooltipStyle}
            labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
          />
          {budget > 0 && (
            <ReferenceLine
              y={budget}
              stroke={accent}
              strokeDasharray="5 4"
              label={{ value: 'Budget', position: 'insideTopRight', fill: muted, fontSize: 11 }}
            />
          )}
          <Line
            name="Actual"
            dataKey="actual"
            stroke={accent}
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
          />
          <Line
            name="Projected"
            dataKey="projected"
            stroke={projectedColor}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
