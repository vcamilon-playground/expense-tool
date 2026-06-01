'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';

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

const ChevronLeft = () => (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const ChevronRight = () => (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

type ConfirmModal = 'logout' | 'switch' | null;

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmModal>(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    if (localStorage.getItem('sidebar-collapsed') === 'true') setCollapsed(true);
  }, []);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  }

  async function handleConfirm() {
    setConfirm(null);
    await logout();
  }

  const initials = user
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : '?';

  return (
    <>
      <nav className={`sidenav${collapsed ? ' collapsed' : ''}`}>

        {/* Brand row: logo + collapse toggle (desktop only) */}
        <div className="brand-row">
          <Link href="/" className="brand" aria-label="💸 Expenses" onClick={() => setOpen(false)}>
            <span>💸</span>
            <span className="brand-text"> Expenses</span>
          </Link>
          <button
            className="brand-collapse-btn"
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </button>
        </div>

        {/* Mobile hamburger toggle */}
        <button
          className="nav-toggle"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          {open ? '✕' : '☰'}
        </button>

        {/* Nav links */}
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

        {/* Bottom: theme toggle + settings + user */}
        <div className="nav-bottom">
          <ThemeToggle />
          <Link
            href="/settings"
            className={`nav-settings-link${isActive('/settings') ? ' active' : ''}`}
            title="Settings"
            onClick={() => setOpen(false)}
          >
            <span className="nav-icon">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
            </span>
            <span className="settings-label">Settings</span>
          </Link>

          {/* User info block */}
          {user && (
            <div className="nav-user" title={`${user.first_name} ${user.last_name}`}>
              <div className="nav-user-avatar">
                {user.profile_picture_url ? (
                  <img src={user.profile_picture_url} alt={user.first_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="nav-user-info">
                <div className="nav-user-name">{user.first_name} {user.last_name}</div>
                <div className="nav-user-handle">@{user.username}</div>
              </div>
            </div>
          )}

          {/* Switch User */}
          <button
            onClick={() => { setOpen(false); setConfirm('switch'); }}
            title="Switch user"
            aria-label="Switch user"
            style={{ gap: 8 }}
          >
            <span className="nav-icon">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                <path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </span>
            <span className="nav-label">Switch User</span>
          </button>

          {/* Logout */}
          <button
            onClick={() => { setOpen(false); setConfirm('logout'); }}
            title="Log out"
            aria-label="Log out"
            style={{ gap: 8 }}
          >
            <span className="nav-icon">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </span>
            <span className="nav-label">Log Out</span>
          </button>
        </div>
      </nav>

      {/* Logout / Switch User confirmation modal */}
      {confirm !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={confirm === 'logout' ? 'Confirm logout' : 'Confirm switch user'}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setConfirm(null); }}
        >
          <div
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '28px 24px',
              maxWidth: 360,
              width: '100%',
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            }}
          >
            <h2 style={{ margin: '0 0 10px', fontSize: 18 }}>
              {confirm === 'logout' ? 'Log out?' : 'Switch user?'}
            </h2>
            <p className="muted" style={{ margin: '0 0 24px', fontSize: 14 }}>
              {confirm === 'logout'
                ? 'Are you sure you want to log out? Your data will remain saved.'
                : 'You will be logged out so another account can sign in. Your data will remain saved.'}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="ghost"
                style={{ width: 'auto' }}
                onClick={() => setConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="danger"
                style={{ width: 'auto' }}
                onClick={handleConfirm}
              >
                {confirm === 'logout' ? 'Log Out' : 'Switch User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
