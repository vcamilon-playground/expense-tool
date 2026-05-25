import { test, expect } from '@playwright/test';

test.describe('Recurring Expenses page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/recurring');
    await expect(page.getByText('Loading…')).toBeHidden({ timeout: 15000 });
  });

  test('page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Recurring Expenses' })).toBeVisible();
  });

  test('description text is present', async ({ page }) => {
    await expect(page.getByText(/Track subscriptions/i)).toBeVisible();
  });

  test('Add Recurring button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: '+ Add Recurring' })).toBeVisible();
  });

  test('clicking Add Recurring opens the modal', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Recurring' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: 'Add Recurring Expense' }),
    ).toBeVisible();
  });

  test('form has required fields with required attribute', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Recurring' }).click();
    const dialog = page.getByRole('dialog');
    // Name and Amount are required
    await expect(dialog.locator('input[required]').first()).toBeAttached();
  });

  test('modal closes on Cancel', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Recurring' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('modal closes on Escape key', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Recurring' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('cadence dropdown has capitalized options', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Recurring' }).click();
    const cadenceSelect = page.getByRole('dialog').locator('select').first();
    const options = await cadenceSelect.locator('option').allTextContents();
    // Each option should start with an uppercase letter
    for (const opt of options) {
      expect(opt[0]).toBe(opt[0]?.toUpperCase());
    }
  });
});
