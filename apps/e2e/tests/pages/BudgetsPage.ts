import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/** Page object for the `/budgets` page: per-category budget rows, the computed Overall footer, and the Add/Edit modal. */
export class BudgetsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Navigate to the budgets page and wait for the initial load to settle. */
  async goto(): Promise<void> {
    await this.page.goto('/budgets');
    await this.waitForLoad();
  }

  /** The `<h1>` "Budgets" page heading. */
  heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: 'Budgets' });
  }

  /** The intro help text under the heading. */
  helpText(): Locator {
    return this.page.getByText(/Set a monthly limit per category/);
  }

  /** The "+ Add Budget" button that opens the add/edit modal. */
  addBudgetButton(): Locator {
    return this.page.getByRole('button', { name: '+ Add Budget' });
  }

  /** The Add/Edit budget modal dialog. */
  dialog(): Locator {
    return this.page.getByRole('dialog');
  }

  /** The "Add Budget" heading inside the modal. */
  addModalHeading(): Locator {
    return this.dialog().getByRole('heading', { name: 'Add Budget' });
  }

  /** Open the Add Budget modal and wait for it to appear. */
  async openAddModal(): Promise<void> {
    await this.addBudgetButton().click();
    await expect(this.dialog()).toBeVisible();
  }

  /** The "Save Budget" button (add mode). */
  saveBudgetButton(): Locator {
    return this.dialog().getByRole('button', { name: 'Save Budget' });
  }

  /** The "Update Budget" button (edit mode). */
  updateBudgetButton(): Locator {
    return this.dialog().getByRole('button', { name: 'Update Budget' });
  }

  /** The modal's Cancel button. */
  cancelEditButton(): Locator {
    return this.dialog().getByRole('button', { name: 'Cancel' });
  }

  /** The Monthly Limit `<input>` in the modal. */
  monthlyLimitInput(): Locator {
    return this.dialog().locator('input[type="number"]');
  }

  /** The Category `<select>` in the modal. */
  categorySelect(): Locator {
    return this.dialog().locator('select');
  }

  /** The placeholder "Select a category" option in the Category select. */
  categoryPlaceholderOption(): Locator {
    return this.categorySelect().getByRole('option', { name: 'Select a category' });
  }

  /**
   * Select a category by its visible name.
   * @param name - the category option's visible text
   */
  async selectCategory(name: string): Promise<void> {
    // Match the option by its text; `.first()` guards against duplicate labels.
    const value = await this.dialog()
      .locator('select option', { hasText: name })
      .first()
      .getAttribute('value');
    if (value === null) throw new Error(`No category option matching "${name}"`);
    await this.categorySelect().selectOption(value);
  }

  /**
   * Select the first real category (option index 0 is the "Select a category"
   * placeholder). Positional by necessity — the available category name isn't known here.
   * @returns false when the user has no categories available
   */
  async selectFirstCategory(): Promise<boolean> {
    const options = this.categorySelect().locator('option');
    if ((await options.count()) < 2) return false;
    const value = await options.nth(1).getAttribute('value');
    if (!value) return false;
    await this.categorySelect().selectOption(value);
    return true;
  }

  /** The inline validation error under the Category field. */
  categoryFieldError(): Locator {
    return this.dialog().locator('label').filter({ hasText: 'Category' }).locator('.field-error');
  }

  /** The inline validation error under the Monthly Limit field. */
  monthlyLimitError(): Locator {
    return this.dialog().locator('label').filter({ hasText: 'Monthly Limit' }).locator('.field-error');
  }

  /** The `<h2>` "Current Budgets" section heading. */
  currentBudgetsHeading(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Current Budgets' });
  }

  /** The per-category budgets `<table>` (present only when ≥1 budget exists). */
  table(): Locator {
    return this.page.locator('table.budget-table');
  }

  /** All per-category budget rows (in `<tbody>`). */
  rows(): Locator {
    return this.page.locator('table tbody tr');
  }

  /**
   * A per-category budget row matched by label.
   * @param label - text (e.g. category name) to match within the row
   */
  row(label: string): Locator {
    return this.page.locator('table tbody tr').filter({ hasText: label });
  }

  /** The computed, read-only "Overall" total row in the table footer. */
  overallFooterRow(): Locator {
    return this.page.locator('table tfoot tr.budget-overall-row');
  }

  /**
   * The Edit button within a budget row.
   * @param label - text identifying the row
   */
  editButton(label: string): Locator {
    return this.row(label).getByRole('button', { name: 'Edit' });
  }

  /**
   * The Delete button within a budget row.
   * @param label - text identifying the row
   */
  deleteButton(label: string): Locator {
    return this.row(label).getByRole('button', { name: 'Delete' });
  }

  /** The delete-confirmation dialog. */
  deleteDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'Are you really sure' });
  }

  /** The delete dialog's "Yes, remove" button. */
  deleteYesButton(): Locator {
    return this.deleteDialog().getByRole('button', { name: 'Yes, remove' });
  }

  /**
   * Open the Edit modal for a row and wait for the Update button.
   * @param label - text identifying the row
   */
  async editRow(label: string): Promise<void> {
    await this.editButton(label).click();
    await expect(this.updateBudgetButton()).toBeVisible();
  }

  /** Cancel the open modal and wait for it to close. */
  async cancelEdit(): Promise<void> {
    await this.cancelEditButton().click();
    await expect(this.dialog()).toBeHidden();
  }

  /**
   * Delete a budget row via the confirmation modal and wait for it to close.
   * @param label - text identifying the row
   */
  async deleteRow(label: string): Promise<void> {
    await this.deleteButton(label).click();
    await expect(this.deleteDialog()).toBeVisible();
    await this.deleteYesButton().click();
    await expect(this.deleteDialog()).toBeHidden();
  }

  /**
   * A sortable column header matched by name (case-insensitive).
   * @param name - the column name (Category, Monthly Limit)
   */
  sortableHeader(name: string): Locator {
    return this.page.locator('table th.sortable').filter({ hasText: new RegExp(name, 'i') });
  }

  /** The active-sort indicator on whichever header is currently sorted. */
  activeSortIcon(): Locator {
    return this.page.locator('table th.sortable .sort-active');
  }
}
