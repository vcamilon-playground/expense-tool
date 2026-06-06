'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import { listRecurring, listReminders } from '@/lib/db';
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
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const dismissed = localStorage.getItem(incomeReminderKey(today)) === 'dismissed';
    Promise.all([listRecurring(user.id), listReminders(user.id)]).then(([items, reminders]) => {
      setNotifCount(computeNotifications(items, reminders, today, dismissed).length);
    });
  }, [user]);

  if (!user) return null;

  const { text, emoji } = greetingInfo();
  const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();

  function handleAvatarClick() {
    if (!avatarRef.current) return;
    const rect = avatarRef.current.getBoundingClientRect();
    document.dispatchEvent(
      new CustomEvent('open-profile-menu', {
        detail: { top: Math.round(rect.bottom) + 8, left: Math.round(rect.left) },
      }),
    );
  }

  return (
    <div className="site-header">
      {/* Left: avatar (mobile-only, click opens profile popup) + greeting */}
      <div className="site-header-left">
        <div
          className="header-avatar"
          ref={avatarRef}
          role="button"
          tabIndex={0}
          onClick={handleAvatarClick}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleAvatarClick(); }}
          aria-label="Open profile menu"
          aria-haspopup="menu"
          style={{ cursor: 'pointer' }}
        >
          {user.profile_picture_url ? (
            <img src={user.profile_picture_url} alt={user.first_name} />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <p className="site-welcome">{text} {user.first_name}! {emoji}</p>
      </div>

      {/* Right: theme toggle + notifications */}
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
