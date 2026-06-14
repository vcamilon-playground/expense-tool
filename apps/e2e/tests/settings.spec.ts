import { test, expect } from '@playwright/test';
import { SettingsPage } from './pages/SettingsPage';
import { NavBar } from './pages/NavBar';
import { cleanup } from './helpers/supabase';

test.describe('Settings — Session Expiry section', () => {
  let settings!: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settings = new SettingsPage(page);
    await settings.goto();
    await page.evaluate(() => localStorage.removeItem('session-timeout'));
    await settings.goto();
  });

  test('all timeout options are present and Never is selected by default', async () => {
    await expect(settings.sessionExpiryHeading()).toBeVisible();
    await expect(settings.sessionTimeoutRadio('never')).toBeVisible();
    await expect(settings.sessionTimeoutRadio('30')).toBeVisible();
    await expect(settings.sessionTimeoutRadio('60')).toBeVisible();
    await expect(settings.sessionTimeoutRadio('120')).toBeVisible();
    await expect(settings.sessionTimeoutRadio('never')).toBeChecked();
    await expect(settings.sessionTimeoutRadio('30')).not.toBeChecked();
    await expect(settings.sessionTimeoutRadio('60')).not.toBeChecked();
    await expect(settings.sessionTimeoutRadio('120')).not.toBeChecked();
  });

  test('selecting an option checks it and switching back to Never unchecks it', async ({ page }) => {
    await settings.sessionTimeoutRadio('60').check();
    await expect(settings.sessionTimeoutRadio('60')).toBeChecked();
    await expect(settings.sessionTimeoutRadio('never')).not.toBeChecked();

    await settings.sessionTimeoutRadio('never').check();
    await expect(settings.sessionTimeoutRadio('never')).toBeChecked();
    await expect(settings.sessionTimeoutRadio('60')).not.toBeChecked();
    await page.evaluate(() => localStorage.removeItem('session-timeout'));
  });

  test('selected timeout persists across page reload after saving', async () => {
    await settings.sessionTimeoutRadio('30').check();
    await settings.saveChangesButton().click();
    await expect(settings.unsavedBar()).not.toBeVisible();
    await settings.goto();
    await expect(settings.sessionTimeoutRadio('30')).toBeChecked();
    await settings.sessionTimeoutRadio('never').check();
    await settings.saveChangesButton().click();
  });
});

test.describe('Settings — global save / cancel', () => {
  let settings!: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settings = new SettingsPage(page);
    await settings.goto();
    await expect(settings.unsavedBar()).not.toBeVisible();
  });

  test('editing first name shows the unsaved changes bar', async () => {
    await settings.firstNameInput().fill('Changed');
    await expect(settings.unsavedBar()).toBeVisible();
    await expect(settings.saveChangesButton()).toBeVisible();
    await expect(settings.cancelChangesButton()).toBeVisible();
  });

  test('Cancel reverts the first name to its original value', async () => {
    const original = await settings.firstNameInput().inputValue();
    await settings.firstNameInput().fill('Changed');
    await settings.cancelChangesButton().click();
    await expect(settings.unsavedBar()).not.toBeVisible();
    await expect(settings.firstNameInput()).toHaveValue(original);
  });

  test('changing session timeout or theme color shows the unsaved bar', async () => {
    await settings.sessionTimeoutRadio('30').check();
    await expect(settings.unsavedBar()).toBeVisible();
    await settings.cancelChangesButton().click();
    await expect(settings.sessionTimeoutRadio('never')).toBeChecked();

    await settings.colorSwatch('Green').click();
    await expect(settings.unsavedBar()).toBeVisible();
    await settings.cancelChangesButton().click();
  });
});

test.describe('Settings — navigation guard', () => {
  let settings!: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settings = new SettingsPage(page);
    await settings.goto();
  });

  test('navigating away with unsaved changes shows the guard modal', async ({ page }) => {
    await settings.firstNameInput().fill('Changed');
    await page.locator('nav.sidenav').getByRole('link', { name: 'Expenses', exact: true }).click();
    await expect(settings.navGuardModal()).toBeVisible();
  });

  test('"Stay on page" closes modal and keeps user on settings with changes intact', async ({ page }) => {
    await settings.firstNameInput().fill('Changed');
    await page.locator('nav.sidenav').getByRole('link', { name: 'Expenses', exact: true }).click();
    await settings.navGuardStayButton().click();
    await expect(settings.navGuardModal()).not.toBeVisible();
    await expect(page).toHaveURL(/\/settings/);
    await expect(settings.unsavedBar()).toBeVisible();
    await settings.goto();
    await expect(settings.firstNameInput()).toHaveValue('E2E');
  });

  test('"Leave without saving" navigates away and discards changes', async ({ page }) => {
    await settings.firstNameInput().fill('Changed');
    await page.locator('nav.sidenav').getByRole('link', { name: 'Expenses', exact: true }).click();
    await settings.navGuardLeaveButton().click();
    await expect(page).toHaveURL(/\/expenses/);
  });
});

test.describe('Settings — Change Password section', () => {
  let settings!: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settings = new SettingsPage(page);
    await settings.goto();
  });

  test('submitting with wrong current password shows error', async ({ page }) => {
    const pwCard = page.locator('.card').filter({ hasText: 'Change Password' });
    await pwCard.locator('input[type="password"]').nth(0).fill('wrongpassword');
    await pwCard.locator('input[type="password"]').nth(1).fill('newpassword123');
    await pwCard.locator('input[type="password"]').nth(2).fill('newpassword123');
    await settings.updatePasswordButton().click();
    await expect(pwCard.locator('[role="alert"]')).toBeVisible();
  });
});

