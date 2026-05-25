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

  test('required fields have required attribute in modal', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Expense' }).click();
    const dialog = page.getByRole('dialog');
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
    await page.locator('.modal-overlay').click({ position: { x: 5, y: 5 } });
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('submitting empty form keeps modal open', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Expense' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('input[type="number"]').fill('');
    // Scope submit button to dialog to avoid matching the page-level "+ Add Expense" button
    await dialog.getByRole('button', { name: 'Add Expense' }).click();
    await expect(dialog).toBeVisible();
  });
});
