import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class BudgetsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/budgets');
    await this.waitForLoad();
  }

  heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: 'Budgets' });
  }

  // The add/edit form is now a modal opened by "+ Add Budget" (or Edit on a row).
  addBudgetButton(): Locator {
    return this.page.getByRole('button', { name: '+ Add Budget' });
  }

  dialog(): Locator {
    return this.page.getByRole('dialog');
  }

  async openAddModal(): Promise<void> {
    await this.addBudgetButton().click();
    await expect(this.dialog()).toBeVisible();
  }

  saveBudgetButton(): Locator {
    return this.dialog().getByRole('button', { name: 'Save Budget' });
  }

  updateBudgetButton(): Locator {
    return this.dialog().getByRole('button', { name: 'Update Budget' });
  }

  cancelEditButton(): Locator {
    return this.dialog().getByRole('button', { name: 'Cancel' });
  }

  monthlyLimitInput(): Locator {
    return this.dialog().locator('input[type="number"]');
  }

  categorySelect(): Locator {
    return this.dialog().locator('select');
  }

  async selectCategory(name: string): Promise<void> {
    const value = await this.dialog()
      .locator('select option', { hasText: name })
      .first()
      .getAttribute('value');
    if (value === null) throw new Error(`No category option matching "${name}"`);
    await this.categorySelect().selectOption(value);
  }

  // Selects the first real category (index 0 is the "Select a category" placeholder).
  // Returns false when the user has no categories available.
  async selectFirstCategory(): Promise<boolean> {
    const options = this.categorySelect().locator('option');
    if ((await options.count()) < 2) return false;
    const value = await options.nth(1).getAttribute('value');
    if (!value) return false;
    await this.categorySelect().selectOption(value);
    return true;
  }

  categoryFieldError(): Locator {
    return this.dialog().locator('label').filter({ hasText: 'Category' }).locator('.field-error');
  }

  currentBudgetsHeading(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Current Budgets' });
  }

  // Per-category budget rows live in <tbody> and carry Edit/Delete actions.
  row(label: string): Locator {
    return this.page.locator('table tbody tr').filter({ hasText: label });
  }

  // The computed, read-only "Overall" total lives in the table footer.
  overallFooterRow(): Locator {
    return this.page.locator('table tfoot tr.budget-overall-row');
  }

  editButton(label: string): Locator {
    return this.row(label).getByRole('button', { name: 'Edit' });
  }

  deleteButton(label: string): Locator {
    return this.row(label).getByRole('button', { name: 'Delete' });
  }

  deleteDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'Are you really sure' });
  }

  deleteYesButton(): Locator {
    return this.deleteDialog().getByRole('button', { name: 'Yes, remove' });
  }

  async editRow(label: string): Promise<void> {
    await this.editButton(label).click();
    await expect(this.updateBudgetButton()).toBeVisible();
  }

  async cancelEdit(): Promise<void> {
    await this.cancelEditButton().click();
    await expect(this.dialog()).toBeHidden();
  }

  async deleteRow(label: string): Promise<void> {
    await this.deleteButton(label).click();
    await expect(this.deleteDialog()).toBeVisible();
    await this.deleteYesButton().click();
    await expect(this.deleteDialog()).toBeHidden();
  }

  sortableHeader(name: string): Locator {
    return this.page.locator('table th.sortable').filter({ hasText: new RegExp(name, 'i') });
  }

  activeSortIcon(): Locator {
    return this.page.locator('table th.sortable .sort-active');
  }
}
