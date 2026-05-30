import { test, expect } from '@playwright/test';
import { SettingsPage } from './pages/SettingsPage';
import { NavBar } from './pages/NavBar';

test.describe('Settings page', () => {
  let settings!: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settings = new SettingsPage(page);
    await settings.goto();
  });

  test('page heading shows "Settings"', async () => {
    await expect(settings.heading()).toBeVisible();
    await expect(settings.heading()).toHaveText('Settings');
  });

  test('Theme Color section heading is visible', async () => {
    await expect(settings.themeColorHeading()).toBeVisible();
  });

  test('all six color swatches are visible', async () => {
    for (const label of ['Default', 'Yellow', 'Green', 'Red', 'Orange', 'Violet']) {
      await expect(settings.colorSwatch(label)).toBeVisible();
    }
  });

  test('Default swatch is active on first visit', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('accent'));
    await settings.goto();
    await expect(settings.colorSwatch('Default')).toHaveAttribute('aria-pressed', 'true');
  });

  test('light mode note is visible', async () => {
    await expect(settings.lightModeNote()).toBeVisible();
  });

  test('dark mode banner is not shown in light mode', async () => {
    await expect(settings.darkModeBanner()).toHaveCount(0);
  });

  test('clicking a color swatch marks it as active', async ({ page }) => {
    await settings.colorSwatch('Green').click();
    await expect(settings.colorSwatch('Green')).toHaveAttribute('aria-pressed', 'true');
    await expect(settings.colorSwatch('Default')).toHaveAttribute('aria-pressed', 'false');
    // clean up
    await page.evaluate(() => localStorage.removeItem('accent'));
    await page.evaluate(() => document.documentElement.removeAttribute('data-accent'));
  });

  test('dark mode shows warning banner instead of note', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await settings.goto();
    await expect(settings.darkModeBanner()).toBeVisible();
    // clean up
    await page.evaluate(() => {
      localStorage.removeItem('theme');
      document.documentElement.removeAttribute('data-theme');
    });
  });
});

test.describe('Settings — past expense editing toggle', () => {
  let settings!: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settings = new SettingsPage(page);
    await settings.goto();
    // Clear after first navigation (page has a valid origin), then reload for clean state
    await page.evaluate(() => localStorage.removeItem('allow-past-edit'));
    await settings.goto();
  });

  test('Expense Editing section is visible', async () => {
    await expect(settings.page.getByRole('heading', { name: 'Expense Editing' })).toBeVisible();
  });

  test('toggle is visible and unchecked by default', async () => {
    await expect(settings.pastEditToggle()).toBeVisible();
    await expect(settings.pastEditToggle()).not.toBeChecked();
  });

  test('enabled note is hidden when toggle is off', async () => {
    await expect(settings.pastEditEnabledNote()).toHaveCount(0);
  });

  test('checking the toggle shows the enabled note', async () => {
    await settings.pastEditToggle().check();
    await expect(settings.pastEditToggle()).toBeChecked();
    await expect(settings.pastEditEnabledNote()).toBeVisible();
  });

  test('toggle persists across page reload', async () => {
    await settings.pastEditToggle().check();
    await settings.goto();
    await expect(settings.pastEditToggle()).toBeChecked();
  });

  test('unchecking the toggle hides the enabled note', async () => {
    await settings.pastEditToggle().check();
    await settings.pastEditToggle().uncheck();
    await expect(settings.pastEditEnabledNote()).toHaveCount(0);
  });
});

test.describe('Settings — sidebar gear icon (desktop)', () => {
  test('settings gear icon is visible in sidebar', async ({ page }) => {
    const nav = new NavBar(page);
    await page.goto('/');
    await expect(nav.settingsLink()).toBeVisible();
  });

  test('settings gear icon navigates to /settings', async ({ page }) => {
    const nav = new NavBar(page);
    await page.goto('/');
    await nav.settingsLink().click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test('settings link is active when on /settings', async ({ page }) => {
    await page.goto('/settings');
    const nav = new NavBar(page);
    await expect(nav.settingsLink()).toHaveClass(/active/);
  });

  test('settings gear icon remains visible in collapsed sidebar', async ({ page }) => {
    const nav = new NavBar(page);
    await page.goto('/');
    await nav.collapseButton().click();
    await expect(nav.settingsLink()).toBeVisible();
  });
});

test.describe('Settings — sidebar gear icon (mobile)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('settings gear icon is visible in mobile top bar', async ({ page }) => {
    const nav = new NavBar(page);
    await page.goto('/');
    await expect(nav.settingsLink()).toBeVisible();
  });

  test('clicking settings gear on mobile navigates to /settings', async ({ page }) => {
    const nav = new NavBar(page);
    await page.goto('/');
    await nav.settingsLink().click();
    await expect(page).toHaveURL(/\/settings/);
  });
});
