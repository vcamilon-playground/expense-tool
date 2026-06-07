'use client';

import { formatMoney, type PeriodSummary } from '@expense/shared';

export default function SummaryCards({
  day,
  week,
  month,
  year,
  currency = 'PHP',
}: {
  day: PeriodSummary;
  week: PeriodSummary;
  month: PeriodSummary;
  year: PeriodSummary;
  currency?: string;
}) {
  const items = [
    { label: 'Today', value: day.total, count: day.count },
    { label: 'This Week', value: week.total, count: week.count },
    { label: 'This Month', value: month.total, count: month.count },
    { label: 'This Year', value: year.total, count: year.count },
  ];
  return (
    <div className="grid cols-4 stat-grid">
      {items.map((item) => (
        <div key={item.label} className="card stat">
          <div className="label">{item.label}</div>
          <div className="value">{formatMoney(item.value, currency)}</div>
          <div className="muted" style={{ fontSize: 12 }}>{item.count} expense(s)</div>
        </div>
      ))}
    </div>
  );
}
