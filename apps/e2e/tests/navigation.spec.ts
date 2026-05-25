import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the nav to render — avoids networkidle which hangs on Next.js
    await expect(page.locator('nav.topnav')).toBeVisible();
  });

  test('brand link navigates to dashboard', async ({ page }) => {
    await page.goto('/expenses');
    await expect(page.locator('nav.topnav')).toBeVisible();
    await page.getByRole('link', { name: '💸 Expenses' }).click();
    await expect(page).toHaveURL('/');
  });

  test('nav links navigate to correct pages', async ({ page }) => {
    const navLinks: Array<[string, string]> = [
      ['Expenses', '/expenses'],
      ['Reports', '/reports'],
      ['Budgets', '/budgets'],
      ['Recurring', '/recurring'],
    ];

    for (const [label, href] of navLinks) {
      // On mobile the hamburger closes after each navigation — reopen before each click
      const toggle = page.getByRole('button', { name: 'Toggle navigation' });
      if (await toggle.isVisible()) {
        await toggle.click();
        await expect(page.locator('.nav-links')).toHaveClass(/open/);
      }
      // exact: true prevents the brand link "💸 Expenses" from matching "Expenses"
      await page.getByRole('navigation').getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(href);
    }
  });

  test('active nav link is highlighted on expenses page', async ({ page }) => {
    await page.goto('/expenses');
    await expect(page.locator('nav.topnav')).toBeVisible();
    // On mobile links are hidden until hamburger is opened
    const toggle = page.getByRole('button', { name: 'Toggle navigation' });
    if (await toggle.isVisible()) await toggle.click();
    const expensesLink = page.getByRole('navigation').getByRole('link', { name: 'Expenses', exact: true });
    await expect(expensesLink).toHaveClass(/active/);
  });

  test('active nav link is highlighted on reports page', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.locator('nav.topnav')).toBeVisible();
    // On mobile links are hidden until hamburger is opened
    const toggle = page.getByRole('button', { name: 'Toggle navigation' });
    if (await toggle.isVisible()) await toggle.click();
    const reportsLink = page.getByRole('navigation').getByRole('link', { name: 'Reports', exact: true });
    await expect(reportsLink).toHaveClass(/active/);
  });

  test('footer is visible on all pages', async ({ page }) => {
    await expect(page.locator('footer.site-footer')).toBeVisible();
    await expect(page.locator('footer.site-footer')).toContainText('Vegil Camilon');
  });
});

test.describe('Navigation — mobile hamburger', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('hamburger toggle opens and closes the nav menu', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav.topnav')).toBeVisible();

    const toggle = page.getByRole('button', { name: 'Toggle navigation' });
    const navLinks = page.locator('.nav-links');

    await expect(navLinks).not.toHaveClass(/open/);
    await toggle.click();
    await expect(navLinks).toHaveClass(/open/);
    await toggle.click();
    await expect(navLinks).not.toHaveClass(/open/);
  });

  test('clicking a nav link in mobile menu closes it', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav.topnav')).toBeVisible();
    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    await page.locator('.nav-links').getByRole('link', { name: 'Expenses', exact: true }).click();
    await expect(page).toHaveURL('/expenses');
    await expect(page.locator('.nav-links')).not.toHaveClass(/open/);
  });
});
