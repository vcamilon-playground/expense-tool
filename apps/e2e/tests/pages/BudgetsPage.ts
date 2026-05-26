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

  saveBudgetButton(): Locator {
    return this.page.getByRole('button', { name: 'Save Budget' });
  }

  updateBudgetButton(): Locator {
    return this.page.getByRole('button', { name: 'Update Budget' });
  }

  cancelEditButton(): Locator {
    return this.page.getByRole('button', { name: 'Cancel' });
  }

  monthlyLimitInput(): Locator {
    return this.page.locator('input[type="number"]');
  }

  currentBudgetsHeading(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Current Budgets' });
  }

  row(label: string): Locator {
    return this.page.locator('table tbody tr').filter({ hasText: label });
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
    await expect(this.saveBudgetButton()).toBeVisible();
  }

  async deleteRow(label: string): Promise<void> {
    await this.deleteButton(label).click();
    await expect(this.deleteDialog()).toBeVisible();
    await this.deleteYesButton().click();
    await expect(this.deleteDialog()).toBeHidden();
  }
}
