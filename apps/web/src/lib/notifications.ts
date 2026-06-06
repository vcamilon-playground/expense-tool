import type { Reminder, RecurringExpense } from '@expense/shared';
import { formatMoney } from '@expense/shared';

export type NotificationUrgency = 'high' | 'medium' | 'low' | 'info';

export type NotificationType =
  | 'recurring_due_today'
  | 'recurring_due_soon'
  | 'recurring_due_week'
  | 'custom_reminder'
  | 'income_reminder';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  urgency: NotificationUrgency;
  href: string;
  recurringId?: string;
  reminderId?: string;
};

const urgencyOrder: Record<NotificationUrgency, number> = {
  high: 0,
  medium: 1,
  low: 2,
  info: 3,
};

export function computeNotifications(
  recurring: RecurringExpense[],
  reminders: Reminder[],
  today: string,
  incomeReminderDismissed: boolean,
): AppNotification[] {
  const todayDate = new Date(`${today}T00:00:00`);
  const todayDay = todayDate.getDate();
  const notifications: AppNotification[] = [];

  for (const r of recurring) {
    if (!r.active) continue;
    const chargeDate = new Date(`${r.next_charge_date}T00:00:00`);
    const diffDays = Math.round(
      (chargeDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0 || diffDays > 7) continue;

    if (diffDays === 0) {
      notifications.push({
        id: `rec-today-${r.id}`,
        type: 'recurring_due_today',
        title: 'Due Today',
        body: `${r.name} — ${formatMoney(r.amount)} is due today.`,
        urgency: 'high',
        href: '/recurring',
        recurringId: r.id,
      });
    } else if (diffDays <= 3) {
      notifications.push({
        id: `rec-soon-${r.id}`,
        type: 'recurring_due_soon',
        title: `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`,
        body: `${r.name} — ${formatMoney(r.amount)} is due on ${r.next_charge_date}.`,
        urgency: 'medium',
        href: '/recurring',
        recurringId: r.id,
      });
    } else {
      notifications.push({
        id: `rec-week-${r.id}`,
        type: 'recurring_due_week',
        title: `Due in ${diffDays} days`,
        body: `${r.name} — ${formatMoney(r.amount)} is due on ${r.next_charge_date}.`,
        urgency: 'low',
        href: '/recurring',
        recurringId: r.id,
      });
    }
  }

  for (const rem of reminders) {
    if (!rem.active) continue;
    if (rem.remind_date > today) continue;
    notifications.push({
      id: `reminder-${rem.id}`,
      type: 'custom_reminder',
      title: rem.cadence === 'once' ? 'Reminder' : 'Recurring Reminder',
      body: rem.title,
      urgency: 'info',
      href: '/notifications',
      reminderId: rem.id,
    });
  }

  if (todayDay >= 15 && !incomeReminderDismissed) {
    notifications.push({
      id: 'income-reminder',
      type: 'income_reminder',
      title: 'Monthly Income Update',
      body:
        todayDay === 15
          ? "It's the 15th — time to review and update your income balances for this month."
          : `Reminder: update your income balances for this month.`,
      urgency: 'info',
      href: '/income',
    });
  }

  return notifications.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
}

export function incomeReminderKey(today: string): string {
  return `income-reminder-${today.slice(0, 7)}`;
}
