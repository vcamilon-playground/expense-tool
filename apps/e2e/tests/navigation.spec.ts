import { test, expect } from '@playwright/test';
import { NavBar } from './pages/NavBar';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav.topnav')).toBeVisible();
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
});

test.describe('Navigation — mobile hamburger', () => {
  test.use({ viewport: { width: 390, height: 844 } });

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
});
