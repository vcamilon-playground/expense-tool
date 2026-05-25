# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> Navigation >> active nav link is highlighted on expenses page
- Location: tests/navigation.spec.ts:32:7

# Error details

```
Error: expect(locator).toHaveClass(expected) failed

Locator: getByRole('navigation').getByRole('link', { name: 'Expenses', exact: true })
Expected pattern: /active/
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toHaveClass" with timeout 20000ms
  - waiting for getByRole('navigation').getByRole('link', { name: 'Expenses', exact: true })

```

```yaml
- navigation:
  - link "💸 Expenses":
    - /url: /
  - button "Toggle navigation": ☰
- main:
  - text: ⚠️ 6 days left this month — please update all your expenses before the month closes.
  - heading "Expenses" [level=1]
  - button "+ Add Expense"
  - button "▼ May 2026 5 items ₱13,191.39" [expanded]
  - table:
    - rowgroup:
      - row "Date Sun, May 24 Category 🔁 Subscriptions Merchant Netflix Description Monthly sub in netflix Amount ₱631.38 Edit Delete":
        - cell "Date Sun, May 24"
        - cell "Category 🔁 Subscriptions"
        - cell "Merchant Netflix"
        - cell "Description Monthly sub in netflix"
        - cell "Amount ₱631.38"
        - cell "Edit Delete":
          - button "Edit"
          - button "Delete"
      - row "Date Sun, May 24 Category 🔁 Subscriptions Merchant Converge Description — Amount ₱1,500.00 Edit Delete":
        - cell "Date Sun, May 24"
        - cell "Category 🔁 Subscriptions"
        - cell "Merchant Converge"
        - cell "Description —"
        - cell "Amount ₱1,500.00"
        - cell "Edit Delete":
          - button "Edit"
          - button "Delete"
      - row "Date Sun, May 24 Category 🔁 Subscriptions Merchant Smart Description — Amount ₱1,200.00 Edit Delete":
        - cell "Date Sun, May 24"
        - cell "Category 🔁 Subscriptions"
        - cell "Merchant Smart"
        - cell "Description —"
        - cell "Amount ₱1,200.00"
        - cell "Edit Delete":
          - button "Edit"
          - button "Delete"
      - row "Date Sun, May 24 Category 🏠 Rent Merchant Pasay Description — Amount ₱8,700.00 Edit Delete":
        - cell "Date Sun, May 24"
        - cell "Category 🏠 Rent"
        - cell "Merchant Pasay"
        - cell "Description —"
        - cell "Amount ₱8,700.00"
        - cell "Edit Delete":
          - button "Edit"
          - button "Delete"
      - row "Date Sun, May 24 Category 💡 Utilities Merchant Meralco Description — Amount ₱1,160.01 Edit Delete":
        - cell "Date Sun, May 24"
        - cell "Category 💡 Utilities"
        - cell "Merchant Meralco"
        - cell "Description —"
        - cell "Amount ₱1,160.01"
        - cell "Edit Delete":
          - button "Edit"
          - button "Delete"
  - button "▼ April 2026 1 item ₱1,200.00" [expanded]
  - table:
    - rowgroup:
      - row "Date Mon, Apr 6 Category 🔁 Subscriptions Merchant Smart Description — Amount ₱1,200.00 🔒 Delete":
        - cell "Date Mon, Apr 6"
        - cell "Category 🔁 Subscriptions"
        - cell "Merchant Smart"
        - cell "Description —"
        - cell "Amount ₱1,200.00"
        - cell "🔒 Delete":
          - text: 🔒
          - button "Delete"
- contentinfo: Created by Vegil Camilon & Claude Code
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Navigation', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/');
  6  |     // Wait for the nav to render — avoids networkidle which hangs on Next.js
  7  |     await expect(page.locator('nav.topnav')).toBeVisible();
  8  |   });
  9  | 
  10 |   test('brand link navigates to dashboard', async ({ page }) => {
  11 |     await page.goto('/expenses');
  12 |     await expect(page.locator('nav.topnav')).toBeVisible();
  13 |     await page.getByRole('link', { name: '💸 Expenses' }).click();
  14 |     await expect(page).toHaveURL('/');
  15 |   });
  16 | 
  17 |   test('nav links navigate to correct pages', async ({ page }) => {
  18 |     const navLinks: Array<[string, string]> = [
  19 |       ['Expenses', '/expenses'],
  20 |       ['Reports', '/reports'],
  21 |       ['Budgets', '/budgets'],
  22 |       ['Recurring', '/recurring'],
  23 |     ];
  24 | 
  25 |     for (const [label, href] of navLinks) {
  26 |       // exact: true prevents the brand link "💸 Expenses" from matching "Expenses"
  27 |       await page.getByRole('navigation').getByRole('link', { name: label, exact: true }).click();
  28 |       await expect(page).toHaveURL(href);
  29 |     }
  30 |   });
  31 | 
  32 |   test('active nav link is highlighted on expenses page', async ({ page }) => {
  33 |     await page.goto('/expenses');
  34 |     await expect(page.locator('nav.topnav')).toBeVisible();
  35 |     const expensesLink = page.getByRole('navigation').getByRole('link', { name: 'Expenses', exact: true });
> 36 |     await expect(expensesLink).toHaveClass(/active/);
     |                                ^ Error: expect(locator).toHaveClass(expected) failed
  37 |   });
  38 | 
  39 |   test('active nav link is highlighted on reports page', async ({ page }) => {
  40 |     await page.goto('/reports');
  41 |     await expect(page.locator('nav.topnav')).toBeVisible();
  42 |     const reportsLink = page.getByRole('navigation').getByRole('link', { name: 'Reports', exact: true });
  43 |     await expect(reportsLink).toHaveClass(/active/);
  44 |   });
  45 | 
  46 |   test('footer is visible on all pages', async ({ page }) => {
  47 |     await expect(page.locator('footer.site-footer')).toBeVisible();
  48 |     await expect(page.locator('footer.site-footer')).toContainText('Vegil Camilon');
  49 |   });
  50 | });
  51 | 
  52 | test.describe('Navigation — mobile hamburger', () => {
  53 |   test.use({ viewport: { width: 390, height: 844 } });
  54 | 
  55 |   test('hamburger toggle opens and closes the nav menu', async ({ page }) => {
  56 |     await page.goto('/');
  57 |     await expect(page.locator('nav.topnav')).toBeVisible();
  58 | 
  59 |     const toggle = page.getByRole('button', { name: 'Toggle navigation' });
  60 |     const navLinks = page.locator('.nav-links');
  61 | 
  62 |     await expect(navLinks).not.toHaveClass(/open/);
  63 |     await toggle.click();
  64 |     await expect(navLinks).toHaveClass(/open/);
  65 |     await toggle.click();
  66 |     await expect(navLinks).not.toHaveClass(/open/);
  67 |   });
  68 | 
  69 |   test('clicking a nav link in mobile menu closes it', async ({ page }) => {
  70 |     await page.goto('/');
  71 |     await expect(page.locator('nav.topnav')).toBeVisible();
  72 |     await page.getByRole('button', { name: 'Toggle navigation' }).click();
  73 |     await page.locator('.nav-links').getByRole('link', { name: 'Expenses', exact: true }).click();
  74 |     await expect(page).toHaveURL('/expenses');
  75 |     await expect(page.locator('.nav-links')).not.toHaveClass(/open/);
  76 |   });
  77 | });
  78 | 
```