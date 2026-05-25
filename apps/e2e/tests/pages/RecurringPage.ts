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
    return this.page.getByRole('button', { name: '+ Add Recurrings' });
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

  async deleteRow(name: string): Promise<void> {
    await this.row(name).getByRole('button', { name: 'Delete' }).click();
    await expect(this.dialog()).toBeVisible();
    await this.dialog().getByRole('button', { name: 'Remove' }).click();
  }
}
