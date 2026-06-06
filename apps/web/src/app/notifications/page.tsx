'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Reminder, ReminderCadence, RecurringCadence, RecurringExpense } from '@expense/shared';
import { advanceDate } from '@expense/shared';
import {
  createReminder,
  deleteReminder,
  listRecurring,
  listReminders,
  updateReminder,
} from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { errorMessage } from '@/lib/errors';
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
  custom_reminder: 'Reminders',
  income_reminder: 'Income Update',
};

const sectionOrder: NotificationType[] = [
  'recurring_due_today',
  'recurring_due_soon',
  'recurring_due_week',
  'custom_reminder',
  'income_reminder',
];

const cadenceLabel: Record<ReminderCadence, string> = {
  once: 'One-time',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Reminder form state
  const [showForm, setShowForm] = useState(false);
  const [reTitle, setReTitle] = useState('');
  const [reCadence, setReCadence] = useState<ReminderCadence>('once');
  const [reDate, setReDate] = useState(new Date().toISOString().slice(0, 10));
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const reminderKey = incomeReminderKey(today);

  async function reload() {
    if (!user) return;
    const [rec, rem] = await Promise.all([listRecurring(user.id), listReminders(user.id)]);
    setRecurring(rec);
    setReminders(rem);
  }

  useEffect(() => {
    if (!user) return;
    setDismissed(localStorage.getItem(reminderKey) === 'dismissed');
    reload()
      .catch((e) => setLoadError(errorMessage(e, 'Failed to load')))
      .finally(() => setLoading(false));
  }, [user]);

  function dismissIncomeReminder() {
    localStorage.setItem(reminderKey, 'dismissed');
    setDismissed(true);
  }

  function resetForm() {
    setReTitle('');
    setReCadence('once');
    setReDate(today);
    setFormError(null);
    setShowForm(false);
  }

  async function handleAddReminder(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!reTitle.trim()) {
      setFormError('Reminder text is required.');
      return;
    }
    if (!reDate) {
      setFormError('A date is required.');
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      await createReminder(
        { title: reTitle.trim(), remind_date: reDate, cadence: reCadence, active: true },
        user.id,
      );
      resetForm();
      await reload();
    } catch (err) {
      setFormError(errorMessage(err, 'Failed to add reminder'));
    } finally {
      setSaving(false);
    }
  }

  async function handleReminderDone(reminderId: string) {
    const rem = reminders.find((r) => r.id === reminderId);
    if (!rem) return;
    if (rem.cadence === 'once') {
      await deleteReminder(rem.id);
    } else {
      await updateReminder(rem.id, {
        remind_date: advanceDate(rem.remind_date, rem.cadence as RecurringCadence),
      });
    }
    await reload();
  }

  async function handleDeleteReminder(id: string) {
    await deleteReminder(id);
    await reload();
  }

  if (!user || loading) return <p className="muted">Loading…</p>;
  if (loadError) return <p style={{ color: 'var(--bad)' }}>{loadError}</p>;

  const notifications = computeNotifications(recurring, reminders, today, dismissed);

  const grouped = sectionOrder.reduce<Record<NotificationType, AppNotification[]>>(
    (acc, type) => {
      acc[type] = notifications.filter((n) => n.type === type);
      return acc;
    },
    {
      recurring_due_today: [],
      recurring_due_soon: [],
      recurring_due_week: [],
      custom_reminder: [],
      income_reminder: [],
    },
  );

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ margin: 0 }}>Notifications</h1>
        <button className="primary" style={{ width: 'auto' }} onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Close' : '+ Add Reminder'}
        </button>
      </div>
      <p className="muted" style={{ marginBottom: 20 }}>
        Recurring payments due soon, your reminders, and monthly income prompts.
      </p>

      {/* Add reminder form */}
      {showForm && (
        <form onSubmit={handleAddReminder} noValidate className="card">
          <h2 style={{ marginTop: 0 }}>New Reminder</h2>
          <div className="grid cols-3">
            <label style={{ gridColumn: '1 / -1' }}>
              <div className="muted">Reminder</div>
              <input
                value={reTitle}
                placeholder="e.g. Pay credit card bill"
                onChange={(e) => { setReTitle(e.target.value); setFormError(null); }}
                aria-invalid={!!formError}
              />
            </label>
            <label>
              <div className="muted">Repeat</div>
              <select value={reCadence} onChange={(e) => setReCadence(e.target.value as ReminderCadence)}>
                <option value="once">One-time</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </label>
            <label>
              <div className="muted">{reCadence === 'once' ? 'Date' : 'First date'}</div>
              <input
                type="date"
                value={reDate}
                onChange={(e) => { setReDate(e.target.value); setFormError(null); }}
              />
            </label>
          </div>
          {formError && <p className="field-error">{formError}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="submit" className="primary" style={{ width: 'auto' }} disabled={saving}>
              {saving ? 'Saving…' : 'Add Reminder'}
            </button>
            <button type="button" className="ghost" style={{ width: 'auto' }} onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

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
                  onDone={n.reminderId ? () => handleReminderDone(n.reminderId!) : undefined}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Manage all reminders */}
      {reminders.length > 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Your Reminders</h2>
          <div className="table-wrap">
            <table className="income-table">
              <thead>
                <tr>
                  <th>Reminder</th>
                  <th>Next</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {reminders.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>
                      {r.title}
                      <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>· {cadenceLabel[r.cadence]}</span>
                    </td>
                    <td>{r.remind_date}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="danger btn-sm" onClick={() => handleDeleteReminder(r.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationCard({
  notification,
  onDismiss,
  onDone,
}: {
  notification: AppNotification;
  onDismiss?: () => void;
  onDone?: () => void;
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
        {onDone && (
          <button className="primary btn-sm" onClick={onDone} style={{ fontSize: 12 }}>
            Done
          </button>
        )}
        {onDismiss && (
          <button
            className="ghost btn-sm"
            onClick={onDismiss}
            style={{ fontSize: 12 }}
          >
            Dismiss
          </button>
        )}
        {!onDone && (
          <Link href={notification.href} className="primary btn-sm" style={{ fontSize: 12, textDecoration: 'none' }}>
            View →
          </Link>
        )}
      </div>
    </div>
  );
}
