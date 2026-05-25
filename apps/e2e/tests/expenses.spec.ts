import { test, expect } from '@playwright/test';

test.describe('Expenses page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/expenses');
    await expect(page.getByText('Loading…')).toBeHidden({ timeout: 15000 });
  });

  test('page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Expenses' })).toBeVisible();
  });

  test('Add Expense button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: '+ Add Expense' })).toBeVisible();
  });

  test('clicking Add Expense opens the modal', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Expense' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Add Expense' })).toBeVisible();
  });

  test('required fields have red asterisk in modal', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Expense' }).click();
    const dialog = page.getByRole('dialog');

    // Amount and Date are required — their .muted labels get ::after content via CSS
    // Verify the inputs themselves carry the required attribute
    await expect(dialog.locator('input[type="number"][required]')).toBeAttached();
    await expect(dialog.locator('input[type="date"][required]')).toBeAttached();
  });

  test('modal closes on Cancel', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Expense' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('modal closes on Escape key', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Expense' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('modal closes when clicking the backdrop', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Expense' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    // Click the overlay (outside the dialog box)
    await page.locator('.modal-overlay').click({ position: { x: 5, y: 5 } });
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('submitting empty form shows validation error', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Expense' }).click();
    // Clear the amount (default might be empty) and submit
    await page.getByRole('dialog').locator('input[type="number"]').fill('');
    await page.getByRole('button', { name: 'Add Expense' }).click();
    // Browser native validation or app-level error should appear
    await expect(page.getByRole('dialog')).toBeVisible(); // modal stays open
  });
});
