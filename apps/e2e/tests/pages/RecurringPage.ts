import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/** Page object for the `/recurring` page: recurring-expense rows, the Add/Edit form, and the pay/confirm/reminder modals. */
export class RecurringPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Navigate to the recurring page and wait for the initial load to settle. */
  async goto(): Promise<void> {
    await this.page.goto('/recurring');
    await this.waitForLoad();
  }

  /** The `<h1>` "Recurring Expenses" page heading. */
  heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: 'Recurring Expenses' });
  }

  /** The intro description text. */
  descriptionText(): Locator {
    return this.page.getByText(/Track subscriptions/i);
  }

  /** The "Current Recurring" section title (a `.card > h2` with the accent bar). */
  cardTitle(): Locator {
    return this.page.locator('.card > h2').filter({ hasText: 'Current Recurring' });
  }

  /** The "+ Add Recurring" button. */
  addButton(): Locator {
    return this.page.getByRole('button', { name: '+ Add Recurring' });
  }

  /** The Add/Edit recurring-expense modal dialog. */
  dialog(): Locator {
    return this.page.getByRole('dialog');
  }

  /** The "Add Recurring Expense" heading inside the modal. */
  addModalHeading(): Locator {
    return this.dialog().getByRole('heading', { name: 'Add Recurring Expense' });
  }

  /**
   * The Cadence `<select>`. Positional (`.first()` select) — the form's selects
   * carry no per-field testid.
   */
  cadenceSelect(): Locator {
    return this.dialog().locator('select').first();
  }

  /** The recurring-expenses `<table>` (present only when ≥1 recurring exists). */
  table(): Locator {
    return this.page.getByTestId('recurring-table');
  }

  /**
   * A recurring-expense row matched by name.
   * @param name - the recurring expense's name
   */
  row(name: string): Locator {
    return this.table().locator('tbody tr').filter({ hasText: name });
  }

  /**
   * The Next Charge date cell (4th column) of a row. Positional column access —
   * table cells carry no per-column testid.
   * @param name - the recurring expense's name
   */
  chargeDateCell(name: string): Locator {
    return this.row(name).locator('td').nth(3);
  }

  /**
   * The Amount cell of a row (shows `₱X` / `~₱X` / `Varies`). Located by its
   * `data-label` rather than by column index.
   * @param name - the recurring expense's name
   */
  amountCell(name: string): Locator {
    return this.row(name).locator('td[data-label="Amount"]');
  }

  /** The Name `<input>` in the Add/Edit form. */
  nameInput(): Locator {
    return this.dialog().locator('label').filter({ hasText: 'Name' }).locator('input');
  }

  /**
   * The Amount `<input>` in the Add/Edit form. Scoped to the label that owns the
   * number field so the "Variable amount" checkbox label never collides.
   */
  amountInput(): Locator {
    return this.dialog().locator('label').filter({ hasText: 'Amount' }).locator('input[type="number"]');
  }

  /** The inline validation error below the Amount field in the Add/Edit form. */
  amountError(): Locator {
    return this.dialog().locator('label').filter({ hasText: 'Amount' }).locator('.field-error');
  }

  /**
   * The "Variable amount" checkbox in the Add/Edit form. Scoped to its own label
   * so it is not confused with the Amount number field.
   */
  variableCheckbox(): Locator {
    return this.dialog().locator('label').filter({ hasText: 'Variable amount' }).locator('input[type="checkbox"]');
  }

  /** The fixed-mode Amount field label (`.muted` reads exactly "Amount"). */
  fixedAmountLabel(): Locator {
    return this.dialog().getByText('Amount', { exact: true });
  }

  /** The variable-mode Amount field label ("Estimated amount (optional)"). */
  estimatedAmountLabel(): Locator {
    return this.dialog().getByText('Estimated amount (optional)');
  }

  /**
   * Set the "Variable amount" checkbox to the desired state.
   * @param on - true to enable variable mode, false to disable
   */
  async setVariable(on: boolean): Promise<void> {
    await this.variableCheckbox().setChecked(on);
  }

  /** Open the Add Recurring modal and wait for it to appear. */
  async openAddModal(): Promise<void> {
    await this.addButton().click();
    await expect(this.dialog().getByRole('heading', { name: 'Add Recurring Expense' })).toBeVisible();
  }

  /**
   * Fill the Add/Edit form's name and amount.
   * @param data - the field values to enter
   */
  async fillForm(data: { name: string; amount: string }): Promise<void> {
    const d = this.dialog();
    await d.locator('label').filter({ hasText: 'Name' }).locator('input').fill(data.name);
    await d.locator('label').filter({ hasText: 'Amount' }).locator('input[type="number"]').fill(data.amount);
  }

  /**
   * Fill only the Amount field.
   * @param amount - the amount to enter
   */
  async fillAmount(amount: string): Promise<void> {
    await this.dialog().locator('label').filter({ hasText: 'Amount' }).locator('input[type="number"]').fill(amount);
  }

  /** Submit the Add form and wait for the modal to close. */
  async submitAdd(): Promise<void> {
    await this.dialog().getByRole('button', { name: 'Add Recurring' }).click();
    await expect(this.dialog()).toBeHidden();
  }

  /** Submit the Edit form and wait for the modal to close. */
  async submitEdit(): Promise<void> {
    await this.dialog().getByRole('button', { name: 'Update' }).click();
    await expect(this.dialog()).toBeHidden();
  }

  /** Cancel the open form via its Cancel button. */
  async cancel(): Promise<void> {
    await this.page.getByRole('button', { name: 'Cancel' }).click();
  }

  /**
   * Open the Edit form for a row and wait for the Edit heading.
   * @param name - the recurring expense's name
   */
  async editRow(name: string): Promise<void> {
    await this.row(name).getByRole('button', { name: 'Edit' }).click();
    await expect(this.dialog().getByRole('heading', { name: 'Edit Recurring Expense' })).toBeVisible();
  }

  /** The delete-confirmation dialog. */
  deleteDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'Are you really sure' });
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
   * @param name - the recurring expense's name
   */
  async openDeleteModal(name: string): Promise<void> {
    await this.row(name).getByRole('button', { name: 'Delete' }).click();
    await expect(this.deleteDialog()).toBeVisible();
  }

  /**
   * Delete a row via the confirmation modal and wait for it to close.
   * @param name - the recurring expense's name
   */
  async deleteRow(name: string): Promise<void> {
    await this.openDeleteModal(name);
    await this.deleteYesButton().click();
    await expect(this.deleteDialog()).toBeHidden();
  }

  /**
   * The "overdue" due badge on a row.
   * @param name - the recurring expense's name
   */
  dueBadge(name: string): Locator {
    return this.row(name).locator('.pill.over');
  }

  /**
   * The "Confirm Payment" button on a due row.
   * @param name - the recurring expense's name
   */
  confirmPaymentButton(name: string): Locator {
    return this.row(name).getByRole('button', { name: 'Confirm Payment' });
  }

  /** The "already been paid" confirmation modal. */
  confirmModal(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: /already been paid/ });
  }

  /** The confirm modal's "Yes" button. */
  confirmYesButton(): Locator {
    return this.confirmModal().getByRole('button', { name: /Yes/ });
  }

  /** The confirm modal's "No" button. */
  confirmNoButton(): Locator {
    return this.confirmModal().getByRole('button', { name: /No/ });
  }

  /** The "Amount paid" number input inside the Confirm Payment modal. */
  confirmAmountInput(): Locator {
    return this.confirmModal().locator('label').filter({ hasText: 'Amount paid' }).locator('input[type="number"]');
  }

  /** The inline error below the "Amount paid" field in the Confirm Payment modal. */
  confirmAmountError(): Locator {
    return this.confirmModal().locator('label').filter({ hasText: 'Amount paid' }).locator('.field-error');
  }

  /**
   * The "Pay Now" button on a not-yet-due row.
   * @param name - the recurring expense's name
   */
  payNowButton(name: string): Locator {
    return this.row(name).getByRole('button', { name: 'Pay Now' });
  }

  /** The "Record Early Payment" modal. */
  earlyPayModal(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: /Record Early Payment/ });
  }

  /** The early-pay modal's "Yes, record it" button. */
  earlyPayConfirmButton(): Locator {
    return this.earlyPayModal().getByRole('button', { name: 'Yes, record it' });
  }

  /** The early-pay modal's "Cancel" button. */
  earlyPayCancelButton(): Locator {
    return this.earlyPayModal().getByRole('button', { name: 'Cancel' });
  }

  /** The "Amount paid" number input inside the Record Early Payment modal. */
  earlyPayAmountInput(): Locator {
    return this.earlyPayModal().locator('label').filter({ hasText: 'Amount paid' }).locator('input[type="number"]');
  }

  /** The inline error below the "Amount paid" field in the Record Early Payment modal. */
  earlyPayAmountError(): Locator {
    return this.earlyPayModal().locator('label').filter({ hasText: 'Amount paid' }).locator('.field-error');
  }

  /** The "will not be added" reminder modal. */
  reminderModal(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: /will not be added/ });
  }

  /** The reminder modal's "OK" button. */
  reminderOkButton(): Locator {
    return this.reminderModal().getByRole('button', { name: 'OK' });
  }

  /**
   * A sortable column header matched by name (case-insensitive).
   * @param name - the column name
   */
  sortableHeader(name: string): Locator {
    return this.table().locator('th.sortable').filter({ hasText: new RegExp(name, 'i') });
  }

  /**
   * A table header cell matched by name (case-insensitive).
   * @param name - the column name
   */
  headerCell(name: string): Locator {
    return this.table().locator('thead th').filter({ hasText: new RegExp(name, 'i') });
  }

  /** The active-sort indicator on whichever header is currently sorted. */
  activeSortIcon(): Locator {
    return this.table().locator('th.sortable .sort-active');
  }
}
