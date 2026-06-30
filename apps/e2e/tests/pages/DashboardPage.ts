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

  // ── Quick actions row (below the KPI SummaryCards, above Budget Status) ──
  quickActions(): Locator {
    return this.page.locator('.quick-actions');
  }

  quickActionLinks(): Locator {
    return this.quickActions().locator('a.quick-action');
  }

  quickAction(label: string): Locator {
    return this.quickActions().locator('a.quick-action').filter({ hasText: label });
  }

  quickActionLabels(): Locator {
    return this.quickActions().locator('.quick-action-label');
  }

  budgetStatusCard(): Locator {
    return this.page.locator('.card').filter({ hasText: 'Budget Status' });
  }

  budgetStatusTable(): Locator {
    return this.budgetStatusCard().locator('table.budget-status-table');
  }

  // Category rows live in <tbody>; the computed Overall row lives in <tfoot>
  // as tr.budget-status-summary. Match on the Category cell's data-label.
  budgetStatusRow(name: string): Locator {
    return this.budgetStatusTable()
      .locator('tbody tr')
      .filter({ has: this.page.locator('td[data-label="Category"]', { hasText: name }) });
  }

  budgetOverallRow(): Locator {
    return this.budgetStatusTable().locator('tfoot tr.budget-status-summary');
  }

  // Rows in document order across tbody + tfoot, to assert Overall comes last.
  budgetStatusAllRows(): Locator {
    return this.budgetStatusTable().locator('tbody tr, tfoot tr');
  }

  budgetRowPercentLabel(row: Locator): Locator {
    return row.locator('td[data-label="% of Budget"] .pct-pill-label');
  }

  budgetRowPill(row: Locator): Locator {
    return row.locator('td[data-label="% of Budget"] .pct-pill');
  }

  budgetEmptyState(): Locator {
    return this.budgetStatusCard().getByText('No budgets set. Add one on the Budgets page.');
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
