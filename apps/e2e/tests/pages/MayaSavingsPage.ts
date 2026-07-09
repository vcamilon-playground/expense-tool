import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page object for the Maya Weekly Savings tracker (`/income/maya`): a deterministic
 * ₱100-per-week Friday savings plan. The stateful part (which weeks are "done") is
 * persisted per-user in the Supabase `maya_savings` table (`done_weeks int[]`) — no
 * localStorage. Tests control done-state by writing the DB row directly
 * (`helpers/supabase.ts` `maya.set`/`maya.reset`) BEFORE navigating, so assertions
 * stay date-robust, then read it back to confirm what the UI persisted.
 */
export class MayaSavingsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Navigate to the Maya tracker and wait for the initial load to settle. */
  async goto(): Promise<void> {
    await this.page.goto('/income/maya');
    await this.waitForLoad();
  }

  /** The `<h1>` "💜 Maya Weekly Savings" heading. */
  heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: '💜 Maya Weekly Savings' });
  }

  /** The "Back to Income" link. */
  backLink(): Locator {
    return this.page.getByRole('link', { name: /Back to Income/ });
  }

  /** The Income-page ghost link into the tracker ("💜 Maya Savings"). */
  incomeLink(): Locator {
    return this.page.getByRole('link', { name: /Maya Savings/ });
  }

  /** The intro description text. */
  introText(): Locator {
    return this.page.getByText(/Every Friday you transfer to Maya/);
  }

  // ── Summary stat cards ──

  /**
   * A summary stat card by label.
   * @param label - the card's label text
   */
  summaryCard(label: string): Locator {
    return this.page.getByTestId('stat-tile').filter({ hasText: label });
  }

  /**
   * The value shown on a summary card.
   * @param label - the card's label text
   */
  summaryValue(label: string): Locator {
    return this.summaryCard(label).locator('.value');
  }

  // ── Progress bar ──

  /** The "Progress to goal" card label. */
  progressToGoalText(): Locator {
    return this.page.getByText('Progress to goal');
  }

  /**
   * The "N%" progress label. Positional (`.last()` span) — it's the trailing span
   * beside the "Progress to goal" text.
   */
  progressPercent(): Locator {
    return this.page.locator('.card').filter({ hasText: 'Progress to goal' }).locator('span').last();
  }

  // ── "This Friday" card ──

  /** The "This Friday · Week …" card. */
  thisFridayCard(): Locator {
    return this.page.locator('.card').filter({ hasText: 'This Friday · Week' });
  }

  /** The toggle button in the "This Friday" card. */
  thisFridayButton(): Locator {
    return this.thisFridayCard().getByRole('button');
  }

  // ── Weekly schedule table ──

  /** The weekly schedule `<table>`. */
  scheduleTable(): Locator {
    return this.page.getByTestId('maya-schedule-table');
  }

  /** All schedule rows. */
  rows(): Locator {
    return this.scheduleTable().locator('tbody tr');
  }

  /**
   * A schedule row by its 1-based week number (first cell). Positional (`.first()`)
   * against the week-number match.
   * @param week - the 1-based week number
   */
  row(week: number): Locator {
    return this.rows().filter({ has: this.page.locator('td', { hasText: new RegExp(`^${week}$`) }) }).first();
  }

  /**
   * The Transfer cell (3rd column) of a week row. Positional column access — table
   * cells carry no per-column testid.
   * @param week - the 1-based week number
   */
  rowTransfer(week: number): Locator {
    return this.row(week).locator('td').nth(2);
  }

  /**
   * The Running Total cell (4th column) of a week row (positional, see {@link rowTransfer}).
   * @param week - the 1-based week number
   */
  rowRunningTotal(week: number): Locator {
    return this.row(week).locator('td').nth(3);
  }

  /**
   * The Done checkbox in a week row, matched by its stable aria-label.
   * @param week - the 1-based week number
   * @param dateLabel - the row's Friday date label
   */
  rowCheckbox(week: number, dateLabel: string): Locator {
    return this.page.getByRole('checkbox', { name: `Mark week ${week} (${dateLabel}) as saved` });
  }

  /**
   * The "saved" badge on a completed week row.
   * @param week - the 1-based week number
   */
  rowSavedBadge(week: number): Locator {
    return this.row(week).locator('.pill.ok');
  }

  /** The schedule table's column headers. */
  columnHeaders(): Locator {
    return this.scheduleTable().locator('thead th');
  }

  // ── Error surfaces ──

  /** The inline save-error message. */
  saveError(): Locator {
    return this.page.getByTestId('maya-field-error');
  }

  /** The load-failure banner. */
  loadErrorBanner(): Locator {
    return this.page.locator('p').filter({ hasText: 'Could not load your Maya savings' });
  }
}
