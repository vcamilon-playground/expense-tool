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

  addModalHeading(): Locator {
    return this.dialog().getByRole('heading', { name: 'Add Expense' });
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

  // The Category <select> inside the Add/Edit form. Category is required, so the
  // placeholder option (value "") must not be the submitted value.
  categorySelect(): Locator {
    return this.dialog().locator('label').filter({ hasText: /^Category/ }).locator('select');
  }

  categoryError(): Locator {
    return this.dialog().locator('label').filter({ hasText: /^Category/ }).locator('.field-error');
  }

  // Selects the first real category (index 1; index 0 is the "— Select category —"
  // placeholder). Returns the chosen option's visible label.
  async selectFirstCategory(): Promise<string> {
    const select = this.categorySelect();
    const value = await select.locator('option').nth(1).getAttribute('value');
    await select.selectOption(value ?? '');
    return (await select.locator('option').nth(1).textContent())?.trim() ?? '';
  }

  async selectCategory(label: string): Promise<void> {
    await this.categorySelect().selectOption({ label });
  }

  async clearCategory(): Promise<void> {
    await this.categorySelect().selectOption('');
  }

  async fillForm(data: { amount: string; merchant: string; description: string }): Promise<void> {
    const d = this.dialog();
    await d.locator('input[type="number"]').fill(data.amount);
    await d.locator('label').filter({ hasText: 'Merchant' }).locator('input').fill(data.merchant);
    await d.locator('label').filter({ hasText: 'Description' }).locator('textarea').fill(data.description);
    await this.selectFirstCategory();
  }

  async fillDescription(description: string): Promise<void> {
    await this.dialog().locator('label').filter({ hasText: 'Description' }).locator('textarea').fill(description);
  }

  // The "Deduct from (optional)" income-source select shown only when creating
  // an expense and the user has at least one income source.
  deductFromSelect(): Locator {
    return this.dialog().locator('label').filter({ hasText: 'Deduct from' }).locator('select');
  }

  async selectDeductFrom(sourceName: string): Promise<void> {
    await this.deductFromSelect().selectOption({ label: sourceName });
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

  deleteModalHeader(): Locator {
    return this.deleteDialog().locator('.modal-header');
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

  sortableHeader(name: string): Locator {
    return this.page.locator('th.sortable').filter({ hasText: new RegExp(name, 'i') });
  }

  activeSortIcon(): Locator {
    return this.page.locator('th.sortable .sort-active');
  }

  // ── List / Grid / Calendar view toggle ──
  viewToggle(): Locator {
    return this.page.locator('.view-toggle');
  }

  viewToggleButtons(): Locator {
    return this.viewToggle().getByRole('button');
  }

  listViewButton(): Locator {
    return this.viewToggle().getByRole('button', { name: 'List' });
  }

  gridViewButton(): Locator {
    return this.viewToggle().getByRole('button', { name: 'Grid' });
  }

  calendarViewButton(): Locator {
    return this.viewToggle().getByRole('button', { name: 'Calendar' });
  }

  // ── Grid view ──
  grid(): Locator {
    return this.page.locator('.expense-grid');
  }

  gridCards(): Locator {
    return this.page.locator('.expense-grid-card');
  }

  gridCard(text: string): Locator {
    return this.gridCards().filter({ hasText: text });
  }

  gridCardCategory(text: string): Locator {
    return this.gridCard(text).locator('.expense-grid-cat');
  }

  gridCardAmount(text: string): Locator {
    return this.gridCard(text).locator('.expense-grid-amount');
  }

  gridCardMeta(text: string): Locator {
    return this.gridCard(text).locator('.expense-grid-meta');
  }

  gridCardDescription(text: string): Locator {
    return this.gridCard(text).locator('.expense-grid-desc');
  }

  gridCardReceiptPill(text: string): Locator {
    return this.gridCard(text).locator('.pill.ok');
  }

  gridCardEditButton(text: string): Locator {
    return this.gridCard(text).getByRole('button', { name: 'Edit' });
  }

  gridCardDeleteButton(text: string): Locator {
    return this.gridCard(text).getByRole('button', { name: 'Delete' });
  }

  gridCardLockIcon(text: string): Locator {
    return this.gridCard(text).locator('[title*="edited or deleted"]');
  }

  gridLoadMoreButton(): Locator {
    return this.page.locator('.expense-grid-more button');
  }

  async openGrid(): Promise<void> {
    await this.gridViewButton().click();
    await expect(this.grid()).toBeVisible();
  }

  async editGridCard(text: string): Promise<void> {
    await this.gridCardEditButton(text).click();
    await expect(this.dialog().getByRole('heading', { name: 'Edit Expense' })).toBeVisible();
  }

  async openGridDeleteModal(text: string): Promise<void> {
    await this.gridCardDeleteButton(text).click();
    await expect(this.deleteDialog()).toBeVisible();
  }

  async deleteGridCard(text: string): Promise<void> {
    await this.openGridDeleteModal(text);
    await this.deleteYesButton().click();
    await expect(this.deleteDialog()).toBeHidden();
  }

  calendarGrid(): Locator {
    return this.page.locator('.cal-grid');
  }

  calendarMonthLabel(): Locator {
    return this.page.locator('.cal-month-label');
  }

  calendarPrevButton(): Locator {
    return this.page.locator('.cal-nav').getByRole('button', { name: /Prev/ });
  }

  calendarNextButton(): Locator {
    return this.page.locator('.cal-nav').getByRole('button', { name: /Next/ });
  }
}
