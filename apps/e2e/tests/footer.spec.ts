import { test, expect } from '@playwright/test';
import { FooterPage } from './pages/FooterPage';

test.describe('Site footer', () => {
  let footer!: FooterPage;

  test.beforeEach(async ({ page }) => {
    footer = new FooterPage(page);
    await page.goto('/');
    await expect(page.locator('nav.sidenav')).toBeVisible();
  });

  test('shows About, Contact, and a copyright on an authed page', async () => {
    await expect(footer.footer()).toBeVisible();
    await expect(footer.aboutButton()).toBeVisible();
    await expect(footer.contactButton()).toBeVisible();
    await expect(footer.copyright()).toHaveText(/© \d{4} Vegil Camilon/);
  });

  test('About opens a dialog with the credit and version, closes on Escape', async ({ page }) => {
    await footer.openAbout();
    await expect(footer.dialogTitle('About Expense Tool')).toBeVisible();
    await expect(footer.dialog()).toContainText('Created by Vegil Camilon & Claude Code');
    await expect(footer.versionLine()).toHaveText(/v\d+\.\d+\.\d+/);

    await page.keyboard.press('Escape');
    await expect(footer.dialog()).toHaveCount(0);
  });

  test('modal header is a themed band with a white title', async () => {
    await footer.openAbout();
    await expect(footer.modalHeader()).toBeVisible();

    // Themed band: background is opaque (alpha > 0) and not white / near-white.
    const bg = await footer.modalHeader().evaluate((el) => window.getComputedStyle(el).backgroundColor);
    const match = bg.match(/^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)$/);
    expect(match, `unexpected background-color: ${bg}`).not.toBeNull();
    const [r, g, b] = [Number(match![1]), Number(match![2]), Number(match![3])];
    const alpha = match![4] === undefined ? 1 : Number(match![4]);
    expect(alpha).toBeGreaterThan(0);
    expect(r > 240 && g > 240 && b > 240, `header background is white/near-white: ${bg}`).toBe(false);

    // Title text is white against the themed band.
    const titleColor = await footer.modalHeaderTitle().evaluate((el) => window.getComputedStyle(el).color);
    expect(titleColor).toBe('rgb(255, 255, 255)');
  });

  test('Contact opens a dialog with mailto/tel links, closes via ✕', async () => {
    await footer.openContact();
    await expect(footer.dialogTitle('Contact')).toBeVisible();
    await expect(footer.emailLink()).toHaveAttribute('href', 'mailto:camilonvegil@gmail.com');
    await expect(footer.phoneLink()).toHaveAttribute('href', 'tel:+639178020429');

    await footer.closeButton().click();
    await expect(footer.dialog()).toHaveCount(0);
  });
});

test.describe('Site footer — unauthenticated', () => {
  test('is absent on the login page when logged out', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/login');
    const footer = new FooterPage(page);
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(footer.footer()).toHaveCount(0);
  });
});
