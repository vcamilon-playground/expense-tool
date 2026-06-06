'use client';

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
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
  const muted = cssVar('--muted', '#8a96ad');
  const panel = cssVar('--panel', '#ffffff');

  // Monochrome accent palette: each slice fades the accent so the whole chart
  // stays on-theme. Step opacity down across slices (never below 0.35).
  const sliceOpacity = (i: number) => Math.max(0.35, 1 - i * (0.6 / Math.max(1, data.length - 1)));

  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="45%"
            outerRadius="75%"
            paddingAngle={2}
            stroke={panel}
            strokeWidth={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={accent} fillOpacity={sliceOpacity(i)} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [formatMoney(value), name]}
            contentStyle={tooltipStyle}
            labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(v: string) => <span style={{ color: muted }}>{v}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
