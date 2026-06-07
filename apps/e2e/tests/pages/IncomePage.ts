import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

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
    return this.dialog().locator('select');
  }

  nameInput(): Locator {
    return this.dialog().locator('label').filter({ hasText: 'Name' }).locator('input');
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
    await this.nameInput().fill(name);
    await this.balanceInput().fill(balance);
    await this.dialog().getByRole('button', { name: 'Add' }).click();
    await expect(this.dialog()).toBeHidden();
  }

  // ── Source rows (within the Bank Accounts / E-Wallets tables) ──
  row(name: string): Locator {
    return this.page.locator('.income-table tbody tr').filter({ hasText: name });
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
}
