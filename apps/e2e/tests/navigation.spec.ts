import { test, expect } from '@playwright/test';
import { NavBar } from './pages/NavBar';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav.sidenav')).toBeVisible();
  });

  test('brand link navigates to dashboard', async ({ page }) => {
    const nav = new NavBar(page);
    await page.goto('/expenses');
    await expect(nav.nav()).toBeVisible();
    await nav.brandLink().click();
    await expect(page).toHaveURL('/');
  });

  test('nav links navigate to correct pages', async ({ page }) => {
    const nav = new NavBar(page);
    const links: Array<[string, string]> = [
      ['Expenses', '/expenses'],
      ['Reports', '/reports'],
      ['Budgets', '/budgets'],
      ['Recurring', '/recurring'],
    ];
    for (const [label, href] of links) {
      await nav.clickLink(label);
      await expect(page).toHaveURL(href);
    }
  });

  test('active nav link is highlighted on expenses page', async ({ page }) => {
    const nav = new NavBar(page);
    await page.goto('/expenses');
    await expect(nav.nav()).toBeVisible();
    await nav.openIfMobile();
    await expect(nav.link('Expenses')).toHaveClass(/active/);
  });

  test('active nav link is highlighted on reports page', async ({ page }) => {
    const nav = new NavBar(page);
    await page.goto('/reports');
    await expect(nav.nav()).toBeVisible();
    await nav.openIfMobile();
    await expect(nav.link('Reports')).toHaveClass(/active/);
  });

  test('footer is visible on all pages', async ({ page }) => {
    const nav = new NavBar(page);
    await expect(nav.footer()).toBeVisible();
    await expect(nav.footer()).toContainText('Vegil Camilon');
  });

  test('user info block is visible in sidebar', async ({ page }) => {
    const nav = new NavBar(page);
    await expect(nav.userInfo()).toBeVisible();
  });
});

test.describe('Navigation — logout/switch-user modals', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav.sidenav')).toBeVisible();
  });

  test('profile menu opens when avatar is clicked', async ({ page }) => {
    const nav = new NavBar(page);
    await expect(nav.profileMenu()).not.toBeVisible();
    await nav.userInfo().click();
    await expect(nav.profileMenu()).toBeVisible();
  });

  test('profile menu closes when clicking outside', async ({ page }) => {
    const nav = new NavBar(page);
    await nav.userInfo().click();
    await expect(nav.profileMenu()).toBeVisible();
    await page.mouse.click(400, 400);
    await expect(nav.profileMenu()).not.toBeVisible();
  });

  test('profile menu contains Settings, Switch User, Log Out', async ({ page }) => {
    const nav = new NavBar(page);
    await nav.openProfileMenu();
    await expect(nav.settingsMenuItem()).toBeVisible();
    await expect(nav.switchUserButton()).toBeVisible();
    await expect(nav.logoutButton()).toBeVisible();
  });

  test('logout button opens confirmation modal', async ({ page }) => {
    const nav = new NavBar(page);
    await nav.openProfileMenu();
    await nav.logoutButton().click();
    await expect(nav.logoutModal()).toBeVisible();
    await expect(nav.logoutModal()).toContainText('Log out?');
  });

  test('switch user button opens confirmation modal', async ({ page }) => {
    const nav = new NavBar(page);
    await nav.openProfileMenu();
    await nav.switchUserButton().click();
    await expect(nav.switchUserModal()).toBeVisible();
    await expect(nav.switchUserModal()).toContainText('Switch user?');
  });

  test('logout modal cancel button closes it without logging out', async ({ page }) => {
    const nav = new NavBar(page);
    await nav.openProfileMenu();
    await nav.logoutButton().click();
    await expect(nav.logoutModal()).toBeVisible();
    await nav.logoutModal().getByRole('button', { name: /cancel/i }).click();
    await expect(nav.logoutModal()).not.toBeVisible();
    await expect(page).not.toHaveURL('/login');
  });

  test('switch user modal cancel button closes it', async ({ page }) => {
    const nav = new NavBar(page);
    await nav.openProfileMenu();
    await nav.switchUserButton().click();
    await expect(nav.switchUserModal()).toBeVisible();
    await nav.switchUserModal().getByRole('button', { name: /cancel/i }).click();
    await expect(nav.switchUserModal()).not.toBeVisible();
  });

  test('clicking overlay backdrop closes logout modal', async ({ page }) => {
    const nav = new NavBar(page);
    await nav.openProfileMenu();
    await nav.logoutButton().click();
    await expect(nav.logoutModal()).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(nav.logoutModal()).not.toBeVisible();
  });
});

