import { test, expect } from '@playwright/test';
import { NotificationsPage } from './pages/NotificationsPage';
import { E2E_RECURRING_NAME, cleanup, seed } from './helpers/supabase';

test.describe('Notifications page', () => {
  let notifications!: NotificationsPage;

  test.beforeEach(async ({ page }) => {
    notifications = new NotificationsPage(page);
    await notifications.goto();
  });

  test('page renders heading and the Add Reminder button', async () => {
    await expect(notifications.heading()).toHaveText('Notifications');
    await expect(notifications.addReminderButton()).toBeVisible();
  });

  test('Add Reminder form opens with title, repeat, date fields and cadence options', async () => {
    await notifications.openForm();
    await expect(notifications.titleInput()).toBeVisible();
    await expect(notifications.repeatSelect()).toBeVisible();
    await expect(notifications.dateInput()).toBeVisible();
    await expect(notifications.submitReminderButton()).toBeVisible();
    const options = await notifications.repeatSelect().locator('option').allTextContents();
    expect(options).toContain('One-time');
    expect(options).toContain('Weekly');
    expect(options).toContain('Monthly');
    expect(options).toContain('Yearly');
  });

  test('submitting an empty reminder shows an inline error', async () => {
    await notifications.openForm();
    await notifications.submitReminderButton().click();
    await expect(notifications.formError()).toBeVisible();
  });

  test('the Add Reminder button toggles the form open and closed', async () => {
    await notifications.openForm();
    await expect(notifications.formHeading()).toBeVisible();
    await notifications.closeFormButton().click(); // the toggle now reads "Close"
    await expect(notifications.formHeading()).toBeHidden();
  });
});

// ── FUNC-8: a variable recurring due today shows an "amount varies" body ──
test.describe('Notifications — variable recurring due body', () => {
  let notifications!: NotificationsPage;

  test.beforeAll(async () => {
    await cleanup.recurring();
    await seed.recurringVariable(0); // variable, no estimate, due today
  });

  test.afterAll(async () => {
    await cleanup.recurring();
  });

  test.beforeEach(async ({ page }) => {
    notifications = new NotificationsPage(page);
    await notifications.goto();
  });

  test('the due-today notification omits a figure and reads "(amount varies)"', async () => {
    const body = notifications.notificationBody(`${E2E_RECURRING_NAME} is due today (amount varies).`);
    await expect(body).toBeVisible();
    await expect(body).not.toContainText('₱');
  });
});
