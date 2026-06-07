import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class NotificationsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/notifications');
    await this.waitForLoad();
  }

  heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: 'Notifications' });
  }

  addReminderButton(): Locator {
    return this.page.getByRole('button', { name: '+ Add Reminder' });
  }

  closeFormButton(): Locator {
    return this.page.getByRole('button', { name: 'Close' });
  }

  // ── Add reminder form (inline card, toggled by the button) ──
  formHeading(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'New Reminder' });
  }

  titleInput(): Locator {
    return this.page.locator('label').filter({ hasText: 'Reminder' }).locator('input').first();
  }

  repeatSelect(): Locator {
    return this.page.locator('label').filter({ hasText: 'Repeat' }).locator('select');
  }

  dateInput(): Locator {
    return this.page.locator('input[type="date"]');
  }

  submitReminderButton(): Locator {
    return this.page.getByRole('button', { name: 'Add Reminder' });
  }

  formError(): Locator {
    return this.page.locator('.card').filter({ hasText: 'New Reminder' }).locator('.field-error');
  }

  async openForm(): Promise<void> {
    await this.addReminderButton().click();
    await expect(this.formHeading()).toBeVisible();
  }

  async addReminder(title: string, repeat: 'once' | 'weekly' | 'monthly' | 'yearly', date: string): Promise<void> {
    await this.openForm();
    await this.titleInput().fill(title);
    await this.repeatSelect().selectOption(repeat);
    await this.dateInput().fill(date);
    await this.submitReminderButton().click();
    await expect(this.formHeading()).toBeHidden();
  }

  // ── Empty state ──
  emptyState(): Locator {
    return this.page.getByText("You're all caught up!");
  }

  // ── "Your Reminders" management list ──
  yourRemindersHeading(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Your Reminders' });
  }

  reminderRow(title: string): Locator {
    return this.page.locator('.income-table tbody tr').filter({ hasText: title });
  }

  deleteReminderButton(title: string): Locator {
    return this.reminderRow(title).getByRole('button', { name: 'Delete' });
  }

  // ── Due reminder notification cards (Done / View actions) ──
  reminderCard(title: string): Locator {
    return this.page.locator('div').filter({ hasText: title }).filter({ has: this.page.getByRole('button', { name: 'Done' }) }).last();
  }

  doneButton(title: string): Locator {
    return this.reminderCard(title).getByRole('button', { name: 'Done' });
  }
}
