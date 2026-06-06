'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { RecurringExpense } from '@expense/shared';
import { listRecurring } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import {
  type AppNotification,
  type NotificationType,
  computeNotifications,
  incomeReminderKey,
} from '@/lib/notifications';

const urgencyColor: Record<string, string> = {
  high: 'var(--bad)',
  medium: 'var(--warn)',
  low: 'var(--accent)',
  info: 'var(--ok)',
};

const urgencyBg: Record<string, string> = {
  high: 'rgba(192,57,43,0.06)',
  medium: 'rgba(200,122,21,0.06)',
  low: 'rgba(59,111,212,0.06)',
  info: 'rgba(42,157,92,0.06)',
};

const urgencyLabel: Record<string, string> = {
  high: '🔴',
  medium: '🟡',
  low: '🔵',
  info: 'ℹ️',
};

const sectionTitle: Record<NotificationType, string> = {
  recurring_due_today: 'Due Today',
  recurring_due_soon: 'Due Soon',
  recurring_due_week: 'Upcoming This Week',
  income_reminder: 'Reminders',
};

const sectionOrder: NotificationType[] = [
  'recurring_due_today',
  'recurring_due_soon',
  'recurring_due_week',
  'income_reminder',
];

export default function NotificationsPage() {
  const { user } = useAuth();
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const reminderKey = incomeReminderKey(today);

  useEffect(() => {
    if (!user) return;
    setDismissed(localStorage.getItem(reminderKey) === 'dismissed');
    listRecurring(user.id)
      .then(setRecurring)
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [user]);

  function dismissIncomeReminder() {
    localStorage.setItem(reminderKey, 'dismissed');
    setDismissed(true);
  }

  if (!user || loading) return <p className="muted">Loading…</p>;
  if (loadError) return <p style={{ color: 'var(--bad)' }}>{loadError}</p>;

  const notifications = computeNotifications(recurring, today, dismissed);

  const grouped = sectionOrder.reduce<Record<NotificationType, AppNotification[]>>(
    (acc, type) => {
      acc[type] = notifications.filter((n) => n.type === type);
      return acc;
    },
    {
      recurring_due_today: [],
      recurring_due_soon: [],
      recurring_due_week: [],
      income_reminder: [],
    },
  );

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ margin: 0 }}>Notifications</h1>
        {notifications.length > 0 && (
          <span
            style={{
              background: 'var(--bad)',
              color: '#fff',
              borderRadius: 12,
              padding: '2px 10px',
              fontSize: 13,
              fontWeight: 700,
              alignSelf: 'center',
            }}
          >
            {notifications.length}
          </span>
        )}
      </div>
      <p className="muted" style={{ marginBottom: 24 }}>
        Recurring payments due soon and monthly reminders.
      </p>

      {notifications.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <p style={{ fontWeight: 600, margin: '0 0 6px' }}>You&apos;re all caught up!</p>
          <p className="muted" style={{ margin: 0 }}>No upcoming payments or reminders right now.</p>
        </div>
      )}

      {sectionOrder.map((type) => {
        const items = grouped[type];
        if (items.length === 0) return null;
        return (
          <div key={type} style={{ marginBottom: 24 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
              {sectionTitle[type]}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  onDismiss={n.type === 'income_reminder' ? dismissIncomeReminder : undefined}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NotificationCard({
  notification,
  onDismiss,
}: {
  notification: AppNotification;
  onDismiss?: () => void;
}) {
  return (
    <div
      style={{
        background: urgencyBg[notification.urgency],
        border: `1px solid ${urgencyColor[notification.urgency]}`,
        borderLeft: `4px solid ${urgencyColor[notification.urgency]}`,
        borderRadius: 10,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>
        {urgencyLabel[notification.urgency]}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, marginBottom: 4, color: urgencyColor[notification.urgency] }}>
          {notification.title}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>
          {notification.body}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
        {onDismiss && (
          <button
            className="ghost btn-sm"
            onClick={onDismiss}
            style={{ fontSize: 12 }}
          >
            Dismiss
          </button>
        )}
        <Link href={notification.href} className="primary btn-sm" style={{ fontSize: 12, textDecoration: 'none' }}>
          View →
        </Link>
      </div>
    </div>
  );
}
