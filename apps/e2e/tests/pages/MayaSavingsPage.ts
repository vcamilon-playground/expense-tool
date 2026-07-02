import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

// localStorage key holding the JSON array of completed week numbers.
// Mirrors LS_DONE_KEY in apps/web/src/lib/maya-savings.ts.
export const LS_DONE_KEY = 'maya-savings-done';

// Page object for the Maya Weekly Savings tracker (/income/maya): a deterministic
// ₱100-per-week Friday savings plan whose only stateful part (which weeks are
// "done") lives in localStorage — no DB, no network. Tests control the done-state
// via seedDoneWeeks() (an addInitScript before navigation) to stay date-robust.
export class MayaSavingsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Prime localStorage BEFORE the app boots so the page reads a known done-state
  // (rather than the time-relative first-visit seed). Pass a raw string to
  // simulate corrupt / non-array values.
  async seedDoneWeeks(value: number[] | string): Promise<void> {
    const raw = typeof value === 'string' ? value : JSON.stringify(value);
    await this.page.addInitScript(
      ([key, stored]) => {
        window.localStorage.setItem(key, stored);
      },
      [LS_DONE_KEY, raw] as const,
    );
  }

  async goto(): Promise<void> {
    await this.page.goto('/income/maya');
    await this.waitForLoad();
  }

  // Read the current localStorage array back out (parsed) for assertions.
  async storedDoneWeeks(): Promise<unknown> {
    const raw = await this.page.evaluate((key) => window.localStorage.getItem(key), LS_DONE_KEY);
    return raw === null ? null : JSON.parse(raw);
  }

  heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: '💜 Maya Weekly Savings' });
  }

  backLink(): Locator {
    return this.page.getByRole('link', { name: /Back to Income/ });
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
}
