# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> Navigation >> nav links navigate to correct pages
- Location: tests/navigation.spec.ts:17:7

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for getByRole('navigation').getByRole('link', { name: 'Expenses', exact: true })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - navigation [ref=e2]:
    - link "💸 Expenses" [ref=e3] [cursor=pointer]:
      - /url: /
    - button "Toggle navigation" [ref=e4] [cursor=pointer]: ☰
  - main [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e7]: ⚠️ 6 days left this month — please update all your expenses before the month closes.
      - heading "Dashboard" [level=1] [ref=e8]
      - generic [ref=e9]:
        - generic [ref=e10]:
          - generic [ref=e11]: Today
          - generic [ref=e12]: ₱0.00
          - generic [ref=e13]: 0 expense(s)
        - generic [ref=e14]:
          - generic [ref=e15]: This Week
          - generic [ref=e16]: ₱0.00
          - generic [ref=e17]: 0 expense(s)
        - generic [ref=e18]:
          - generic [ref=e19]: This Month
          - generic [ref=e20]: ₱13,191.39
          - generic [ref=e21]: 5 expense(s)
        - generic [ref=e22]:
          - generic [ref=e23]: This Year
          - generic [ref=e24]: ₱14,391.39
          - generic [ref=e25]: 6 expense(s)
      - generic [ref=e26]:
        - heading "Budget Status" [level=2] [ref=e27]
        - generic [ref=e29]:
          - generic [ref=e30]:
            - strong [ref=e31]: Overall
            - generic [ref=e32]: 88% — ₱13,191.39 / ₱15,000.00
          - paragraph [ref=e35]: Approaching limit — ₱1,808.61 left.
      - generic [ref=e36]:
        - heading "This Month by Category" [level=2] [ref=e37]
        - img [ref=e41]:
          - generic [ref=e45]:
            - generic [ref=e47]: Rent
            - generic [ref=e49]: Subscriptions
            - generic [ref=e51]: Utilities
          - generic [ref=e53]:
            - generic [ref=e55]: ₱0
            - generic [ref=e57]: ₱2,500
            - generic [ref=e59]: ₱5,000
            - generic [ref=e61]: ₱7,500
            - generic [ref=e63]: ₱10,000
      - generic [ref=e72]:
        - heading "6-Month Trend" [level=2] [ref=e73]
        - generic [ref=e76]:
          - img [ref=e77]:
            - generic [ref=e81]:
              - generic [ref=e83]: Jan 26
              - generic [ref=e85]: Mar 26
              - generic [ref=e87]: May 26
            - generic [ref=e89]:
              - generic [ref=e91]: ₱0
              - generic [ref=e93]: ₱4,000
              - generic [ref=e95]: ₱8,000
              - generic [ref=e97]: ₱12,000
              - generic [ref=e99]: ₱16,000
          - list [ref=e107]:
            - listitem [ref=e108]:
              - img [ref=e109]
              - generic [ref=e111]: Spent
            - listitem [ref=e112]:
              - img [ref=e113]
              - generic [ref=e115]: Budget
      - generic [ref=e116]:
        - generic [ref=e117]:
          - heading "🤖 Monthly AI Insight" [level=2] [ref=e118]
          - button "Generate" [ref=e119] [cursor=pointer]
        - paragraph [ref=e120]: Click Generate to have Gemini analyze your recent spending and suggest next steps.
  - contentinfo [ref=e121]: Created by Vegil Camilon & Claude Code
  - alert [ref=e122]
  - generic [ref=e123]: ₱4,000
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
> 27 |       await page.getByRole('navigation').getByRole('link', { name: label, exact: true }).click();
     |                                                                                          ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  28 |       await expect(page).toHaveURL(href);
  29 |     }
  30 |   });
  31 | 
  32 |   test('active nav link is highlighted on expenses page', async ({ page }) => {
  33 |     await page.goto('/expenses');
  34 |     await expect(page.locator('nav.topnav')).toBeVisible();
  35 |     const expensesLink = page.getByRole('navigation').getByRole('link', { name: 'Expenses', exact: true });
  36 |     await expect(expensesLink).toHaveClass(/active/);
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