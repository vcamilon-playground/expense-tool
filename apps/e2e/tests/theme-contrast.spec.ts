import { test, expect, Locator, Page } from '@playwright/test';
import { NavBar } from './pages/NavBar';
import { ExpensesPage } from './pages/ExpensesPage';
import { DashboardPage } from './pages/DashboardPage';
import { BudgetsPage } from './pages/BudgetsPage';

/**
 * Coverage for the two light-theme accessibility CSS fixes in globals.css:
 *  - `--muted` raised from #6b7a99 (rgb 107,122,153) to #5a6b8f (rgb 90,107,143)
 *    so secondary text clears WCAG AA on the light bg.
 *  - `button.primary:hover:not(:disabled)` now paints the accent background with
 *    white text (previously it went white-on-grey via the generic button:hover).
 *
 * These are computed-style assertions — `toBeVisible()` cannot catch a
 * fg/bg colour regression (see TEST_AUTOMATION_STANDARDS.md §9), so every
 * check reads `getComputedStyle` through `evaluate`.
 */

const LIGHT_MUTED = 'rgb(90, 107, 143)';
const OLD_LIGHT_MUTED = 'rgb(107, 122, 153)';
const DARK_MUTED = 'rgb(138, 150, 173)';
const WHITE = 'rgb(255, 255, 255)';

/** Read a resolved CSS property off an element. */
function computed(locator: Locator, property: string): Promise<string> {
  return locator.evaluate((el, prop) => window.getComputedStyle(el).getPropertyValue(prop), property);
}

/**
 * Hover the button and report whether its background fell back to the theme's
 * `--border` grey — i.e. the pre-fix `button:hover { background: var(--border) }`
 * behaviour. Both colours are read inside a single `getComputedStyle` pass (with a
 * throwaway probe resolving `--border` to rgb), so the check is race-free and
 * theme/accent-independent: post-fix the background is `var(--accent)` (≠ border),
 * pre-fix it equals the border grey. The `.primary:hover` fix is theme-agnostic, so
 * the same helper proves it in both light and dark.
 */
async function hoverBackgroundIsBorderGrey(button: Locator): Promise<boolean> {
  await button.hover();
  return button.evaluate((el) => {
    const bg = window.getComputedStyle(el).backgroundColor;
    const probe = document.createElement('span');
    probe.style.color = 'var(--border)';
    el.appendChild(probe);
    const border = window.getComputedStyle(probe).color;
    probe.remove();
    return bg === border;
  });
}

/** The root `<html>` element (carries the `data-theme` attribute). */
function rootHtml(page: Page): Locator {
  return page.locator('html');
}

/** The site header bar — the background behind the muted `.site-date` text. */
function siteHeader(page: Page): Locator {
  return page.locator('.site-header');
}

/**
 * Force the default (light) theme for this page, independent of the E2E account's saved
 * preference. `AuthContext.applyUserPreferences` sets `data-theme` from the DB user's
 * `theme` once on load, so clearing it afterwards sticks — these theme tests must control
 * the theme themselves rather than inherit whatever the shared account was last left on.
 */
async function forceLightTheme(page: Page): Promise<void> {
  await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
  await expect(rootHtml(page)).not.toHaveAttribute('data-theme', 'dark');
}

