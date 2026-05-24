'use client';

import { useState } from 'react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/reports', label: 'Reports' },
  { href: '/budgets', label: 'Budgets' },
  { href: '/recurring', label: 'Recurring' },
];

export default function NavBar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="topnav">
      <span className="brand">💸 Expenses</span>
      <button
        className="nav-toggle ghost"
        onClick={() => setOpen(!open)}
        aria-label="Toggle navigation"
        aria-expanded={open}
      >
        {open ? '✕' : '☰'}
      </button>
      <div className={`nav-links${open ? ' open' : ''}`}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
            {l.label}
          </Link>
        ))}
        <ThemeToggle />
      </div>
    </nav>
  );
}
