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

  // The Home page no longer has an <h1>; the page is identified by the
  // time-based greeting in the site header (e.g. "Good Morning, E2E!").
  greeting(): Locator {
    return this.page.locator('.site-welcome');
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

  dailyTrendSection(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Daily Spend — Past 7 Days' });
  }

  weeklyTrendSection(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Weekly Spend — Past 5 Weeks' });
  }

  upcomingChargesSection(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Upcoming Charges' });
  }

  banner(): Locator {
    return this.page.locator('.banner.banner-danger');
  }

  upcomingTable(): Locator {
    return this.page.locator('.card').filter({ hasText: 'Upcoming Charges' }).locator('table');
  }

  sortableHeader(name: string): Locator {
    return this.upcomingTable().locator('th.sortable').filter({ hasText: new RegExp(name, 'i') });
  }
}
