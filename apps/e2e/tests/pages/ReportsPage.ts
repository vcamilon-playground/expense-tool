import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/** Page object for the `/reports` page: the collapsible Report Options panel, stats, By-Category table, and period comparison. */
export class ReportsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Navigate to the reports page and wait for the initial load to settle. */
  async goto(): Promise<void> {
    await this.page.goto('/reports');
    await this.waitForLoad();
  }

  /** The `<h1>` "Reports" page heading. */
  heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: 'Reports' });
  }

  /** The collapsible "Report Options" panel header. */
  optionsHeader(): Locator {
    return this.page.locator('.collapse-header').filter({ hasText: 'Report Options' });
  }

  /**
   * Expand the Report Options panel if collapsed (it is collapsed by default),
   * so the period/date/compare inputs are interactable.
   */
  async expandOptions(): Promise<void> {
    if (!(await this.presetPeriodButton().isVisible())) {
      await this.optionsHeader().click();
      await this.presetPeriodButton().waitFor({ state: 'visible' });
    }
  }

  /** The Period `<select>`. */
  periodSelect(): Locator {
    return this.page.locator('label').filter({ hasText: 'Period' }).locator('select');
  }

  /** The "Preset Period" mode button. */
  presetPeriodButton(): Locator {
    return this.page.getByRole('button', { name: 'Preset Period' });
  }

  /** The "Date Range" mode button. */
  dateRangeButton(): Locator {
    return this.page.getByRole('button', { name: 'Date Range' });
  }

  /** The Reference Date input (preset mode). */
  dateInput(): Locator {
    return this.page.locator('label').filter({ hasText: 'Reference Date' }).locator('input[type="date"]');
  }

  /** The custom "From" date input (date-range mode). */
  customFromInput(): Locator {
    return this.page.locator('label').filter({ hasText: 'From' }).locator('input[type="date"]');
  }

  /** The custom "To" date input (date-range mode). */
  customToInput(): Locator {
    return this.page.locator('label').filter({ hasText: 'To' }).locator('input[type="date"]');
  }

  /**
   * A stat tile's label by text.
   * @param text - the label text
   */
  statLabel(text: string): Locator {
    return this.page.locator('.stat .label').filter({ hasText: text });
  }

  /** The `<h2>` "By Category" section heading. */
  byCategoryHeading(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'By Category' });
  }

  /** The "Showing …" date-range summary text. */
  dateRangeText(): Locator {
    return this.page.getByText(/Showing/);
  }

  /** The "compare periods" checkbox. */
  compareCheckbox(): Locator {
    return this.page.locator('input[type="checkbox"]');
  }

  /** The `<h2>` "Period Comparison" heading. */
  comparisonHeading(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Period Comparison' });
  }

  /**
   * Select a report period by value.
   * @param value - the period option value
   */
  async selectPeriod(value: string): Promise<void> {
    await this.periodSelect().selectOption(value);
  }

  /** The By-Category table. */
  byCategoryTable(): Locator {
    return this.page.locator('.card').filter({ hasText: 'By Category' }).locator('table');
  }

  /**
   * A sortable header in the By-Category table, matched by name.
   * @param name - the column name
   */
  sortableHeader(name: string): Locator {
    return this.byCategoryTable().locator('th.sortable').filter({ hasText: new RegExp(name, 'i') });
  }

  /** The active-sort indicator in the By-Category table. */
  activeSortIcon(): Locator {
    return this.byCategoryTable().locator('th.sortable .sort-active');
  }
}
