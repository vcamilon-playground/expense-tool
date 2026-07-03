import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

// Mirrors OTHER_BRAND in apps/web/src/app/income/page.tsx — the option value for
// "Other (not listed)", which reveals a free-text company-name input.
const OTHER_BRAND = '__other__';

/** Page object for the `/income` page: source cards, Add/Edit, Add Money, Transfer, and the history link. */
export class IncomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Navigate to the income page and wait for the initial load to settle. */
  async goto(): Promise<void> {
    await this.page.goto('/income');
    await this.waitForLoad();
  }

  /** The `<h1>` "Income" page heading. */
  heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: 'Income' });
  }

  /** The "+ Add Source" button. */
  addSourceButton(): Locator {
    return this.page.getByRole('button', { name: '+ Add Source' });
  }

  /** The "⇄ Transfer" button. */
  transferButton(): Locator {
    return this.page.getByRole('button', { name: '⇄ Transfer' });
  }

  /** The amount-privacy eye toggle ("Hide amounts" / "Show amounts"). */
  privacyToggle(): Locator {
    return this.page.getByRole('button', { name: /Hide amounts|Show amounts/ });
  }

  /**
   * A summary stat card (Bank Total, E-Wallet Total, Cash on Hand, Grand Total).
   * @param label - the card's label text
   */
  summaryCard(label: string): Locator {
    return this.page.locator('.stat.card').filter({ hasText: label });
  }

  /**
   * The value shown on a summary card.
   * @param label - the card's label text
   */
  summaryValue(label: string): Locator {
    return this.summaryCard(label).locator('.value');
  }

  /**
   * A summary card's inline eye toggle (reveals just this card's amount).
   * @param label - the card's label text
   */
  summaryCardEye(label: string): Locator {
    return this.summaryCard(label).locator('.amount-eye');
  }

  // ── Add / Edit modal ──

  /** The Add/Edit source modal dialog. */
  dialog(): Locator {
    return this.page.getByRole('dialog');
  }

  /** Open the Add Source modal and wait for it to appear. */
  async openAddModal(): Promise<void> {
    await this.addSourceButton().click();
    await expect(this.dialog()).toBeVisible();
  }

  /** The Type `<select>` (bank / e-wallet / cash) in the Add/Edit form. */
  typeSelect(): Locator {
    return this.dialog().locator('label').filter({ hasText: 'Type' }).locator('select');
  }

  /**
   * The bank / e-wallet company picker shown for non-cash types — the only select
   * whose placeholder option reads "Select a/an …".
   */
  brandSelect(): Locator {
    return this.dialog().locator('select', { has: this.page.locator('option', { hasText: /^Select a/ }) });
  }

  /** The optional "Display name" input (not the company picker). */
  nameInput(): Locator {
    return this.dialog().locator('label').filter({ hasText: 'Display name' }).locator('input');
  }

  /** The balance `<input>` in the Add/Edit form. */
  balanceInput(): Locator {
    return this.dialog().locator('input[type="number"]');
  }

  /** The Add/Edit form's submit button ("Add" or "Update"). */
  submitButton(): Locator {
    return this.dialog().getByRole('button', { name: /^(Add|Update)$/ });
  }

  /** The inline validation error inside the Add/Edit form. */
  fieldError(): Locator {
    return this.dialog().locator('.field-error');
  }

  /**
   * Create a bank source end-to-end via the Add form (using "Other" company +
   * free-text name) and wait for the modal to close.
   * @param name - the bank/display name to enter
   * @param balance - the starting balance
   */
  async addBankSource(name: string, balance: string): Promise<void> {
    await this.openAddModal();
    await this.typeSelect().selectOption('bank');
    // A company is required; "Other (not listed)" reveals a free-text name field.
    await this.brandSelect().selectOption(OTHER_BRAND);
    await this.dialog().locator('label').filter({ hasText: 'Bank name' }).locator('input').fill(name);
    await this.balanceInput().fill(balance);
    await this.dialog().getByRole('button', { name: 'Add' }).click();
    await expect(this.dialog()).toBeHidden();
  }

  // ── Add Money (top-up) modal ──

  /** The "Add Money to …" modal dialog. */
  addMoneyDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'Add Money to' });
  }

  /**
   * The "+ Add" button on a bank / e-wallet source row.
   * @param name - the source's name
   */
  addMoneyButton(name: string): Locator {
    return this.row(name).getByRole('button', { name: '+ Add' });
  }

  /** The "+ Add Money" button in the Cash on Hand section. */
  cashAddMoneyButton(): Locator {
    return this.page.getByRole('button', { name: '+ Add Money' });
  }

  /**
   * Open the Add Money modal for a source and wait for it to appear.
   * @param name - the source's name
   */
  async openAddMoney(name: string): Promise<void> {
    await this.addMoneyButton(name).click();
    await expect(this.addMoneyDialog()).toBeVisible();
  }

  /** The amount `<input>` in the Add Money modal. */
  addMoneyAmountInput(): Locator {
    return this.addMoneyDialog().locator('input[type="number"]');
  }

  /** The submit button in the Add Money modal ("Add Money" / "Adding…"). */
  addMoneySubmit(): Locator {
    return this.addMoneyDialog().getByRole('button', { name: /^(Add Money|Adding…)$/ });
  }

  /** The inline validation error in the Add Money modal. */
  addMoneyError(): Locator {
    return this.addMoneyDialog().locator('.field-error');
  }

  /**
   * Top up a source end-to-end via the Add Money modal and wait for it to close.
   * @param name - the source's name
   * @param amount - the amount to add
   */
  async addMoney(name: string, amount: string): Promise<void> {
    await this.openAddMoney(name);
    await this.addMoneyAmountInput().fill(amount);
    await this.addMoneySubmit().click();
    await expect(this.addMoneyDialog()).toBeHidden();
  }

  // ── Source rows (within the Bank Accounts / E-Wallets tables) ──

  /**
   * A source row matched by name. The Transaction History table also carries
   * `.income-table` for styling, so `.history-table` is excluded to avoid matching
   * history rows.
   * @param name - the source's name
   */
  row(name: string): Locator {
    return this.page
      .locator('.income-table:not(.history-table) tbody tr')
      .filter({ hasText: name });
  }

  /**
   * The Edit button within a source row.
   * @param name - the source's name
   */
  editButton(name: string): Locator {
    return this.row(name).getByRole('button', { name: 'Edit' });
  }

  /**
   * The Delete button within a source row.
   * @param name - the source's name
   */
  deleteButton(name: string): Locator {
    return this.row(name).getByRole('button', { name: 'Delete' });
  }

  /** The delete-confirmation dialog. */
  deleteDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'Are you really sure' });
  }

  /**
   * Delete a source via the confirmation modal and wait for it to close.
   * @param name - the source's name
   */
  async deleteRow(name: string): Promise<void> {
    await this.deleteButton(name).click();
    await expect(this.deleteDialog()).toBeVisible();
    await this.deleteDialog().getByRole('button', { name: 'Yes, remove' }).click();
    await expect(this.deleteDialog()).toBeHidden();
  }

  // ── Collapsible section headers ──

  /**
   * A collapsible section header by title.
   * @param title - the section title
   */
  sectionHeader(title: string): Locator {
    return this.page.locator('.collapse-header').filter({ hasText: title });
  }

  /**
   * The white title text inside a themed collapse-header band.
   * @param title - the section title
   */
  sectionHeaderTitle(title: string): Locator {
    return this.sectionHeader(title).locator('h2');
  }

  // ── Transfer modal ──

  /** The "Transfer Between Sources" modal dialog. */
  transferDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'Transfer Between Sources' });
  }

  /** Open the Transfer modal and wait for it to appear. */
  async openTransfer(): Promise<void> {
    await this.transferButton().click();
    await expect(this.transferDialog()).toBeVisible();
  }

  /** The "From" source `<select>` in the Transfer modal. */
  transferFromSelect(): Locator {
    return this.transferDialog().locator('label').filter({ hasText: 'From' }).locator('select');
  }

  /** The "To" source `<select>` in the Transfer modal. */
  transferToSelect(): Locator {
    return this.transferDialog().locator('label').filter({ hasText: 'To' }).locator('select');
  }

  /** The amount `<input>` in the Transfer modal. */
  transferAmountInput(): Locator {
    return this.transferDialog().locator('input[type="number"]');
  }

  /** The "Transfer" submit button. */
  transferSubmit(): Locator {
    return this.transferDialog().getByRole('button', { name: 'Transfer' });
  }

  /** The inline validation error in the Transfer modal. */
  transferError(): Locator {
    return this.transferDialog().locator('.field-error');
  }

  // ── Transaction History ──

  /**
   * The "Transaction History" link. History lives on its own page
   * (`/income/history`); the Income page only links to it.
   */
  historyLink(): Locator {
    return this.page.getByRole('link', { name: /Transaction History/ });
  }

  /** Click through to the transaction-history page. */
  async openHistory(): Promise<void> {
    await this.historyLink().click();
  }
}
