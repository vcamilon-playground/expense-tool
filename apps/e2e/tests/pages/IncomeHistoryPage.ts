import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for the standalone Transaction History page (`/income/history`):
 * month-grouped tables of income movements, a "Show archived" toggle, and the
 * shared amount-privacy eye.
 */
export class IncomeHistoryPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Navigate to the transaction-history page and wait for the initial load to settle. */
  async goto(): Promise<void> {
    await this.page.goto('/income/history');
    await this.waitForLoad();
  }

  /** The `<h1>` "Transaction History" heading. */
  heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: 'Transaction History' });
  }

  /** The "Back to Income" link. */
  backLink(): Locator {
    return this.page.getByRole('link', { name: /Back to Income/ });
  }

  /** The amount-privacy eye toggle ("Hide amounts" / "Show amounts"). */
  privacyToggle(): Locator {
    return this.page.getByRole('button', { name: /Hide amounts|Show amounts/ });
  }

  /**
   * Reveal amounts if they are currently masked (the eye persists per device, so
   * a previous page may have left them hidden).
   */
  async revealAmounts(): Promise<void> {
    if ((await this.privacyToggle().getAttribute('aria-label')) === 'Show amounts') {
      await this.privacyToggle().click();
    }
  }

  /** The "Show archived" checkbox. */
  showArchivedCheckbox(): Locator {
    return this.page.locator('label').filter({ hasText: 'Show archived' }).locator('input[type="checkbox"]');
  }

  /**
   * Toggle the "Show archived" checkbox.
   * @param checked - whether archived rows should be shown
   */
  async setShowArchived(checked: boolean): Promise<void> {
    await this.showArchivedCheckbox().setChecked(checked);
  }

  /** The empty-state message shown when there are no transactions. */
  emptyState(): Locator {
    return this.page.locator('.card p.muted').filter({ hasText: /No (recent )?transactions/ });
  }

  /** Month-group headings (e.g. "June 2026"), one per non-empty month bucket. */
  monthHeadings(): Locator {
    return this.page.locator('.card h2');
  }

  /**
   * Column headers of the first month-group table. Positional (`.first()` table) —
   * there is no per-table hook yet (blocked on the data-testid backlog).
   */
  columnHeaders(): Locator {
    return this.page.locator('.history-table').first().locator('thead th');
  }

  /** All history rows across every month group. */
  rows(): Locator {
    return this.page.locator('.history-table tbody tr');
  }

  /**
   * The newest (top) transaction row. Positional — history is ordered newest-first,
   * so the first row is the most recently created movement.
   */
  latestRow(): Locator {
    return this.rows().first();
  }

  /**
   * A single history row located by its Details / Source / Type text. Returns the
   * filtered set (may match more than one); use {@link firstRowMatching} when a
   * single row is expected.
   * @param text - text to match within the row
   */
  row(text: string): Locator {
    return this.rows().filter({ hasText: text });
  }

  /**
   * The most recent row whose text matches. Positional (`.first()`) — used when
   * several movements share the same source/label and the latest one is wanted.
   * @param text - text to match within the row
   */
  firstRowMatching(text: string): Locator {
    return this.row(text).first();
  }

  /**
   * A cell within a row by column index. Positional by necessity — the table cells
   * have no per-column hook (blocked on the data-testid backlog).
   * @param row - the row locator
   * @param columnIndex - zero-based `<td>` index
   */
  private cell(row: Locator, columnIndex: number): Locator {
    return row.locator('td').nth(columnIndex);
  }

  /**
   * The Type label cell (2nd column) of a row.
   * @param row - the row locator
   */
  typeCell(row: Locator): Locator {
    return this.cell(row, 1);
  }

  /**
   * The Source cell (3rd column) of a row.
   * @param row - the row locator
   */
  sourceCell(row: Locator): Locator {
    return this.cell(row, 2);
  }

  /**
   * The signed Amount cell (4th column) of a row.
   * @param row - the row locator
   */
  amountCell(row: Locator): Locator {
    return this.cell(row, 3);
  }

  /**
   * The Details cell (5th column) of a row.
   * @param row - the row locator
   */
  detailsCell(row: Locator): Locator {
    return this.cell(row, 4);
  }

  /**
   * The Type cell of the row matched by text.
   * @param text - text to match within the row
   */
  rowType(text: string): Locator {
    return this.typeCell(this.row(text));
  }

  /**
   * The Source cell of the row matched by text.
   * @param text - text to match within the row
   */
  rowSource(text: string): Locator {
    return this.sourceCell(this.row(text));
  }

  /**
   * The Amount cell of the row matched by text.
   * @param text - text to match within the row
   */
  rowAmount(text: string): Locator {
    return this.amountCell(this.row(text));
  }

  /**
   * The Details cell of the row matched by text.
   * @param text - text to match within the row
   */
  rowDetails(text: string): Locator {
    return this.detailsCell(this.row(text));
  }
}
