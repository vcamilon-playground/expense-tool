'use client';

import Link from 'next/link';

const actions = [
  {
    href: '/expenses?new=1',
    label: 'Add Expense',
    icon: (
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16l3-3 3 3 3-3 3 3 3-3V4a2 2 0 00-2-2z"/>
        <line x1="8" y1="9" x2="16" y2="9"/>
        <line x1="8" y1="13" x2="14" y2="13"/>
      </svg>
    ),
  },
  {
    href: '/budgets?new=1',
    label: 'Add Budget',
    icon: (
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="16"/>
        <line x1="10" y1="14" x2="14" y2="14"/>
      </svg>
    ),
  },
  {
    href: '/recurring?new=1',
    label: 'Add Recurring',
    icon: (
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 1 21 5 17 9"/>
        <path d="M3 11V9a4 4 0 014-4h14"/>
        <polyline points="7 23 3 19 7 15"/>
        <path d="M21 13v2a4 4 0 01-4 4H3"/>
      </svg>
    ),
  },
];

export default function QuickActions() {
  return (
    <div className="quick-actions" aria-label="Quick actions">
      {actions.map((a) => (
        <Link key={a.href} href={a.href} className="quick-action" title={a.label}>
          <span className="quick-action-icon">{a.icon}</span>
          <span className="quick-action-label">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}
