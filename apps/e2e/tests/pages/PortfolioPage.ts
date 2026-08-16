import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for the `/portfolio` page — the Net Worth / Investments / Debts
 * dashboard. Focused on the Debts section (months-left detail line and the
 * per-month "Mark paid" status toggle). Money values are masked until the
 * "Show amounts" eye is toggled, so reveal them before asserting figures.
 */
export class PortfolioPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Navigate to the portfolio page and wait for the initial load to settle. */
  async goto(): Promise<void> {
    await this.page.goto('/portfolio');
    await this.waitForLoad();
  }

  /** The `<h1>` "Portfolio" page heading. */
  heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: 'Portfolio' });
  }

  // ── Amount privacy (shared with the Income page via localStorage) ──

  /** The amount-privacy eye toggle ("Show amounts" / "Hide amounts"). */
  amountsToggle(): Locator {
    return this.page.getByRole('button', { name: /Show amounts|Hide amounts/ });
  }

  /**
   * Ensure money values are revealed. Amounts are masked (`••••••`) by default;
   * clicks the eye only when it is currently in the "Show amounts" state so the
   * call is idempotent across tests.
   */
  async revealAmounts(): Promise<void> {
    const toggle = this.amountsToggle();
    if ((await toggle.getAttribute('aria-label')) === 'Show amounts') {
      await toggle.click();
    }
  }

  // ── Summary stat cards ──

  /**
   * The value shown on a summary stat card, located by its label text.
   * @param label - the card's label ("Net Worth", "Total Debt", …)
   */
  private statValue(label: string): Locator {
    return this.page.locator('.stat.card').filter({ hasText: label }).locator('.value');
  }

  /** The Net Worth summary value. */
  netWorthValue(): Locator {
    return this.statValue('Net Worth');
  }

  /** The Total Debt (total owed) summary value. */
  totalOwedValue(): Locator {
    return this.statValue('Total Debt');
  }

  // ── Debts section ──

  /** The Debts section `.card`, scoped by its "Debts" heading. */
  debtsCard(): Locator {
    return this.page
      .locator('.card')
      .filter({ has: this.page.getByRole('heading', { name: 'Debts' }) });
  }

  /** The "… remaining" figure in the Debts card header (sum of debt balances). */
  debtsRemaining(): Locator {
    return this.debtsCard().locator('span.muted').filter({ hasText: 'remaining' });
  }

  /** The muted header note explaining that "Mark paid" doesn't change net worth. */
  headerNote(): Locator {
    return this.debtsCard().locator('p.muted').filter({ hasText: 'monthly status' });
  }

  /**
   * A debt row located by its name text.
   * @param name - the debt's name
   */
  debtRow(name: string): Locator {
    return this.page.getByTestId('debt-row').filter({ hasText: name });
  }

  /**
   * The muted detail line inside a debt row (percent paid, per-month amount, and
   * the "N of M month(s) left" installment count when a monthly payment exists).
   * @param name - the debt's name
   */
  rowDetail(name: string): Locator {
    return this.debtRow(name).locator('span.muted').filter({ hasText: 'paid off' });
  }

  /**
   * The "Mark paid" button inside a debt row (shown when not paid this month and
   * the debt has a monthly payment).
   * @param name - the debt's name
   */
  markPaidButton(name: string): Locator {
    return this.debtRow(name).getByRole('button', { name: 'Mark paid' });
  }

  /**
   * The "Undo" button inside a debt row (shown once paid this month).
   * @param name - the debt's name
   */
  undoButton(name: string): Locator {
    return this.debtRow(name).getByRole('button', { name: 'Undo' });
  }

  /**
   * The "✓ Paid this month" pill inside a debt row.
   * @param name - the debt's name
   */
  paidPill(name: string): Locator {
    return this.debtRow(name).locator('span.pill.ok');
  }
}
