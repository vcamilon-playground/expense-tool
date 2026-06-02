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

  test('submitting without name keeps modal open and shows inline error', async () => {
    await recurring.addButton().click();
    const dialog = recurring.dialog();
    await dialog.locator('input[type="number"]').fill('10');
    await dialog.getByRole('button', { name: 'Add Recurring' }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('label').filter({ hasText: 'Name' }).locator('.field-error')).toBeVisible();
  });

  test('submitting with zero amount shows inline error below amount field', async () => {
    await recurring.addButton().click();
    const dialog = recurring.dialog();
    await dialog.locator('label').filter({ hasText: 'Name' }).locator('input').fill('Test Name');
    await dialog.locator('input[type="number"]').fill('0');
    await dialog.getByRole('button', { name: 'Add Recurring' }).click();
    await expect(dialog.locator('label').filter({ hasText: 'Amount' }).locator('.field-error')).toBeVisible();
    await expect(dialog.locator('label').filter({ hasText: 'Amount' }).locator('.field-error')).toContainText('positive');
  });
});

test.describe('Recurring Expenses — payment confirmation flow', () => {
  let recurring!: RecurringPage;

  test.beforeAll(async () => {
    await cleanup.recurring();
    await seed.recurring(); // next_charge_date = today → item is due
  });

  test.afterAll(async () => {
    await cleanup.recurring();
  });

  test.beforeEach(async ({ page }) => {
    recurring = new RecurringPage(page);
    await recurring.goto();
  });

  test('due badge is visible on an item whose charge date has arrived', async () => {
    await expect(recurring.dueBadge(E2E_RECURRING_NAME)).toBeVisible();
    await expect(recurring.dueBadge(E2E_RECURRING_NAME)).toHaveText('Due');
  });

  test('Confirm Payment button is visible for a due item', async () => {
    await expect(recurring.confirmPaymentButton(E2E_RECURRING_NAME)).toBeVisible();
  });

  test('clicking Confirm Payment opens confirmation modal with item details', async () => {
    await recurring.confirmPaymentButton(E2E_RECURRING_NAME).click();
    await expect(recurring.confirmModal()).toBeVisible();
    await expect(recurring.confirmModal()).toContainText(E2E_RECURRING_NAME);
    await expect(recurring.confirmModal()).toContainText('already been paid');
    await expect(recurring.confirmYesButton()).toBeVisible();
    await expect(recurring.confirmNoButton()).toBeVisible();
  });

  test('confirmation modal closes on X button without advancing the date', async () => {
    await recurring.confirmPaymentButton(E2E_RECURRING_NAME).click();
    await expect(recurring.confirmModal()).toBeVisible();
    await recurring.confirmModal().getByRole('button', { name: 'Close' }).click();
    await expect(recurring.confirmModal()).toBeHidden();
    await expect(recurring.dueBadge(E2E_RECURRING_NAME)).toBeVisible();
  });

  test('clicking No opens reminder modal with OK button', async () => {
    await recurring.confirmPaymentButton(E2E_RECURRING_NAME).click();
    await recurring.confirmNoButton().click();
    await expect(recurring.confirmModal()).toBeHidden();
    await expect(recurring.reminderModal()).toBeVisible();
    await expect(recurring.reminderModal()).toContainText(E2E_RECURRING_NAME);
    await expect(recurring.reminderModal()).toContainText('not be added to your records');
    await expect(recurring.reminderOkButton()).toBeVisible();
  });

  test('reminder modal does not close on backdrop click', async () => {
    await recurring.confirmPaymentButton(E2E_RECURRING_NAME).click();
    await recurring.confirmNoButton().click();
    await expect(recurring.reminderModal()).toBeVisible();
    await recurring.page.mouse.click(5, 5);
    await expect(recurring.reminderModal()).toBeVisible();
  });

  test('reminder modal does not close on Escape key', async () => {
    await recurring.confirmPaymentButton(E2E_RECURRING_NAME).click();
    await recurring.confirmNoButton().click();
    await expect(recurring.reminderModal()).toBeVisible();
    await recurring.page.keyboard.press('Escape');
    await expect(recurring.reminderModal()).toBeVisible();
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

test.describe('Recurring Expenses — column sorting', () => {
  let recurring!: RecurringPage;

  test.beforeEach(async ({ page }) => {
    recurring = new RecurringPage(page);
    await recurring.goto();
  });

  test('Name, Category, Cadence, Next Charge, Amount, Active headers are sortable', async ({ page }) => {
    if (await page.locator('.recurring-table').count() === 0) return;
    for (const col of ['Name', 'Category', 'Cadence', 'Next Charge', 'Amount', 'Active']) {
      await expect(recurring.sortableHeader(col)).toBeVisible();
    }
  });

  test('clicking Name header activates sort indicator', async ({ page }) => {
    if (await page.locator('.recurring-table').count() === 0) return;
    await recurring.sortableHeader('Name').click();
    await expect(recurring.sortableHeader('Name').locator('.sort-active')).toBeVisible();
  });

  test('clicking Name twice toggles sort direction', async ({ page }) => {
    if (await page.locator('.recurring-table').count() === 0) return;
    await recurring.sortableHeader('Name').click();
    const first = await recurring.sortableHeader('Name').locator('.sort-active').textContent();
    await recurring.sortableHeader('Name').click();
    const second = await recurring.sortableHeader('Name').locator('.sort-active').textContent();
    expect(first).not.toBe(second);
  });
});