/** Parse an `rgb(r, g, b)` string into a numeric tuple. */
function parseRgb(value: string): [number, number, number] {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) throw new Error(`Not an rgb() colour: ${value}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** WCAG relative luminance of an rgb() string. */
function relativeLuminance(value: string): number {
  const channels = parseRgb(value).map((raw) => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** WCAG contrast ratio between two rgb() strings. */
function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Read a `.card > h2`'s own colour and the live-resolved `var(--accent)` in a
 * single getComputedStyle pass (via a throwaway probe span), so the comparison
 * is race-free and independent of the E2E account's saved accent.
 */
async function headingColourAndAccent(locator: Locator): Promise<{ color: string; accent: string }> {
  return locator.evaluate((el) => {
    const color = window.getComputedStyle(el).color;
    const probe = document.createElement('span');
    probe.style.color = 'var(--accent)';
    el.appendChild(probe);
    const accent = window.getComputedStyle(probe).color;
    probe.remove();
    return { color, accent };
  });
}

test.describe('Theme contrast — accent card section headings', () => {
  test('dashboard "Budget Status" card heading is painted with the accent colour', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    const heading = dashboard.cardSectionHeading('Budget Status');
    await expect(heading).toBeVisible();
    const { color, accent } = await headingColourAndAccent(heading);
    expect(color, 'card > h2 colour should equal var(--accent)').toBe(accent);
  });

  test('budgets "Current Budgets" card heading is painted with the accent colour', async ({ page }) => {
    const budgets = new BudgetsPage(page);
    await budgets.goto();
    const heading = budgets.cardSectionHeading('Current Budgets');
    await expect(heading).toBeVisible();
    const { color, accent } = await headingColourAndAccent(heading);
    expect(color, 'card > h2 colour should equal var(--accent)').toBe(accent);
  });
});

test.describe('Theme contrast — light muted secondary text', () => {
  let nav!: NavBar;

  test.beforeEach(async ({ page }) => {
    nav = new NavBar(page);
    await page.goto('/');
    await expect(nav.nav()).toBeVisible();
    await forceLightTheme(page);
  });

  test('site-date muted text uses the raised --muted colour, not the old value', async () => {
    await expect(nav.dateLine()).toBeVisible();
    const color = await computed(nav.dateLine(), 'color');
    expect(color, 'light --muted should be the raised token').toBe(LIGHT_MUTED);
    expect(color, 'light --muted must not be the pre-fix value').not.toBe(OLD_LIGHT_MUTED);
  });

  test('muted secondary text clears WCAG AA (>= 4.5:1) against the page background', async ({ page }) => {
    const color = await computed(nav.dateLine(), 'color');
    const background = await computed(siteHeader(page), 'background-color');
    const ratio = contrastRatio(color, background);
    expect(ratio, `contrast of ${color} on ${background} should meet AA`).toBeGreaterThanOrEqual(4.5);
  });
});

test.describe('Theme contrast — primary button hover (light)', () => {
  let expenses!: ExpensesPage;

  test.beforeEach(async ({ page }) => {
    expenses = new ExpensesPage(page);
    await expenses.goto();
    await forceLightTheme(page);
  });

  test('hovered "+ Add Expense" primary button keeps an accent background, not the grey border', async () => {
    await expect(expenses.addButton()).toBeVisible();
    expect(
      await hoverBackgroundIsBorderGrey(expenses.addButton()),
      'hovered primary must not fall back to the --border grey (the pre-fix white-on-grey bug)',
    ).toBe(false);
  });

  test('hovered "+ Add Expense" primary button keeps white text', async () => {
    await expenses.addButton().hover();
    const color = await computed(expenses.addButton(), 'color');
    expect(color, 'hovered primary text should stay white').toBe(WHITE);
  });
});

test.describe('Theme contrast — dark theme has no regression', () => {
  let expenses!: ExpensesPage;
  let nav!: NavBar;

  test.beforeEach(async ({ page }) => {
    expenses = new ExpensesPage(page);
    nav = new NavBar(page);
    await expenses.goto();
    // Force dark just for these reads, then clear it in afterEach. Every assertion
    // below reads the colours it compares within a single getComputedStyle pass, so a
    // transient accent cascade can't cause a cross-read mismatch — no need to persist
    // the preference via the pill (which would leak onto the shared E2E user).
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await expect(rootHtml(page)).toHaveAttribute('data-theme', 'dark');
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
  });

  test('dark muted text keeps its unchanged colour', async () => {
    const color = await computed(nav.dateLine(), 'color');
    expect(color, 'dark --muted should be unchanged').toBe(DARK_MUTED);
  });

  test('hovered primary button keeps an accent background, not the border grey, with white text', async () => {
    await expect(expenses.addButton()).toBeVisible();
    expect(
      await hoverBackgroundIsBorderGrey(expenses.addButton()),
      'dark hovered primary must not fall back to the --border grey',
    ).toBe(false);
    const color = await computed(expenses.addButton(), 'color');
    expect(color, 'dark hovered primary text should stay white').toBe(WHITE);
  });
});
