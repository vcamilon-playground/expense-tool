import { Locator, Page } from '@playwright/test';
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

  monthlyLimitInput(): Locator {
    return this.page.locator('input[type="number"]');
  }

  currentBudgetsHeading(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Current Budgets' });
  }
}
