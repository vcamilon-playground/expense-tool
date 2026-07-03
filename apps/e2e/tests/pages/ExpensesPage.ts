import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/** Page object for the `/expenses` page: list/grid/calendar views, the Add/Edit form, and the delete modal. */
export class ExpensesPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Navigate to the expenses page and wait for the initial load to settle. */
  async goto(): Promise<void> {
    await this.page.goto('/expenses');
    await this.waitForLoad();
  }

  /** The `<h1>` "Expenses" page heading. */
  heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: 'Expenses' });
  }

  /** The search box in the toolbar. */
  searchInput(): Locator {
    return this.page.locator('input[type="search"]');
  }

  /**
   * The category filter `<select>` in the toolbar. NOTE: positional (`.first()`) —
   * the control has no stable hook yet; blocked on the data-testid backlog.
   */
  categoryFilterSelect(): Locator {
    return this.page.locator('select').first();
  }

  /** The "+ Add Expense" toolbar button. */
  addButton(): Locator {
    return this.page.getByRole('button', { name: '+ Add Expense' });
  }

  /** The Add/Edit expense modal dialog. */
  dialog(): Locator {
    return this.page.getByRole('dialog');
  }

  /** The "Add Expense" heading inside the modal. */
  addModalHeading(): Locator {
    return this.dialog().getByRole('heading', { name: 'Add Expense' });
  }

  /** The modal backdrop overlay (click to dismiss). */
  modalOverlay(): Locator {
    return this.page.locator('.modal-overlay');
  }

  /** The Amount `<input>` inside the Add/Edit form. */
  amountInput(): Locator {
    return this.dialog().locator('input[type="number"]');
  }

  /** The Date `<input>` inside the Add/Edit form. */
  dateInput(): Locator {
    return this.dialog().locator('input[type="date"]');
  }

  /** The inline validation error under the Amount field. */
  amountError(): Locator {
    return this.dialog().locator('label').filter({ hasText: 'Amount' }).locator('.field-error');
  }

  /** The inline validation error under the Date field. */
  dateError(): Locator {
    return this.dialog().locator('label').filter({ hasText: 'Date' }).locator('.field-error');
  }

  /**
   * An expense table row matched by merchant text.
   * @param merchant - the merchant text to match within the row
   */
  row(merchant: string): Locator {
    return this.page.locator('.expense-table tbody tr').filter({ hasText: merchant });
  }

  /** The expense list `<table>` (absent when there are no expenses). */
  table(): Locator {
    return this.page.locator('.expense-table');
  }

  /** All month/date group containers in the list view. */
  dateGroups(): Locator {
    return this.page.locator('.date-group');
  }

  /** The "No expenses match your search." message shown while filtering with no matches. */
  noResultsMessage(): Locator {
    return this.page.getByText('No expenses match your search.');
  }

  /** The grid view's own "No expenses yet." empty state. */
  gridEmptyMessage(): Locator {
    return this.page.getByText('No expenses yet.');
  }

  /** Open the Add Expense modal and wait for it to appear. */
  async openAddModal(): Promise<void> {
    await this.addButton().click();
    await expect(this.dialog()).toBeVisible();
  }

  /**
   * The Category `<select>` inside the Add/Edit form. Category is required, so the
   * placeholder option (value "") must not be the submitted value.
   */
  categorySelect(): Locator {
    return this.dialog().locator('label').filter({ hasText: /^Category/ }).locator('select');
  }

  /** The placeholder "— Select category —" option in the Category select. */
  categoryPlaceholderOption(): Locator {
    return this.categorySelect().getByRole('option', { name: '— Select category —' });
  }

  /** The inline validation error under the Category field. */
  categoryError(): Locator {
    return this.dialog().locator('label').filter({ hasText: /^Category/ }).locator('.field-error');
  }

  /**
   * Select the first real category (option index 1; index 0 is the placeholder).
   * Positional by necessity — the seeded category name isn't known here.
   * @returns the chosen option's visible label
   */
  async selectFirstCategory(): Promise<string> {
    const select = this.categorySelect();
    const value = await select.locator('option').nth(1).getAttribute('value');
    await select.selectOption(value ?? '');
    return (await select.locator('option').nth(1).textContent())?.trim() ?? '';
  }

  /**
   * Select a category by its visible label.
   * @param label - the category option label to select
   */
  async selectCategory(label: string): Promise<void> {
    await this.categorySelect().selectOption({ label });
  }

  /** Reset the Category select back to the placeholder (empty) value. */
  async clearCategory(): Promise<void> {
    await this.categorySelect().selectOption('');
  }

  /**
   * Fill the Add/Edit form's amount, merchant, description, and first category.
   * @param data - the field values to enter
   */
  async fillForm(data: { amount: string; merchant: string; description: string }): Promise<void> {
    const d = this.dialog();
    await d.locator('input[type="number"]').fill(data.amount);
    await d.locator('label').filter({ hasText: 'Merchant' }).locator('input').fill(data.merchant);
    await d.locator('label').filter({ hasText: 'Description' }).locator('textarea').fill(data.description);
    await this.selectFirstCategory();
  }

  /**
   * Fill only the Description textarea.
   * @param description - the description text to enter
   */
  async fillDescription(description: string): Promise<void> {
    await this.dialog().locator('label').filter({ hasText: 'Description' }).locator('textarea').fill(description);
  }

  /**
   * The "Deduct from (optional)" income-source select, shown only when creating an
   * expense and the user has at least one income source.
   */
  deductFromSelect(): Locator {
    return this.dialog().locator('label').filter({ hasText: 'Deduct from' }).locator('select');
  }

  /**
   * Select an income source to deduct the new expense from.
   * @param sourceName - the income source's visible label
   */
  async selectDeductFrom(sourceName: string): Promise<void> {
    await this.deductFromSelect().selectOption({ label: sourceName });
  }

  /** Submit the Add Expense form and wait for the modal to close. */
  async submitAdd(): Promise<void> {
    await this.dialog().getByRole('button', { name: 'Add Expense' }).click();
    await expect(this.dialog()).toBeHidden();
  }

  /** Submit the Edit Expense form and wait for the modal to close. */
  async submitEdit(): Promise<void> {
    await this.dialog().getByRole('button', { name: 'Update' }).click();
    await expect(this.dialog()).toBeHidden();
  }

  /** Cancel the open form via its Cancel button. */
  async cancel(): Promise<void> {
    await this.page.getByRole('button', { name: 'Cancel' }).click();
  }

  /**
   * Open the Edit form for a given row and wait for the Edit heading.
   * @param merchant - the merchant text identifying the row
   */
  async editRow(merchant: string): Promise<void> {
    await this.row(merchant).getByRole('button', { name: 'Edit' }).click();
    await expect(this.dialog().getByRole('heading', { name: 'Edit Expense' })).toBeVisible();
  }

  /** The delete-confirmation dialog ("Are you really sure…"). */
  deleteDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'Are you really sure' });
  }

  /** The delete dialog's header bar. */
  deleteModalHeader(): Locator {
    return this.deleteDialog().locator('.modal-header');
  }

  /** The delete dialog's "Close" (X) button. */
  deleteXButton(): Locator {
    return this.deleteDialog().getByRole('button', { name: 'Close' });
  }

  /** The delete dialog's "No, keep it" button. */
  deleteNoButton(): Locator {
    return this.deleteDialog().getByRole('button', { name: 'No, keep it' });
  }

  /** The delete dialog's "Yes, remove" button. */
  deleteYesButton(): Locator {
    return this.deleteDialog().getByRole('button', { name: 'Yes, remove' });
  }

  /**
   * Open the delete-confirmation modal for a row and wait for it to appear.
   * @param merchant - the merchant text identifying the row
   */
  async openDeleteModal(merchant: string): Promise<void> {
    await this.row(merchant).getByRole('button', { name: 'Delete' }).click();
    await expect(this.deleteDialog()).toBeVisible();
  }

  /**
   * Delete a row via the confirmation modal and wait for it to close.
   * @param merchant - the merchant text identifying the row
   */
  async deleteRow(merchant: string): Promise<void> {
    await this.openDeleteModal(merchant);
    await this.deleteYesButton().click();
    await expect(this.deleteDialog()).toBeHidden();
  }

  /**
   * The "edited or deleted" lock icon on a past-month row.
   * @param merchant - the merchant text identifying the row
   */
  lockIcon(merchant: string): Locator {
    return this.row(merchant).locator('[title*="edited or deleted"]');
  }

  /**
   * The Edit button within a row.
   * @param merchant - the merchant text identifying the row
   */
  editButton(merchant: string): Locator {
    return this.row(merchant).getByRole('button', { name: 'Edit' });
  }

  /**
   * The Delete button within a row.
   * @param merchant - the merchant text identifying the row
   */
  deleteButton(merchant: string): Locator {
    return this.row(merchant).getByRole('button', { name: 'Delete' });
  }

  /**
   * A month group container matched by its label (e.g. "July 2026").
   * @param label - the month/year label
   */
  monthGroup(label: string): Locator {
    return this.page.locator('.date-group').filter({ hasText: label });
  }

  /**
   * A month group's clickable header.
   * @param label - the month/year label
   */
  monthGroupHeader(label: string): Locator {
    return this.monthGroup(label).locator('.date-group-header');
  }

  /**
   * A month group's collapsible body.
   * @param label - the month/year label
   */
  monthGroupBody(label: string): Locator {
    return this.monthGroup(label).locator('.date-group-body');
  }

  /** The current month's label as the app formats it (e.g. "July 2026"). */
  currentMonthLabel(): string {
    return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  /**
   * A sortable column header matched by name (case-insensitive).
   * @param name - the column name (Date, Category, Merchant, Amount)
   */
  sortableHeader(name: string): Locator {
    return this.page.locator('th.sortable').filter({ hasText: new RegExp(name, 'i') });
  }

  /** The active-sort indicator on whichever header is currently sorted. */
  activeSortIcon(): Locator {
    return this.page.locator('th.sortable .sort-active');
  }

  // ── List / Grid / Calendar view toggle ──

  /** The list/grid/calendar view-toggle container. */
  viewToggle(): Locator {
    return this.page.locator('.view-toggle');
  }

  /** All buttons within the view toggle. */
  viewToggleButtons(): Locator {
    return this.viewToggle().getByRole('button');
  }

  /** The "List" view-toggle button. */
  listViewButton(): Locator {
    return this.viewToggle().getByRole('button', { name: 'List' });
  }

  /** The "Grid" view-toggle button. */
  gridViewButton(): Locator {
    return this.viewToggle().getByRole('button', { name: 'Grid' });
  }

  /** The "Calendar" view-toggle button. */
  calendarViewButton(): Locator {
    return this.viewToggle().getByRole('button', { name: 'Calendar' });
  }

  // ── Grid view ──

  /** The grid-view container (present when at least one expense exists). */
  grid(): Locator {
    return this.page.locator('.expense-grid');
  }

  /** All grid cards. */
  gridCards(): Locator {
    return this.page.locator('.expense-grid-card');
  }

  /**
   * A grid card matched by text.
   * @param text - text to match within the card
   */
  gridCard(text: string): Locator {
    return this.gridCards().filter({ hasText: text });
  }

  /**
   * A grid card's category chip.
   * @param text - text identifying the card
   */
  gridCardCategory(text: string): Locator {
    return this.gridCard(text).locator('.expense-grid-cat');
  }

  /**
   * A grid card's amount.
   * @param text - text identifying the card
   */
  gridCardAmount(text: string): Locator {
    return this.gridCard(text).locator('.expense-grid-amount');
  }

  /**
   * A grid card's meta line.
   * @param text - text identifying the card
   */
  gridCardMeta(text: string): Locator {
    return this.gridCard(text).locator('.expense-grid-meta');
  }

  /**
   * A grid card's description.
   * @param text - text identifying the card
   */
  gridCardDescription(text: string): Locator {
    return this.gridCard(text).locator('.expense-grid-desc');
  }

  /**
   * A grid card's "receipt" pill.
   * @param text - text identifying the card
   */
  gridCardReceiptPill(text: string): Locator {
    return this.gridCard(text).locator('.pill.ok');
  }

  /**
   * A grid card's Edit button.
   * @param text - text identifying the card
   */
  gridCardEditButton(text: string): Locator {
    return this.gridCard(text).getByRole('button', { name: 'Edit' });
  }

  /**
   * A grid card's Delete button.
   * @param text - text identifying the card
   */
  gridCardDeleteButton(text: string): Locator {
    return this.gridCard(text).getByRole('button', { name: 'Delete' });
  }

  /**
   * A grid card's "edited or deleted" lock icon.
   * @param text - text identifying the card
   */
  gridCardLockIcon(text: string): Locator {
    return this.gridCard(text).locator('[title*="edited or deleted"]');
  }

  /** The grid view's "Load more" button. */
  gridLoadMoreButton(): Locator {
    return this.page.locator('.expense-grid-more button');
  }

  /** Switch to Grid view and wait for the grid to appear. */
  async openGrid(): Promise<void> {
    await this.gridViewButton().click();
    await expect(this.grid()).toBeVisible();
  }

  /**
   * Open the Edit form from a grid card and wait for the Edit heading.
   * @param text - text identifying the card
   */
  async editGridCard(text: string): Promise<void> {
    await this.gridCardEditButton(text).click();
    await expect(this.dialog().getByRole('heading', { name: 'Edit Expense' })).toBeVisible();
  }

  /**
   * Open the delete modal from a grid card and wait for it to appear.
   * @param text - text identifying the card
   */
  async openGridDeleteModal(text: string): Promise<void> {
    await this.gridCardDeleteButton(text).click();
    await expect(this.deleteDialog()).toBeVisible();
  }

  /**
   * Delete a grid card via the confirmation modal and wait for it to close.
   * @param text - text identifying the card
   */
  async deleteGridCard(text: string): Promise<void> {
    await this.openGridDeleteModal(text);
    await this.deleteYesButton().click();
    await expect(this.deleteDialog()).toBeHidden();
  }

  // ── Calendar view ──

  /** The calendar-view grid. */
  calendarGrid(): Locator {
    return this.page.locator('.cal-grid');
  }

  /** The calendar's current month label. */
  calendarMonthLabel(): Locator {
    return this.page.locator('.cal-month-label');
  }

  /** The calendar's "Prev" navigation button. */
  calendarPrevButton(): Locator {
    return this.page.locator('.cal-nav').getByRole('button', { name: /Prev/ });
  }

  /** The calendar's "Next" navigation button. */
  calendarNextButton(): Locator {
    return this.page.locator('.cal-nav').getByRole('button', { name: /Next/ });
  }
}
