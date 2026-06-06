'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney } from '@expense/shared';

type Props = { data: { name: string; total: number }[] };

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

export default function CategoryChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="muted">No expenses yet this month.</p>;
  }

  const accent = cssVar('--accent', '#3b6fd4');
  const border = cssVar('--border', '#2a3447');
  const muted = cssVar('--muted', '#8a96ad');

  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={border} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={data.length > 4 ? -30 : 0}
            textAnchor={data.length > 4 ? 'end' : 'middle'}
            height={data.length > 4 ? 48 : 30}
          />
          <YAxis
            tick={{ fill: muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `₱${v.toLocaleString()}`}
            width={76}
          />
          <Tooltip
            formatter={(value: number) => [formatMoney(value), 'Total']}
            contentStyle={tooltipStyle}
            labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
          />
          <Bar dataKey="total" fill={accent} radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
