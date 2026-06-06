'use client';

import { useAuth } from '@/contexts/AuthContext';
import ThemeToggle from './ThemeToggle';

export default function SiteHeader() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="site-header">
      <p className="site-welcome">Welcome {user.first_name}!</p>

      <div className="site-header-search">
        <input
          type="text"
          className="site-search-input"
          placeholder="Search"
          aria-label="Search"
        />
        <svg className="site-search-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </div>

      <div className="site-header-actions">
        <ThemeToggle compact />
        <button className="site-notif-btn" aria-label="Notifications">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
