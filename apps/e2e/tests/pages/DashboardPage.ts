import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/** Page object for the dashboard / home page (`/`): KPI stats, quick actions, budget status, charts, and upcoming charges. */
export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Navigate to the dashboard and wait for the initial load to settle. */
  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.waitForLoad();
  }

  /**
   * The time-based greeting in the site header (e.g. "Good Morning, E2E!"). The
   * Home page has no `<h1>`, so this identifies the page.
   */
  greeting(): Locator {
    return this.page.getByTestId('site-welcome');
  }

  /** All KPI stat tiles. */
  stats(): Locator {
    return this.page.getByTestId('stat-tile');
  }

  /**
   * A stat tile's label by text.
   * @param text - the label text
   */
  statLabel(text: string): Locator {
    return this.stats().locator('.label').filter({ hasText: text });
  }

  /** The `<h2>` "Budget Status" section heading. */
  budgetStatusSection(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Budget Status' });
  }

  // ── Quick actions row (below the KPI SummaryCards, above Budget Status) ──

  /** The quick-actions row container. */
  quickActions(): Locator {
    return this.page.getByTestId('quick-actions');
  }

  /** All quick-action links. */
  quickActionLinks(): Locator {
    return this.quickActions().getByTestId('quick-action');
  }

  /**
   * A quick-action link by label.
   * @param label - the action label
   */
  quickAction(label: string): Locator {
    return this.quickActions().getByTestId('quick-action').filter({ hasText: label });
  }

  /** All quick-action label elements. */
  quickActionLabels(): Locator {
    return this.quickActions().getByTestId('quick-action-label');
  }

  /** The Budget Status card. */
  budgetStatusCard(): Locator {
    return this.page.locator('.card').filter({ hasText: 'Budget Status' });
  }

  /** The Budget Status table. */
  budgetStatusTable(): Locator {
    return this.budgetStatusCard().getByTestId('budget-status-table');
  }

  /**
   * A category budget-status row by name (matched on the Category cell's data-label).
   * The computed Overall row lives in `<tfoot>` — see {@link budgetOverallRow}.
   * @param name - the category name
   */
  budgetStatusRow(name: string): Locator {
    return this.budgetStatusTable()
      .locator('tbody tr')
      .filter({ has: this.page.locator('td[data-label="Category"]', { hasText: name }) });
  }

  /** All category budget-status rows in `<tbody>`. */
  budgetStatusCategoryRows(): Locator {
    return this.budgetStatusTable().locator('tbody tr');
  }

  /** The computed, read-only Overall summary row (in `<tfoot>`). */
  budgetOverallRow(): Locator {
    return this.budgetStatusTable().locator('tfoot tr.budget-status-summary');
  }

  /** Rows in document order across tbody + tfoot (to assert Overall comes last). */
  budgetStatusAllRows(): Locator {
    return this.budgetStatusTable().locator('tbody tr, tfoot tr');
  }

  /**
   * The "% of Budget" label within a budget row.
   * @param row - the row locator
   */
  budgetRowPercentLabel(row: Locator): Locator {
    return row.locator('td[data-label="% of Budget"] .pct-pill-label');
  }

  /**
   * The "% of Budget" pill within a budget row.
   * @param row - the row locator
   */
  budgetRowPill(row: Locator): Locator {
    return row.locator('td[data-label="% of Budget"] .pct-pill');
  }

  /** The "No budgets set" empty state in the Budget Status card. */
  budgetEmptyState(): Locator {
    return this.budgetStatusCard().getByText('No budgets set. Add one on the Budgets page.');
  }

  /** The `<h2>` "This Month by Category" chart heading. */
  categoryChartSection(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'This Month by Category' });
  }

  /** The `<h2>` "6-Month Trend" chart heading. */
  trendSection(): Locator {
    return this.page.getByRole('heading', { level: 2, name: '6-Month Trend' });
  }

  /** The `<h2>` "Daily Spend — Past 7 Days" chart heading. */
  dailyTrendSection(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Daily Spend — Past 7 Days' });
  }

  /** The `<h2>` "Weekly Spend — Past 5 Weeks" chart heading. */
  weeklyTrendSection(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Weekly Spend — Past 5 Weeks' });
  }

  /** The `<h2>` "Upcoming Charges" section heading. */
  upcomingChargesSection(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Upcoming Charges' });
  }

  /** The dashboard error banner. */
  banner(): Locator {
    return this.page.locator('.banner.banner-danger');
  }

  /** The Upcoming Charges table. */
  upcomingTable(): Locator {
    return this.page.locator('.card').filter({ hasText: 'Upcoming Charges' }).locator('table');
  }

  /**
   * A sortable header in the Upcoming Charges table, matched by name.
   * @param name - the column name
   */
  sortableHeader(name: string): Locator {
    return this.upcomingTable().locator('th.sortable').filter({ hasText: new RegExp(name, 'i') });
  }
}
