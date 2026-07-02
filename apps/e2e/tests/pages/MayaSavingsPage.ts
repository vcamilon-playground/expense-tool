import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

// Page object for the Maya Weekly Savings tracker (/income/maya): a deterministic
// ₱100-per-week Friday savings plan. The stateful part (which weeks are "done")
// is persisted per-user in the Supabase `maya_savings` table (done_weeks int[]) —
// no localStorage. Tests control the done-state by writing the DB row directly
// (helpers/supabase.ts `maya.set`/`maya.reset`) BEFORE navigating, so assertions
// stay date-robust, then read it back to confirm what the UI persisted.
export class MayaSavingsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/income/maya');
    await this.waitForLoad();
  }

  heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: '💜 Maya Weekly Savings' });
  }

  backLink(): Locator {
    return this.page.getByRole('link', { name: /Back to Income/ });
  }

  // The Income-page ghost link into the tracker (renamed to "💜 Maya Savings").
  incomeLink(): Locator {
    return this.page.getByRole('link', { name: /Maya Savings/ });
  }

  // ── Summary stat cards ──
  summaryCard(label: string): Locator {
    return this.page.locator('.stat.card').filter({ hasText: label });
  }

  summaryValue(label: string): Locator {
    return this.summaryCard(label).locator('.value');
  }

  // ── Progress bar ──
  progressPercent(): Locator {
    // The "N%" label to the right of "Progress to goal".
    return this.page.locator('.card').filter({ hasText: 'Progress to goal' }).locator('span').last();
  }

  // ── "This Friday" card ──
  thisFridayCard(): Locator {
    return this.page.locator('.card').filter({ hasText: 'This Friday · Week' });
  }

  thisFridayButton(): Locator {
    return this.thisFridayCard().getByRole('button');
  }

  // ── Weekly schedule table ──
  scheduleTable(): Locator {
    return this.page.locator('table.income-table');
  }

  rows(): Locator {
    return this.scheduleTable().locator('tbody tr');
  }

  // A schedule row by its 1-based week number (first cell).
  row(week: number): Locator {
    return this.rows().filter({ has: this.page.locator('td', { hasText: new RegExp(`^${week}$`) }) }).first();
  }

  rowTransfer(week: number): Locator {
    return this.row(week).locator('td').nth(2);
  }

  rowRunningTotal(week: number): Locator {
    return this.row(week).locator('td').nth(3);
  }

  // The Done checkbox in a schedule row, matched by its stable aria-label.
  rowCheckbox(week: number, dateLabel: string): Locator {
    return this.page.getByRole('checkbox', { name: `Mark week ${week} (${dateLabel}) as saved` });
  }

  rowSavedBadge(week: number): Locator {
    return this.row(week).locator('.pill.ok');
  }

  columnHeaders(): Locator {
    return this.scheduleTable().locator('thead th');
  }

  // ── Error surfaces ──
  saveError(): Locator {
    return this.page.locator('.field-error');
  }

  loadErrorBanner(): Locator {
    return this.page.locator('p').filter({ hasText: 'Could not load your Maya savings' });
  }
}
