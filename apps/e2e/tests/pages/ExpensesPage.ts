import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ExpensesPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/expenses');
    await this.waitForLoad();
  }

  heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: 'Expenses' });
  }

  searchInput(): Locator {
    return this.page.locator('input[type="search"]');
  }

  categoryFilterSelect(): Locator {
    return this.page.locator('select').first();
  }

  addButton(): Locator {
    return this.page.getByRole('button', { name: '+ Add Expense' });
  }

  dialog(): Locator {
    return this.page.getByRole('dialog');
  }

  modalOverlay(): Locator {
    return this.page.locator('.modal-overlay');
  }

  row(merchant: string): Locator {
    return this.page.locator('.expense-table tbody tr').filter({ hasText: merchant });
  }

  async openAddModal(): Promise<void> {
    await this.addButton().click();
    await expect(this.dialog()).toBeVisible();
  }

  async fillForm(data: { amount: string; merchant: string; description: string }): Promise<void> {
    const d = this.dialog();
    await d.locator('input[type="number"]').fill(data.amount);
    await d.locator('label').filter({ hasText: 'Merchant' }).locator('input').fill(data.merchant);
    await d.locator('label').filter({ hasText: 'Description' }).locator('textarea').fill(data.description);
  }

  async fillDescription(description: string): Promise<void> {
    await this.dialog().locator('label').filter({ hasText: 'Description' }).locator('textarea').fill(description);
  }

  async submitAdd(): Promise<void> {
    await this.dialog().getByRole('button', { name: 'Add Expense' }).click();
    await expect(this.dialog()).toBeHidden();
  }

  async submitEdit(): Promise<void> {
    await this.dialog().getByRole('button', { name: 'Update' }).click();
    await expect(this.dialog()).toBeHidden();
  }

  async cancel(): Promise<void> {
    await this.page.getByRole('button', { name: 'Cancel' }).click();
  }

  async editRow(merchant: string): Promise<void> {
    await this.row(merchant).getByRole('button', { name: 'Edit' }).click();
    await expect(this.dialog().getByRole('heading', { name: 'Edit Expense' })).toBeVisible();
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

  async openDeleteModal(merchant: string): Promise<void> {
    await this.row(merchant).getByRole('button', { name: 'Delete' }).click();
    await expect(this.deleteDialog()).toBeVisible();
  }

  async deleteRow(merchant: string): Promise<void> {
    await this.openDeleteModal(merchant);
    await this.deleteYesButton().click();
    await expect(this.deleteDialog()).toBeHidden();
  }

  lockIcon(merchant: string): Locator {
    return this.row(merchant).locator('[title*="edited or deleted"]');
  }

  editButton(merchant: string): Locator {
    return this.row(merchant).getByRole('button', { name: 'Edit' });
  }

  deleteButton(merchant: string): Locator {
    return this.row(merchant).getByRole('button', { name: 'Delete' });
  }

  monthGroup(label: string): Locator {
    return this.page.locator('.date-group').filter({ hasText: label });
  }

  monthGroupHeader(label: string): Locator {
    return this.monthGroup(label).locator('.date-group-header');
  }

  monthGroupBody(label: string): Locator {
    return this.monthGroup(label).locator('.date-group-body');
  }

  currentMonthLabel(): string {
    return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  }
}
