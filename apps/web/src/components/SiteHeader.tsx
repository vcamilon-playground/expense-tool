'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import { listRecurring } from '@/lib/db';
import { computeNotifications, incomeReminderKey } from '@/lib/notifications';

function greetingInfo(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good Morning,', emoji: '🌅' };
  if (h < 18) return { text: 'Good Afternoon,', emoji: '☀️' };
  return { text: 'Good Evening,', emoji: '🌙' };
}

export default function SiteHeader() {
  const { user } = useAuth();
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const dismissed = localStorage.getItem(incomeReminderKey(today)) === 'dismissed';
    listRecurring(user.id).then((items) => {
      setNotifCount(computeNotifications(items, today, dismissed).length);
    });
  }, [user]);

  if (!user) return null;

  const { text, emoji } = greetingInfo();

  return (
    <div className="site-header">
      <p className="site-welcome">{text} {user.first_name}! {emoji}</p>

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
        <Link
          href="/notifications"
          className="site-notif-btn"
          aria-label={`Notifications${notifCount > 0 ? ` (${notifCount})` : ''}`}
          style={{ position: 'relative', textDecoration: 'none' }}
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          {notifCount > 0 && (
            <span className="notif-badge" aria-hidden="true">
              {notifCount > 9 ? '9+' : notifCount}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}
