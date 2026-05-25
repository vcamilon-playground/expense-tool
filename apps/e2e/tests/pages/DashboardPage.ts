import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.waitForLoad();
  }

  heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: 'Dashboard' });
  }

  stats(): Locator {
    return this.page.locator('.stat');
  }

  statLabel(text: string): Locator {
    return this.page.locator('.stat .label').filter({ hasText: text });
  }

  budgetStatusSection(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Budget Status' });
  }

  categoryChartSection(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'This Month by Category' });
  }

  trendSection(): Locator {
    return this.page.getByRole('heading', { level: 2, name: '6-Month Trend' });
  }
}