test.describe('Navigation — sidebar collapse', () => {
  test.beforeEach(async ({ page }) => {
    // Reset collapse state so tests start with expanded sidebar
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('sidebar-collapsed'));
    await page.reload();
  });

  test('collapse button is visible on desktop', async ({ page }) => {
    const nav = new NavBar(page);
    await expect(nav.collapseButton()).toBeVisible();
  });

  test('clicking collapse adds collapsed class to sidebar', async ({ page }) => {
    const nav = new NavBar(page);
    await expect(nav.nav()).not.toHaveClass(/collapsed/);
    await nav.collapseButton().click();
    await expect(nav.nav()).toHaveClass(/collapsed/);
  });

  test('nav labels are hidden when collapsed', async ({ page }) => {
    const nav = new NavBar(page);
    await nav.collapseButton().click();
    await expect(nav.navLabel('Dashboard')).not.toBeVisible();
    await expect(nav.navLabel('Expenses')).not.toBeVisible();
  });

  test('expand button restores the sidebar', async ({ page }) => {
    const nav = new NavBar(page);
    await nav.collapseButton().click();
    await expect(nav.nav()).toHaveClass(/collapsed/);
    await nav.expandButton().click();
    await expect(nav.nav()).not.toHaveClass(/collapsed/);
    await expect(nav.navLabel('Dashboard')).toBeVisible();
  });

  test('nav links still navigate in collapsed mode', async ({ page }) => {
    const nav = new NavBar(page);
    await nav.collapseButton().click();
    await nav.link('Expenses').click();
    await expect(page).toHaveURL('/expenses');
  });

  test('brand text is visible when expanded', async ({ page }) => {
    const nav = new NavBar(page);
    await expect(nav.brandText()).toBeVisible();
  });

  test('brand text is hidden when collapsed', async ({ page }) => {
    const nav = new NavBar(page);
    await nav.collapseButton().click();
    await expect(nav.brandText()).not.toBeVisible();
  });

  test('collapse state persists across page navigations', async ({ page }) => {
    const nav = new NavBar(page);
    await nav.collapseButton().click();
    await page.goto('/expenses');
    await expect(nav.nav()).toHaveClass(/collapsed/);
  });

  test('theme toggle is visible in expanded sidebar', async ({ page }) => {
    const nav = new NavBar(page);
    await expect(nav.themeToggle()).toBeVisible();
  });

  test('theme toggle is visible in collapsed sidebar', async ({ page }) => {
    const nav = new NavBar(page);
    await nav.collapseButton().click();
    await expect(nav.themeToggle()).toBeVisible();
  });
});

test.describe('Navigation — mobile hamburger', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('theme toggle is visible in mobile top bar', async ({ page }) => {
    const nav = new NavBar(page);
    await page.goto('/');
    await expect(nav.nav()).toBeVisible();
    await expect(nav.themeToggle()).toBeVisible();
  });

  test('hamburger toggle opens and closes the nav menu', async ({ page }) => {
    const nav = new NavBar(page);
    await page.goto('/');
    await expect(nav.nav()).toBeVisible();

    await expect(nav.navLinks).not.toHaveClass(/open/);
    await nav.toggle.click();
    await expect(nav.navLinks).toHaveClass(/open/);
    await nav.toggle.click();
    await expect(nav.navLinks).not.toHaveClass(/open/);
  });

  test('clicking a nav link in mobile menu closes it', async ({ page }) => {
    const nav = new NavBar(page);
    await page.goto('/');
    await expect(nav.nav()).toBeVisible();
    await nav.toggle.click();
    await nav.navLinks.getByRole('link', { name: 'Expenses', exact: true }).click();
    await expect(page).toHaveURL('/expenses');
    await expect(nav.navLinks).not.toHaveClass(/open/);
  });

  test('nav link text is readable when mobile menu is open', async ({ page }) => {
    const nav = new NavBar(page);
    await page.goto('/');
    await nav.toggle.click();
    const color = await nav.navLabel('Dashboard').evaluate(
      (el) => window.getComputedStyle(el).color
    );
    expect(color).not.toMatch(/^rgba?\(255,\s*255,\s*255/);
  });

  test('collapse button is not visible on mobile', async ({ page }) => {
    const nav = new NavBar(page);
    await page.goto('/');
    await expect(nav.collapseButton()).not.toBeVisible();
  });

  test('all nav links are accessible from mobile hamburger menu', async ({ page }) => {
    const nav = new NavBar(page);
    await page.goto('/');
    await nav.toggle.click();
    await expect(nav.navLinks).toHaveClass(/open/);
    for (const label of ['Dashboard', 'Expenses', 'Reports', 'Budgets', 'Recurring']) {
      await expect(nav.navLinks.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
  });

  test('profile avatar is not visible in mobile top bar', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.nav-user-wrapper')).not.toBeVisible();
  });

  test('profile entry is visible in hamburger dropdown', async ({ page }) => {
    const nav = new NavBar(page);
    await page.goto('/');
    await nav.toggle.click();
    await expect(nav.navLinks).toHaveClass(/open/);
    await expect(nav.mobileProfile()).toBeVisible();
  });

  test('profile entry shows user name and handle in hamburger dropdown', async ({ page }) => {
    const nav = new NavBar(page);
    await page.goto('/');
    await nav.toggle.click();
    await expect(nav.mobileProfile().locator('.nav-user-name')).toBeVisible();
    await expect(nav.mobileProfile().locator('.nav-user-handle')).toBeVisible();
  });

  test('logout button is visible after opening profile menu on mobile', async ({ page }) => {
    const nav = new NavBar(page);
    await page.goto('/');
    await nav.openProfileMenu();
    await expect(nav.logoutButton()).toBeVisible();
  });

  test('switch user button is visible after opening profile menu on mobile', async ({ page }) => {
    const nav = new NavBar(page);
    await page.goto('/');
    await nav.openProfileMenu();
    await expect(nav.switchUserButton()).toBeVisible();
  });
});
