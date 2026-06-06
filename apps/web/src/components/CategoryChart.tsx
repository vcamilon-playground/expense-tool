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

  const muted = cssVar('--muted', '#8a96ad');
  const panel = cssVar('--panel', '#ffffff');
  const accent = cssVar('--accent', '#3b6fd4');

  // Distinct color per category; lead with the active accent, then a fixed
  // multi-hue palette. Cycles if there are more categories than colors.
  const palette = [
    accent, '#16a34a', '#ea580c', '#7c3aed', '#dc2626',
    '#0891b2', '#d97706', '#db2777', '#65a30d', '#4f46e5',
  ];

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
              <Cell key={i} fill={palette[i % palette.length]} />
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
