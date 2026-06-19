'use client';

import {
  Cell,
  Label,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type LabelProps,
  type PieLabelRenderProps,
} from 'recharts';
import { formatMoney } from '@expense/shared';

type Props = { data: { name: string; total: number }[] };

const RADIAN = Math.PI / 180;

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

// Percentage centred inside each slice; hidden on thin slices to avoid clutter.
function renderSliceLabel(props: PieLabelRenderProps) {
  const percent = props.percent ?? 0;
  if (percent < 0.04) return null;
  const cx = Number(props.cx);
  const cy = Number(props.cy);
  const midAngle = Number(props.midAngle);
  const innerRadius = Number(props.innerRadius);
  const outerRadius = Number(props.outerRadius);
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${Math.round(percent * 100)}%`}
    </text>
  );
}

function makeCenterLabel(total: number, textColor: string, mutedColor: string) {
  return function CenterLabel(props: LabelProps) {
    const viewBox = props.viewBox;
    if (!viewBox || !('cx' in viewBox) || viewBox.cx == null || viewBox.cy == null) return null;
    const { cx, cy } = viewBox;
    return (
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
        <tspan x={cx} dy="-0.4em" fontSize={11} fontWeight={600} fill={mutedColor}>Expenses</tspan>
        <tspan x={cx} dy="1.5em" fontSize={14} fontWeight={700} fill={textColor}>{formatMoney(total)}</tspan>
      </text>
    );
  };
}

export default function CategoryChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="muted">No expenses yet this month.</p>;
  }

  const muted = cssVar('--muted', '#8a96ad');
  const text = cssVar('--text', '#1a2236');
  const panel = cssVar('--panel', '#ffffff');
  const accent = cssVar('--accent', '#3b6fd4');

  // Distinct color per category; lead with the active accent, then a fixed
  // multi-hue palette. Cycles if there are more categories than colors.
  const palette = [
    accent, '#16a34a', '#ea580c', '#7c3aed', '#dc2626',
    '#0891b2', '#d97706', '#db2777', '#65a30d', '#4f46e5',
  ];

  const total = data.reduce((sum, d) => sum + d.total, 0);

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
            innerRadius="52%"
            outerRadius="80%"
            paddingAngle={2}
            stroke={panel}
            strokeWidth={2}
            label={renderSliceLabel}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
            <Label position="center" content={makeCenterLabel(total, text, muted)} />
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [formatMoney(value), name]}
            contentStyle={tooltipStyle}
            labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            iconType="circle"
            wrapperStyle={{ fontSize: 12, lineHeight: '1.9' }}
            formatter={(v: string) => <span style={{ color: text }}>{v}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
