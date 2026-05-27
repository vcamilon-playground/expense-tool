'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

const links = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H15v-5h-4v5H4a1 1 0 01-1-1z"/>
      </svg>
    ),
  },
  {
    href: '/expenses',
    label: 'Expenses',
    icon: (
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16l3-3 3 3 3-3 3 3 3-3V4a2 2 0 00-2-2z"/>
        <line x1="8" y1="9" x2="16" y2="9"/>
        <line x1="8" y1="13" x2="14" y2="13"/>
      </svg>
    ),
  },
  {
    href: '/reports',
    label: 'Reports',
    icon: (
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="20" x2="6" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="18" y1="20" x2="18" y2="14"/>
      </svg>
    ),
  },
  {
    href: '/budgets',
    label: 'Budgets',
    icon: (
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="16"/>
        <line x1="10" y1="14" x2="14" y2="14"/>
      </svg>
    ),
  },
  {
    href: '/recurring',
    label: 'Recurring',
    icon: (
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 1 21 5 17 9"/>
        <path d="M3 11V9a4 4 0 014-4h14"/>
        <polyline points="7 23 3 19 7 15"/>
        <path d="M21 13v2a4 4 0 01-4 4H3"/>
      </svg>
    ),
  },
];

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    }
    return false;
  });
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  }

  return (
    <nav className={`sidenav${collapsed ? ' collapsed' : ''}`}>
      <Link href="/" className="brand" aria-label="💸 Expenses" onClick={() => setOpen(false)}>
        <span>💸</span>
        <span className="brand-text"> Expenses</span>
      </Link>

      <button
        className="nav-toggle"
        onClick={() => setOpen(!open)}
        aria-label="Toggle navigation"
        aria-expanded={open}
      >
        {open ? '✕' : '☰'}
      </button>

      <div className={`nav-links${open ? ' open' : ''}`}>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={isActive(l.href) ? 'active' : ''}
            title={l.label}
            onClick={() => setOpen(false)}
          >
            <span className="nav-icon">{l.icon}</span>
            <span className="nav-label">{l.label}</span>
          </Link>
        ))}
      </div>

      <div className="nav-bottom">
        <ThemeToggle />
        <button
          className="nav-collapse-btn"
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed ? (
              <polyline points="9 18 15 12 9 6"/>
            ) : (
              <polyline points="15 18 9 12 15 6"/>
            )}
          </svg>
          <span className="nav-collapse-label">{collapsed ? 'Expand' : 'Collapse'}</span>
        </button>
      </div>
    </nav>
  );
}
