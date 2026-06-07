import { test, expect } from '@playwright/test';
import { NotificationsPage } from './pages/NotificationsPage';
import { cleanup, seed, E2E_REMINDER_TITLE } from './helpers/supabase';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

test.describe('Notifications — reminders CRUD', () => {
  let notifications!: NotificationsPage;

  test.beforeAll(async () => {
    await cleanup.reminders();
  });

  test.afterAll(async () => {
    await cleanup.reminders();
  });

  test.beforeEach(async ({ page }) => {
    notifications = new NotificationsPage(page);
    await notifications.goto();
  });

  test('create a one-time reminder, see it listed, and delete it', async () => {
    await notifications.addReminder(E2E_REMINDER_TITLE, 'once', todayISO());

    await expect(notifications.yourRemindersHeading()).toBeVisible();
    await expect(notifications.reminderRow(E2E_REMINDER_TITLE)).toBeVisible();
    await expect(notifications.reminderRow(E2E_REMINDER_TITLE)).toContainText('One-time');

    await notifications.deleteReminderButton(E2E_REMINDER_TITLE).click();
    await expect(notifications.reminderRow(E2E_REMINDER_TITLE)).toHaveCount(0);
  });

  test('marking a due one-time reminder Done removes it', async ({ page }) => {
    // A reminder dated today is "due" and appears as a notification card.
    await seed.reminder(E2E_REMINDER_TITLE, 'once', todayISO());
    notifications = new NotificationsPage(page);
    await notifications.goto();

    await expect(notifications.reminderRow(E2E_REMINDER_TITLE)).toBeVisible();
    await notifications.doneButton(E2E_REMINDER_TITLE).click();
    // One-time reminders are deleted when marked Done.
    await expect(notifications.reminderRow(E2E_REMINDER_TITLE)).toHaveCount(0);
  });

  test('marking a due recurring reminder Done advances its next date', async ({ page }) => {
    const today = todayISO();
    await seed.reminder(E2E_REMINDER_TITLE, 'monthly', today);
    notifications = new NotificationsPage(page);
    await notifications.goto();

    const row = notifications.reminderRow(E2E_REMINDER_TITLE);
    await expect(row).toBeVisible();
    await expect(row).toContainText('Monthly');
    await expect(row).toContainText(today);

    await notifications.doneButton(E2E_REMINDER_TITLE).click();
    // Still present (recurring), but the next date has advanced past today.
    await expect(notifications.reminderRow(E2E_REMINDER_TITLE)).toBeVisible();
    await expect(notifications.reminderRow(E2E_REMINDER_TITLE)).not.toContainText(today);
  });
});
