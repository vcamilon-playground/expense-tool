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

  dateInput(): Locator {
    return this.page.locator('input[type="date"]');
  }

  exportCsvButton(): Locator {
    return this.page.getByTitle('Export as CSV');
  }

  exportExcelButton(): Locator {
    return this.page.getByTitle('Export as Excel');
  }

  exportPdfButton(): Locator {
    return this.page.getByTitle('Export as PDF');
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

  async selectPeriod(value: string): Promise<void> {
    await this.periodSelect().selectOption(value);
  }
}
