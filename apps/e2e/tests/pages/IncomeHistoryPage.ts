import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

// Page object for the standalone Transaction History page (/income/history):
// month-grouped tables of income movements, a "Show archived" toggle, and the
// shared amount-privacy eye.
export class IncomeHistoryPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/income/history');
    await this.waitForLoad();
  }

  heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: 'Transaction History' });
  }

  backLink(): Locator {
    return this.page.getByRole('link', { name: /Back to Income/ });
  }

  privacyToggle(): Locator {
    return this.page.getByRole('button', { name: /Hide amounts|Show amounts/ });
  }

  // Reveal amounts if they are currently masked (the eye persists per device, so
  // a previous page may have left them hidden).
  async revealAmounts(): Promise<void> {
    if ((await this.privacyToggle().getAttribute('aria-label')) === 'Show amounts') {
      await this.privacyToggle().click();
    }
  }

  showArchivedCheckbox(): Locator {
    return this.page.locator('label').filter({ hasText: 'Show archived' }).locator('input[type="checkbox"]');
  }

  async setShowArchived(checked: boolean): Promise<void> {
    await this.showArchivedCheckbox().setChecked(checked);
  }

  emptyState(): Locator {
    return this.page.locator('.card p.muted').filter({ hasText: /No (recent )?transactions/ });
  }

  // Month-group headings (e.g. "June 2026"), one per non-empty month bucket.
  monthHeadings(): Locator {
    return this.page.locator('.card h2');
  }

  // Column headers of the first month-group table.
  columnHeaders(): Locator {
    return this.page.locator('.history-table').first().locator('thead th');
  }

  // All history rows across every month group.
  rows(): Locator {
    return this.page.locator('.history-table tbody tr');
  }

  // A single history row located by its Details / Source / Type text.
  row(text: string): Locator {
    return this.rows().filter({ hasText: text });
  }

  // The Type label cell (2nd column) of a history row.
  rowType(text: string): Locator {
    return this.row(text).locator('td').nth(1);
  }

  // The Source cell (3rd column) of a history row.
  rowSource(text: string): Locator {
    return this.row(text).locator('td').nth(2);
  }

  // The signed Amount cell (4th column) of a history row.
  rowAmount(text: string): Locator {
    return this.row(text).locator('td').nth(3);
  }

  // The Details cell (5th column) of a history row.
  rowDetails(text: string): Locator {
    return this.row(text).locator('td').nth(4);
  }
}
