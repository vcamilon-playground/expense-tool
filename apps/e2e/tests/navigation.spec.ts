import { test, expect } from '@playwright/test';
import { NavBar } from './pages/NavBar';

test.describe('Navigation — desktop sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav.sidenav')).toBeVisible();
  });

  test('nav links navigate to correct pages', async ({ page }) => {
    const nav = new NavBar(page);
    const links: Array<[string, string]> = [
      ['Income', '/income'],
      ['Expenses', '/expenses'],
      ['Recurring', '/recurring'],
      ['Budgets', '/budgets'],
      ['Reports', '/reports'],
      ['Settings', '/settings'],
      ['Home', '/'],
    ];
    for (const [label, href] of links) {
      await nav.link(label).click();
      await expect(page).toHaveURL(href);
    }
  });

  test('active nav link is highlighted on the current page', async ({ page }) => {
    const nav = new NavBar(page);
    for (const [path, label] of [['/expenses', 'Expenses'], ['/reports', 'Reports']] as const) {
      await page.goto(path);
      await expect(nav.nav()).toBeVisible();
      await expect(nav.link(label)).toHaveClass(/active/);
    }
  });

  test('profile card shows the user name and handle', async ({ page }) => {
    const nav = new NavBar(page);
    await expect(nav.profileCard()).toBeVisible();
    await expect(nav.userName()).toBeVisible();
    await expect(nav.userHandle()).toBeVisible();
  });

  test('footer is visible on all pages', async ({ page }) => {
    const nav = new NavBar(page);
    await expect(nav.footer()).toBeVisible();
    await expect(nav.footer()).toContainText('Vegil Camilon');
  });
});

test.describe('Navigation — logout / switch-user (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav.sidenav')).toBeVisible();
  });

  test('sidebar Log Out button opens confirmation modal', async ({ page }) => {
    const nav = new NavBar(page);
    await nav.sidebarLogoutButton().click();
    await expect(nav.logoutModal()).toBeVisible();
    await expect(nav.logoutModal()).toContainText('Log out?');
  });

  test('sidebar Switch User button opens confirmation modal', async ({ page }) => {
    const nav = new NavBar(page);
    await nav.sidebarSwitchUserButton().click();
    await expect(nav.switchUserModal()).toBeVisible();
    await expect(nav.switchUserModal()).toContainText('Switch user?');
  });

  test('logout and switch-user modals close via Cancel and backdrop without acting', async ({ page }) => {
    const nav = new NavBar(page);

    // Logout modal — Cancel does not log out.
    await nav.sidebarLogoutButton().click();
    await expect(nav.logoutModal()).toBeVisible();
    await nav.logoutModal().getByRole('button', { name: /cancel/i }).click();
    await expect(nav.logoutModal()).not.toBeVisible();
    await expect(page).not.toHaveURL('/login');

    // Logout modal — backdrop click closes it.
    await nav.sidebarLogoutButton().click();
    await expect(nav.logoutModal()).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(nav.logoutModal()).not.toBeVisible();

    // Switch-user modal — Cancel closes it.
    await nav.sidebarSwitchUserButton().click();
    await expect(nav.switchUserModal()).toBeVisible();
    await nav.switchUserModal().getByRole('button', { name: /cancel/i }).click();
    await expect(nav.switchUserModal()).not.toBeVisible();
  });
});

test.describe('Navigation — mobile bottom tab bar', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav.bottom-nav')).toBeVisible();
  });

  test('sidebar is hidden and the bottom tab bar is shown on mobile', async ({ page }) => {
    const nav = new NavBar(page);
    await expect(nav.nav()).not.toBeVisible();
    await expect(nav.bottomNav()).toBeVisible();
  });

  test('bottom tabs navigate to correct pages', async ({ page }) => {
    const nav = new NavBar(page);
    const tabs: Array<[string, string]> = [
      ['Income', '/income'],
      ['Expenses', '/expenses'],
      ['Budgets', '/budgets'],
      ['Recurring', '/recurring'],
      ['Reports', '/reports'],
      ['Home', '/'],
    ];
    for (const [label, href] of tabs) {
      await nav.bottomTab(label).click();
      await expect(page).toHaveURL(href);
    }
  });

  test('active bottom tab is highlighted on expenses page', async ({ page }) => {
    const nav = new NavBar(page);
    await page.goto('/expenses');
    await expect(nav.bottomNav()).toBeVisible();
    await expect(nav.bottomTab('Expenses')).toHaveClass(/active/);
  });

  test('header avatar opens the profile popup with Settings, Switch User, Log Out', async ({ page }) => {
    const nav = new NavBar(page);
    await nav.openMobileProfileMenu();
    await expect(nav.settingsMenuItem()).toBeVisible();
    await expect(nav.switchUserMenuItem()).toBeVisible();
    await expect(nav.logoutMenuItem()).toBeVisible();
  });

  test('Log Out from the profile popup opens the confirmation modal', async ({ page }) => {
    const nav = new NavBar(page);
    await nav.openMobileProfileMenu();
    await nav.logoutMenuItem().click();
    await expect(nav.logoutModal()).toBeVisible();
    await expect(nav.logoutModal()).toContainText('Log out?');
  });
});
