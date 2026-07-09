import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/** Page object for the `/notifications` page: the Add Reminder form, the reminders list, and due-reminder cards. */
export class NotificationsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Navigate to the notifications page and wait for the initial load to settle. */
  async goto(): Promise<void> {
    await this.page.goto('/notifications');
    await this.waitForLoad();
  }

  /** The `<h1>` "Notifications" page heading. */
  heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: 'Notifications' });
  }

  /** The "+ Add Reminder" button that toggles the inline form. */
  addReminderButton(): Locator {
    return this.page.getByRole('button', { name: '+ Add Reminder' });
  }

  /** The "Close" button that dismisses the inline form. */
  closeFormButton(): Locator {
    return this.page.getByRole('button', { name: 'Close' });
  }

  // ── Add reminder form (inline card, toggled by the button) ──

  /** The `<h2>` "New Reminder" form heading. */
  formHeading(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'New Reminder' });
  }

  /**
   * The reminder title input. Positional (`.first()`) — the "Reminder" label
   * wraps more than one control.
   */
  titleInput(): Locator {
    return this.page.locator('label').filter({ hasText: 'Reminder' }).locator('input').first();
  }

  /** The Repeat cadence `<select>`. */
  repeatSelect(): Locator {
    return this.page.locator('label').filter({ hasText: 'Repeat' }).locator('select');
  }

  /** The reminder date `<input>`. */
  dateInput(): Locator {
    return this.page.locator('input[type="date"]');
  }

  /** The form's "Add Reminder" submit button. */
  submitReminderButton(): Locator {
    return this.page.getByRole('button', { name: 'Add Reminder' });
  }

  /** The inline validation error in the New Reminder card. */
  formError(): Locator {
    return this.page.locator('.card').filter({ hasText: 'New Reminder' }).locator('.field-error');
  }

  /** Open the Add Reminder form and wait for it to appear. */
  async openForm(): Promise<void> {
    await this.addReminderButton().click();
    await expect(this.formHeading()).toBeVisible();
  }

  /**
   * Create a reminder end-to-end via the inline form and wait for it to close.
   * @param title - the reminder title
   * @param repeat - the cadence
   * @param date - the remind date (yyyy-mm-dd)
   */
  async addReminder(title: string, repeat: 'once' | 'weekly' | 'monthly' | 'yearly', date: string): Promise<void> {
    await this.openForm();
    await this.titleInput().fill(title);
    await this.repeatSelect().selectOption(repeat);
    await this.dateInput().fill(date);
    await this.submitReminderButton().click();
    await expect(this.formHeading()).toBeHidden();
  }

  /** The "You're all caught up!" empty state. */
  emptyState(): Locator {
    return this.page.getByText("You're all caught up!");
  }

  // ── "Your Reminders" management list ──

  /** The `<h2>` "Your Reminders" list heading. */
  yourRemindersHeading(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Your Reminders' });
  }

  /**
   * A reminder row in the management list, matched by title.
   * @param title - the reminder title
   */
  reminderRow(title: string): Locator {
    return this.page.getByTestId('reminders-table').locator('tbody tr').filter({ hasText: title });
  }

  /**
   * The Delete button within a reminder row.
   * @param title - the reminder title
   */
  deleteReminderButton(title: string): Locator {
    return this.reminderRow(title).getByRole('button', { name: 'Delete' });
  }

  // ── Due reminder notification cards (Done / View actions) ──

  /**
   * A due-reminder notification card, matched by title. Positional (`.last()`) —
   * the text filter matches nested wrappers, so the innermost card is taken.
   * @param title - the reminder title
   */
  reminderCard(title: string): Locator {
    return this.page.locator('div').filter({ hasText: title }).filter({ has: this.page.getByRole('button', { name: 'Done' }) }).last();
  }

  /**
   * The "Done" button on a due-reminder card.
   * @param title - the reminder title
   */
  doneButton(title: string): Locator {
    return this.reminderCard(title).getByRole('button', { name: 'Done' });
  }
}
