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

  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3447" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#8a96ad', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={data.length > 4 ? -30 : 0}
            textAnchor={data.length > 4 ? 'end' : 'middle'}
            height={data.length > 4 ? 48 : 30}
          />
          <YAxis
            tick={{ fill: '#8a96ad', fontSize: 11 }}
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
          <Bar dataKey="total" fill="#5b8def" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
