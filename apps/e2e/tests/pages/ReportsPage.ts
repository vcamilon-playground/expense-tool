import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ReportsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/reports');
    await this.waitForLoad();
  }

  heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: 'Reports' });
  }

  periodSelect(): Locator {
    return this.page.locator('label').filter({ hasText: 'Period' }).locator('select');
  }

  presetPeriodButton(): Locator {
    return this.page.getByRole('button', { name: 'Preset Period' });
  }

  dateRangeButton(): Locator {
    return this.page.getByRole('button', { name: 'Date Range' });
  }

  dateInput(): Locator {
    return this.page.locator('label').filter({ hasText: 'Reference Date' }).locator('input[type="date"]');
  }

  customFromInput(): Locator {
    return this.page.locator('label').filter({ hasText: 'From' }).locator('input[type="date"]');
  }

  customToInput(): Locator {
    return this.page.locator('label').filter({ hasText: 'To' }).locator('input[type="date"]');
  }

  statLabel(text: string): Locator {
    return this.page.locator('.stat .label').filter({ hasText: text });
  }

  byCategoryHeading(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'By Category' });
  }

  dateRangeText(): Locator {
    return this.page.getByText(/Showing/);
  }

  compareCheckbox(): Locator {
    return this.page.locator('input[type="checkbox"]');
  }

  comparisonHeading(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Period Comparison' });
  }

  async selectPeriod(value: string): Promise<void> {
    await this.periodSelect().selectOption(value);
  }
}
