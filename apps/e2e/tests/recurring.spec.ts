import { test, expect } from '@playwright/test';
import { RecurringPage } from './pages/RecurringPage';

test.describe('Recurring Expenses page', () => {
  let recurring!: RecurringPage;

  test.beforeEach(async ({ page }) => {
    recurring = new RecurringPage(page);
    await recurring.goto();
  });

  test('page heading is visible', async () => {
    await expect(recurring.heading()).toBeVisible();
  });

  test('description text is present', async () => {
    await expect(recurring.descriptionText()).toBeVisible();
  });

  test('Add Recurring button is visible', async () => {
    await expect(recurring.addButton()).toBeVisible();
  });

  test('clicking Add Recurring opens the modal', async () => {
    await recurring.openAddModal();
    await expect(recurring.dialog()).toBeVisible();
  });

  test('form has required fields with required attribute', async () => {
    await recurring.addButton().click();
    await expect(recurring.dialog().locator('input[required]').first()).toBeAttached();
  });

  test('modal closes on Cancel', async () => {
    await recurring.addButton().click();
    await expect(recurring.dialog()).toBeVisible();
    await recurring.cancel();
    await expect(recurring.dialog()).toBeHidden();
  });

  test('modal closes on Escape key', async () => {
    await recurring.addButton().click();
    await expect(recurring.dialog()).toBeVisible();
    await recurring.page.keyboard.press('Escape');
    await expect(recurring.dialog()).toBeHidden();
  });

  test('cadence dropdown has capitalized options', async () => {
    await recurring.addButton().click();
    const options = await recurring.cadenceSelect().locator('option').allTextContents();
    for (const opt of options) {
      expect(opt[0]).toBe(opt[0]?.toUpperCase());
    }
  });
});