test.describe('Settings page', () => {
  let settings!: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settings = new SettingsPage(page);
    await settings.goto();
  });

  test('all profile-page sections render (profile, theme, categories, change password)', async () => {
    // Profile
    await expect(settings.heading()).toHaveText('Settings');
    await expect(settings.profileHeading()).toBeVisible();
    await expect(settings.firstNameInput()).toHaveValue('E2E');
    await expect(settings.lastNameInput()).toHaveValue('Tester');
    // Theme
    await expect(settings.themeColorHeading()).toBeVisible();
    for (const label of ['Default', 'Yellow', 'Green', 'Red', 'Orange', 'Violet']) {
      await expect(settings.colorSwatch(label)).toBeVisible();
    }
    await expect(settings.lightModeNote()).toBeVisible();
    await expect(settings.darkModeBanner()).toHaveCount(0);
    // Categories
    await expect(settings.categoriesHeading()).toBeVisible();
    await expect(settings.addCategoryButton()).toBeVisible();
    await expect(settings.addCategoryNameInput()).toBeVisible();
    await expect(settings.addCategoryIconInput()).toBeVisible();
    await expect(settings.categoryRow('Groceries')).toBeVisible();
    await expect(settings.categoryRow('Dining')).toBeVisible();
    await expect(settings.categoryDeleteButton('Groceries')).toBeVisible();
    // Change Password
    await expect(settings.changePasswordHeading()).toBeVisible();
    await expect(settings.updatePasswordButton()).toBeVisible();
  });

  test('Default swatch is active on first visit', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('accent'));
    await settings.goto();
    await expect(settings.colorSwatch('Default')).toHaveAttribute('aria-pressed', 'true');
  });

  test('clicking a color swatch marks it as active', async ({ page }) => {
    await settings.colorSwatch('Green').click();
    await expect(settings.colorSwatch('Green')).toHaveAttribute('aria-pressed', 'true');
    await expect(settings.colorSwatch('Default')).toHaveAttribute('aria-pressed', 'false');
    await page.evaluate(() => localStorage.removeItem('accent'));
    await page.evaluate(() => document.documentElement.removeAttribute('data-accent'));
  });

  test('dark mode shows warning banner instead of note', async ({ page }) => {
    // The settings page detects dark mode via a MutationObserver on
    // data-theme. Toggle it after the page has loaded (auth resolves and
    // applies the DB theme on navigation, so a reload would override it).
    await settings.goto();
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await expect(settings.darkModeBanner()).toBeVisible();
    await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
  });
});

test.describe('Settings — Categories section', () => {
  let settings!: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settings = new SettingsPage(page);
    await settings.goto();
  });

  test('submitting with empty name keeps the list unchanged', async () => {
    await expect(settings.categoryRow('Groceries')).toBeVisible();
    const before = await settings.page.locator('.card').filter({ hasText: 'Categories' }).locator('.cat-chip').count();
    await settings.addCategoryButton().click();
    const after = await settings.page.locator('.card').filter({ hasText: 'Categories' }).locator('.cat-chip').count();
    expect(after).toBe(before);
  });
});

test.describe('Settings — past expense editing toggle', () => {
  let settings!: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settings = new SettingsPage(page);
    await settings.goto();
    await page.evaluate(() => localStorage.removeItem('allow-past-edit'));
    await settings.goto();
  });

  test('expense editing section renders with toggle off and note hidden', async () => {
    await expect(settings.page.getByRole('heading', { name: 'Expense Editing' })).toBeVisible();
    await expect(settings.pastEditToggle()).toBeVisible();
    await expect(settings.pastEditToggle()).not.toBeChecked();
    await expect(settings.pastEditEnabledNote()).toHaveCount(0);
  });

  test('checking the toggle shows the enabled note and unchecking hides it', async () => {
    await settings.pastEditToggle().check();
    await expect(settings.pastEditToggle()).toBeChecked();
    await expect(settings.pastEditEnabledNote()).toBeVisible();

    await settings.pastEditToggle().uncheck();
    await expect(settings.pastEditEnabledNote()).toHaveCount(0);
  });

  test('toggle persists across page reload after saving', async () => {
    await settings.pastEditToggle().check();
    await settings.saveChangesButton().click();
    await expect(settings.unsavedBar()).not.toBeVisible();
    await settings.goto();
    await expect(settings.pastEditToggle()).toBeChecked();
    await settings.pastEditToggle().uncheck();
    await settings.saveChangesButton().click();
  });
});

test.describe('Settings — access (desktop)', () => {
  test('profile card is visible and the sidebar Settings link navigates to /settings', async ({ page }) => {
    const nav = new NavBar(page);
    await page.goto('/');
    await expect(nav.profileCard()).toBeVisible();
    await expect(nav.userName()).toBeVisible();
    await nav.link('Settings').click();
    await expect(page).toHaveURL(/\/settings/);
  });
});

test.describe('Settings — access (mobile)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('header avatar opens the profile popup and Settings navigates to /settings', async ({ page }) => {
    const nav = new NavBar(page);
    await page.goto('/');
    await expect(nav.headerAvatar()).toBeVisible();
    await nav.openMobileProfileMenu();
    await expect(nav.settingsMenuItem()).toBeVisible();
    await nav.settingsMenuItem().click();
    await expect(page).toHaveURL(/\/settings/);
  });
});
