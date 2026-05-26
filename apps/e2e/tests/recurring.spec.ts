import { test, expect } from '@playwright/test';
import { E2E_RECURRING_NAME, cleanup, seed } from './helpers/supabase';
import { RecurringPage } from './pages/RecurringPage';

test.describe('Recurring Expenses page', () => {
  let recurring!: RecurringPage;

  test.beforeEach(async ({ page }) => {
    recurring = new RecurringPage(page);
    await recurring.goto();
  });

  test('page heading shows "Recurring Expenses"', async () => {
    await expect(recurring.heading()).toBeVisible();
    await expect(recurring.heading()).toHaveText('Recurring Expenses');
  });

  test('description text contains correct content', async () => {
    await expect(recurring.descriptionText()).toBeVisible();
    await expect(recurring.descriptionText()).toContainText('Track subscriptions');
  });

  test('Add Recurring button is visible with correct label', async () => {
    await expect(recurring.addButton()).toBeVisible();
    await expect(recurring.addButton()).toHaveText('+ Add Recurring');
  });

  test('clicking Add Recurring opens the modal with correct heading', async () => {
    await recurring.openAddModal();
    await expect(recurring.dialog().getByRole('heading', { name: 'Add Recurring Expense' })).toBeVisible();
    await expect(recurring.dialog().getByRole('heading', { name: 'Add Recurring Expense' })).toHaveText('Add Recurring Expense');
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

  test('submitting without amount keeps modal open', async () => {
    await recurring.addButton().click();
    const dialog = recurring.dialog();
    await dialog.locator('label').filter({ hasText: 'Name' }).locator('input').fill('Test Name');
    await dialog.getByRole('button', { name: 'Add Recurring' }).click();
    await expect(dialog).toBeVisible();
  });

  test('submitting with zero amount shows validation error', async () => {
    await recurring.addButton().click();
    const dialog = recurring.dialog();
    await dialog.locator('label').filter({ hasText: 'Name' }).locator('input').fill('Test Name');
    await dialog.locator('input[type="number"]').fill('0');
    await dialog.getByRole('button', { name: 'Add Recurring' }).click();
    await expect(dialog.getByText('Name and a positive amount required')).toBeVisible();
  });
});

test.describe('Recurring Expenses — delete confirmation modal', () => {
  let recurring!: RecurringPage;

  test.beforeAll(async () => {
    await cleanup.recurring();
    await seed.recurring();
  });

  test.afterAll(async () => {
    await cleanup.recurring();
  });

  test.beforeEach(async ({ page }) => {
    recurring = new RecurringPage(page);
    await recurring.goto();
  });

  test('delete confirmation heading and message are visible', async () => {
    await recurring.openDeleteModal(E2E_RECURRING_NAME);
    const dialog = recurring.deleteDialog();
    await expect(dialog.getByRole('heading')).toContainText('Remove');
    await expect(dialog).toContainText('Are you really sure you want to remove the record?');
    await expect(dialog).toContainText('This will not be retrieved anymore');
  });

  test('Yes, remove and No, keep it buttons are present', async () => {
    await recurring.openDeleteModal(E2E_RECURRING_NAME);
    await expect(recurring.deleteYesButton()).toBeVisible();
    await expect(recurring.deleteNoButton()).toBeVisible();
  });

  test('X button is present in the upper right', async () => {
    await recurring.openDeleteModal(E2E_RECURRING_NAME);
    await expect(recurring.deleteXButton()).toBeVisible();
  });

  test('X button closes the modal without deleting the record', async () => {
    await recurring.openDeleteModal(E2E_RECURRING_NAME);
    await recurring.deleteXButton().click();
    await expect(recurring.deleteDialog()).toBeHidden();
    await expect(recurring.row(E2E_RECURRING_NAME)).toBeVisible();
  });

  test('No, keep it button closes the modal without deleting the record', async () => {
    await recurring.openDeleteModal(E2E_RECURRING_NAME);
    await recurring.deleteNoButton().click();
    await expect(recurring.deleteDialog()).toBeHidden();
    await expect(recurring.row(E2E_RECURRING_NAME)).toBeVisible();
  });
});
