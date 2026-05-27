'use client';

export default function MonthEndBanner() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = lastDay - now.getDate();

  if (daysLeft > 7) return null;

  const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  const label =
    daysLeft === 0
      ? 'Today is the last day of the month'
      : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left this month`;

  return (
    <div className="banner banner-danger">
      ⚠️ {label} — Please update all your expenses before {monthYear} closes.
    </div>
  );
}
