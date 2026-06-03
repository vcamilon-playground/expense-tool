import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class RecurringPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/recurring');
    await this.waitForLoad();
  }

  heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: 'Recurring Expenses' });
  }

  descriptionText(): Locator {
    return this.page.getByText(/Track subscriptions/i);
  }

  addButton(): Locator {
    return this.page.getByRole('button', { name: '+ Add Recurring' });
  }

  dialog(): Locator {
    return this.page.getByRole('dialog');
  }

  cadenceSelect(): Locator {
    return this.dialog().locator('select').first();
  }

  row(name: string): Locator {
    return this.page.locator('.recurring-table tbody tr').filter({ hasText: name });
  }

  async openAddModal(): Promise<void> {
    await this.addButton().click();
    await expect(this.dialog().getByRole('heading', { name: 'Add Recurring Expense' })).toBeVisible();
  }

  async fillForm(data: { name: string; amount: string }): Promise<void> {
    const d = this.dialog();
    await d.locator('label').filter({ hasText: 'Name' }).locator('input').fill(data.name);
    await d.locator('label').filter({ hasText: 'Amount' }).locator('input[type="number"]').fill(data.amount);
  }

  async fillAmount(amount: string): Promise<void> {
    await this.dialog().locator('label').filter({ hasText: 'Amount' }).locator('input[type="number"]').fill(amount);
  }

  async submitAdd(): Promise<void> {
    await this.dialog().getByRole('button', { name: 'Add Recurring' }).click();
    await expect(this.dialog()).toBeHidden();
  }

  async submitEdit(): Promise<void> {
    await this.dialog().getByRole('button', { name: 'Update' }).click();
    await expect(this.dialog()).toBeHidden();
  }

  async cancel(): Promise<void> {
    await this.page.getByRole('button', { name: 'Cancel' }).click();
  }

  async editRow(name: string): Promise<void> {
    await this.row(name).getByRole('button', { name: 'Edit' }).click();
    await expect(this.dialog().getByRole('heading', { name: 'Edit Recurring Expense' })).toBeVisible();
  }

  deleteDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'Are you really sure' });
  }

  deleteXButton(): Locator {
    return this.deleteDialog().getByRole('button', { name: 'Close' });
  }

  deleteNoButton(): Locator {
    return this.deleteDialog().getByRole('button', { name: 'No, keep it' });
  }

  deleteYesButton(): Locator {
    return this.deleteDialog().getByRole('button', { name: 'Yes, remove' });
  }

  async openDeleteModal(name: string): Promise<void> {
    await this.row(name).getByRole('button', { name: 'Delete' }).click();
    await expect(this.deleteDialog()).toBeVisible();
  }

  async deleteRow(name: string): Promise<void> {
    await this.openDeleteModal(name);
    await this.deleteYesButton().click();
    await expect(this.deleteDialog()).toBeHidden();
  }

  dueBadge(name: string): Locator {
    return this.row(name).locator('.pill.over');
  }

  confirmPaymentButton(name: string): Locator {
    return this.row(name).getByRole('button', { name: 'Confirm Payment' });
  }

  confirmModal(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: /already been paid/ });
  }

  confirmYesButton(): Locator {
    return this.confirmModal().getByRole('button', { name: /Yes/ });
  }

  confirmNoButton(): Locator {
    return this.confirmModal().getByRole('button', { name: /No/ });
  }

  payNowButton(name: string): Locator {
    return this.row(name).getByRole('button', { name: 'Pay Now' });
  }

  earlyPayModal(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: /Record Early Payment/ });
  }

  earlyPayConfirmButton(): Locator {
    return this.earlyPayModal().getByRole('button', { name: 'Yes, record it' });
  }

  earlyPayCancelButton(): Locator {
    return this.earlyPayModal().getByRole('button', { name: 'Cancel' });
  }

  reminderModal(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: /will not be added/ });
  }

  reminderOkButton(): Locator {
    return this.reminderModal().getByRole('button', { name: 'OK' });
  }

  sortableHeader(name: string): Locator {
    return this.page.locator('.recurring-table th.sortable').filter({ hasText: new RegExp(name, 'i') });
  }

  activeSortIcon(): Locator {
    return this.page.locator('.recurring-table th.sortable .sort-active');
  }
}
