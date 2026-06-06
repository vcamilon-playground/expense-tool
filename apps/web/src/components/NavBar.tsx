'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/AuthContext';
import { useNavigationGuard } from '@/contexts/NavigationGuardContext';

const links = [
  {
    href: '/',
    label: 'Home',
    icon: (
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H15v-5h-4v5H4a1 1 0 01-1-1z"/>
      </svg>
    ),
  },
  {
    href: '/income',
    label: 'Income',
    icon: (
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
        <polyline points="16 7 22 7 22 13"/>
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
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
  },
];

type ConfirmModal = 'logout' | 'switch' | null;
type PopupStyle = { top?: number; bottom?: number; left?: number; right?: number };

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmModal>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [popupStyle, setPopupStyle] = useState<PopupStyle>({});
  const [pendingNavHref, setPendingNavHref] = useState<string | null>(null);
  const [navGuardSaving, setNavGuardSaving] = useState(false);
  const [navGuardErr, setNavGuardErr] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const { guard } = useNavigationGuard();
  const router = useRouter();

  function handleNavClick(href: string, e: React.MouseEvent) {
    if (guard && !isActive(href)) {
      e.preventDefault();
      setOpen(false);
      setProfileMenuOpen(false);
      setPendingNavHref(href);
      setNavGuardErr(null);
    }
  }

  async function handleNavGuardSaveAndLeave() {
    if (!pendingNavHref || !guard) return;
    setNavGuardSaving(true);
    setNavGuardErr(null);
    try {
      await guard.save();
      router.push(pendingNavHref);
      setPendingNavHref(null);
    } catch {
      setNavGuardErr('Failed to save settings. Please try again.');
    } finally {
      setNavGuardSaving(false);
    }
  }

  function handleNavGuardLeave() {
    if (!pendingNavHref) return;
    router.push(pendingNavHref);
    setPendingNavHref(null);
  }

  useEffect(() => {
    if (!profileMenuOpen) return;
    function handleOutside(e: MouseEvent) {
      if (!popupRef.current?.contains(e.target as Node)) setProfileMenuOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [profileMenuOpen]);

  // Listen for profile menu trigger from the SiteHeader avatar button
  useEffect(() => {
    function handleOpen(e: Event) {
      const { top, left } = (e as CustomEvent<{ top: number; left: number }>).detail;
      setPopupStyle({ top, left });
      setProfileMenuOpen((prev) => !prev);
    }
    document.addEventListener('open-profile-menu', handleOpen);
    return () => document.removeEventListener('open-profile-menu', handleOpen);
  }, []);

  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  async function handleConfirm() {
    setConfirm(null);
    await logout();
  }

  const initials = user
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : '?';

  return (
    <>
      <nav aria-label="Sidebar navigation" className="sidenav">

        {/* User profile card at top of sidebar */}
        {user && (
          <div className="sidebar-profile">
            <div className="sidebar-avatar">
              {user.profile_picture_url ? (
                <img src={user.profile_picture_url} alt={user.first_name} />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="sidebar-user-name">{user.first_name} {user.last_name}</div>
            <div className="sidebar-user-handle">@{user.username}</div>
          </div>
        )}

        {/* Mobile hamburger toggle (hidden on desktop) */}
        <button
          className="nav-toggle"
          onClick={() => { setOpen(!open); setProfileMenuOpen(false); }}
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
              onClick={(e) => { handleNavClick(l.href, e); setOpen(false); }}
            >
              <span className="nav-icon">{l.icon}</span>
              <span className="nav-label">{l.label}</span>
            </Link>
          ))}
        </div>

        {/* Sidebar bottom: switch user + logout */}
        <div className="sidebar-bottom">
          <button
            className="sidebar-action-btn"
            onClick={() => { setOpen(false); setConfirm('switch'); }}
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <span className="nav-label">Switch User</span>
          </button>
          <button
            className="sidebar-action-btn sidebar-logout"
            onClick={() => { setOpen(false); setConfirm('logout'); }}
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span className="nav-label">Log Out</span>
          </button>
        </div>
      </nav>

      {/* Profile popup — opened by mobile bottom nav Profile tab */}
      {profileMenuOpen && user && (
        <div
          className="nav-profile-menu"
          role="menu"
          ref={popupRef}
          style={{ position: 'fixed', zIndex: 400, ...popupStyle }}
        >
          <Link
            href="/settings"
            className="nav-profile-menu-item"
            role="menuitem"
            onClick={(e) => { handleNavClick('/settings', e); setProfileMenuOpen(false); setOpen(false); }}
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            Settings
          </Link>

          <button
            className="nav-profile-menu-item"
            role="menuitem"
            onClick={() => { setProfileMenuOpen(false); setOpen(false); setConfirm('switch'); }}
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            Switch User
          </button>
          <button
            className="nav-profile-menu-item danger-item"
            role="menuitem"
            onClick={() => { setProfileMenuOpen(false); setOpen(false); setConfirm('logout'); }}
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Log Out
          </button>
        </div>
      )}

      {/* ── Mobile bottom tab bar (hidden on desktop via CSS) ── */}
      <nav className="bottom-nav" aria-label="Mobile navigation">
        <Link
          href="/"
          className={`bottom-nav-tab${isActive('/') ? ' active' : ''}`}
          onClick={(e) => handleNavClick('/', e)}
          aria-label="Dashboard"
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H15v-5h-4v5H4a1 1 0 01-1-1z"/>
          </svg>
          <span>Home</span>
        </Link>

        <Link
          href="/income"
          className={`bottom-nav-tab${isActive('/income') ? ' active' : ''}`}
          onClick={(e) => handleNavClick('/income', e)}
          aria-label="Income"
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
            <polyline points="16 7 22 7 22 13"/>
          </svg>
          <span>Income</span>
        </Link>

        <Link
          href="/expenses"
          className={`bottom-nav-tab${isActive('/expenses') ? ' active' : ''}`}
          onClick={(e) => handleNavClick('/expenses', e)}
          aria-label="Expenses"
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16l3-3 3 3 3-3 3 3 3-3V4a2 2 0 00-2-2z"/>
            <line x1="8" y1="9" x2="16" y2="9"/>
            <line x1="8" y1="13" x2="14" y2="13"/>
          </svg>
          <span>Expenses</span>
        </Link>

        <Link
          href="/budgets"
          className={`bottom-nav-tab${isActive('/budgets') ? ' active' : ''}`}
          onClick={(e) => handleNavClick('/budgets', e)}
          aria-label="Budgets"
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2"/>
            <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
            <line x1="12" y1="12" x2="12" y2="16"/>
            <line x1="10" y1="14" x2="14" y2="14"/>
          </svg>
          <span>Budgets</span>
        </Link>

        <Link
          href="/recurring"
          className={`bottom-nav-tab${isActive('/recurring') ? ' active' : ''}`}
          onClick={(e) => handleNavClick('/recurring', e)}
          aria-label="Recurring"
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9"/>
            <path d="M3 11V9a4 4 0 014-4h14"/>
            <polyline points="7 23 3 19 7 15"/>
            <path d="M21 13v2a4 4 0 01-4 4H3"/>
          </svg>
          <span>Recurring</span>
        </Link>

        <Link
          href="/reports"
          className={`bottom-nav-tab${isActive('/reports') ? ' active' : ''}`}
          onClick={(e) => handleNavClick('/reports', e)}
          aria-label="Reports"
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="20" x2="6" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="18" y1="20" x2="18" y2="14"/>
          </svg>
          <span>Reports</span>
        </Link>

      </nav>

      {/* Unsaved settings changes modal */}
      {pendingNavHref !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Unsaved changes"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setPendingNavHref(null); }}
        >
          <div
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '28px 24px',
              maxWidth: 380,
              width: '100%',
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            }}
          >
            <h2 style={{ margin: '0 0 10px', fontSize: 18 }}>Unsaved changes</h2>
            <p className="muted" style={{ margin: '0 0 20px', fontSize: 14 }}>
              Your settings changes have not been saved yet. What would you like to do?
            </p>
            {navGuardErr && (
              <p style={{ color: 'var(--bad)', fontSize: 13, margin: '0 0 12px' }}>{navGuardErr}</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="primary"
                onClick={handleNavGuardSaveAndLeave}
                disabled={navGuardSaving}
              >
                {navGuardSaving ? 'Saving…' : 'Save and leave'}
              </button>
              <button
                className="ghost"
                onClick={handleNavGuardLeave}
                disabled={navGuardSaving}
              >
                Leave without saving
              </button>
              <button
                className="ghost"
                onClick={() => { setPendingNavHref(null); setNavGuardErr(null); }}
                disabled={navGuardSaving}
              >
                Stay on page
              </button>
            </div>
          </div>
        </div>
      )}

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
