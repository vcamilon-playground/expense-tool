import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

// Mirrors OTHER_BRAND in apps/web/src/app/income/page.tsx — the option value for
// "Other (not listed)", which reveals a free-text company-name input.
const OTHER_BRAND = '__other__';

export class IncomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/income');
    await this.waitForLoad();
  }

  heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: 'Income' });
  }

  addSourceButton(): Locator {
    return this.page.getByRole('button', { name: '+ Add Source' });
  }

  transferButton(): Locator {
    return this.page.getByRole('button', { name: '⇄ Transfer' });
  }

  privacyToggle(): Locator {
    return this.page.getByRole('button', { name: /Hide amounts|Show amounts/ });
  }

  // Summary stat cards (Bank Total, E-Wallet Total, Cash on Hand, Grand Total)
  summaryCard(label: string): Locator {
    return this.page.locator('.stat.card').filter({ hasText: label });
  }

  summaryValue(label: string): Locator {
    return this.summaryCard(label).locator('.value');
  }

  // Per-card inline eye toggle (reveals just this card's amount).
  summaryCardEye(label: string): Locator {
    return this.summaryCard(label).locator('.amount-eye');
  }

  // ── Add / Edit modal ──
  dialog(): Locator {
    return this.page.getByRole('dialog');
  }

  async openAddModal(): Promise<void> {
    await this.addSourceButton().click();
    await expect(this.dialog()).toBeVisible();
  }

  typeSelect(): Locator {
    return this.dialog().locator('label').filter({ hasText: 'Type' }).locator('select');
  }

  // The bank / e-wallet company picker shown for non-cash types — the only
  // select whose placeholder option reads "Select a/an …".
  brandSelect(): Locator {
    return this.dialog().locator('select', { has: this.page.locator('option', { hasText: /^Select a/ }) });
  }

  // The optional "Display name" input (not the company picker).
  nameInput(): Locator {
    return this.dialog().locator('label').filter({ hasText: 'Display name' }).locator('input');
  }

  balanceInput(): Locator {
    return this.dialog().locator('input[type="number"]');
  }

  submitButton(): Locator {
    return this.dialog().getByRole('button', { name: /^(Add|Update)$/ });
  }

  fieldError(): Locator {
    return this.dialog().locator('.field-error');
  }

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
  addMoneyDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'Add Money to' });
  }

  // The "+ Add" button on a bank / e-wallet source row.
  addMoneyButton(name: string): Locator {
    return this.row(name).getByRole('button', { name: '+ Add' });
  }

  // The "+ Add Money" button in the Cash on Hand section.
  cashAddMoneyButton(): Locator {
    return this.page.getByRole('button', { name: '+ Add Money' });
  }

  async openAddMoney(name: string): Promise<void> {
    await this.addMoneyButton(name).click();
    await expect(this.addMoneyDialog()).toBeVisible();
  }

  addMoneyAmountInput(): Locator {
    return this.addMoneyDialog().locator('input[type="number"]');
  }

  addMoneySubmit(): Locator {
    return this.addMoneyDialog().getByRole('button', { name: /^(Add Money|Adding…)$/ });
  }

  addMoneyError(): Locator {
    return this.addMoneyDialog().locator('.field-error');
  }

  async addMoney(name: string, amount: string): Promise<void> {
    await this.openAddMoney(name);
    await this.addMoneyAmountInput().fill(amount);
    await this.addMoneySubmit().click();
    await expect(this.addMoneyDialog()).toBeHidden();
  }

  // ── Source rows (within the Bank Accounts / E-Wallets tables) ──
  // The Transaction History table also carries .income-table for styling, so
  // exclude it (.history-table) to avoid matching history rows.
  row(name: string): Locator {
    return this.page
      .locator('.income-table:not(.history-table) tbody tr')
      .filter({ hasText: name });
  }

  editButton(name: string): Locator {
    return this.row(name).getByRole('button', { name: 'Edit' });
  }

  deleteButton(name: string): Locator {
    return this.row(name).getByRole('button', { name: 'Delete' });
  }

  deleteDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'Are you really sure' });
  }

  async deleteRow(name: string): Promise<void> {
    await this.deleteButton(name).click();
    await expect(this.deleteDialog()).toBeVisible();
    await this.deleteDialog().getByRole('button', { name: 'Yes, remove' }).click();
    await expect(this.deleteDialog()).toBeHidden();
  }

  // ── Collapsible section headers ──
  sectionHeader(title: string): Locator {
    return this.page.locator('.collapse-header').filter({ hasText: title });
  }

  // The white title text inside a themed collapse-header band.
  sectionHeaderTitle(title: string): Locator {
    return this.sectionHeader(title).locator('h2');
  }

  // ── Transfer modal ──
  transferDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'Transfer Between Sources' });
  }

  async openTransfer(): Promise<void> {
    await this.transferButton().click();
    await expect(this.transferDialog()).toBeVisible();
  }

  transferFromSelect(): Locator {
    return this.transferDialog().locator('label').filter({ hasText: 'From' }).locator('select');
  }

  transferToSelect(): Locator {
    return this.transferDialog().locator('label').filter({ hasText: 'To' }).locator('select');
  }

  transferAmountInput(): Locator {
    return this.transferDialog().locator('input[type="number"]');
  }

  transferSubmit(): Locator {
    return this.transferDialog().getByRole('button', { name: 'Transfer' });
  }

  transferError(): Locator {
    return this.transferDialog().locator('.field-error');
  }

  // ── Transaction History section ──
  // The whole history card (scopes the shared .income-table class so it never
  // matches the Bank Accounts / E-Wallets source tables).
  historyCard(): Locator {
    return this.page.locator('.card').filter({ hasText: '🧾 Transaction History' });
  }

  historyHeaderButton(): Locator {
    return this.historyCard().locator('.collapse-header');
  }

  historyHeaderTitle(): Locator {
    return this.historyHeaderButton().locator('h2');
  }

  async toggleHistory(): Promise<void> {
    await this.historyHeaderButton().click();
  }

  showArchivedCheckbox(): Locator {
    return this.historyCard().locator('label').filter({ hasText: 'Show archived' }).locator('input[type="checkbox"]');
  }

  async setShowArchived(checked: boolean): Promise<void> {
    await this.showArchivedCheckbox().setChecked(checked);
  }

  historyEmptyState(): Locator {
    return this.historyCard().locator('p.muted').filter({ hasText: /No (recent )?transactions/ });
  }

  historyTable(): Locator {
    return this.historyCard().locator('table.history-table');
  }

  historyRows(): Locator {
    return this.historyTable().locator('tbody tr');
  }

  // A single history row located by its Details / Source / Type text.
  historyRow(text: string): Locator {
    return this.historyRows().filter({ hasText: text });
  }

  // The signed Amount cell (4th column) of a history row.
  historyRowAmount(text: string): Locator {
    return this.historyRow(text).locator('td').nth(3);
  }

  // The Type label cell (2nd column) of a history row.
  historyRowType(text: string): Locator {
    return this.historyRow(text).locator('td').nth(1);
  }

  // The Source cell (3rd column) of a history row.
  historyRowSource(text: string): Locator {
    return this.historyRow(text).locator('td').nth(2);
  }

  // The Details cell (5th column) of a history row.
  historyRowDetails(text: string): Locator {
    return this.historyRow(text).locator('td').nth(4);
  }
}
