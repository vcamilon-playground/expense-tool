import { test, expect } from '@playwright/test';
import { E2E_RECURRING_NAME, cleanup, seed } from './helpers/supabase';
import { RecurringPage } from './pages/RecurringPage';

test.describe('Recurring Expenses page', () => {
  let recurring!: RecurringPage;

  test.beforeEach(async ({ page }) => {
    recurring = new RecurringPage(page);
    await recurring.goto();
  });

  test('page renders with heading, description and add button', async () => {
    await expect(recurring.heading()).toHaveText('Recurring Expenses');
    await expect(recurring.descriptionText()).toContainText('Track subscriptions');
    await expect(recurring.addButton()).toHaveText('+ Add Recurring');
  });

  test('modal form has required fields and capitalized cadence options', async () => {
    await recurring.addButton().click();
    const dialog = recurring.dialog();
    await expect(dialog.getByRole('heading', { name: 'Add Recurring Expense' })).toHaveText('Add Recurring Expense');
    await expect(dialog.locator('input[required]').first()).toBeAttached();
    const options = await recurring.cadenceSelect().locator('option').allTextContents();
    for (const opt of options) {
      expect(opt[0]).toBe(opt[0]?.toUpperCase());
    }
  });

  test('modal closes on Cancel and Escape key', async () => {
    await recurring.addButton().click();
    await expect(recurring.dialog()).toBeVisible();
    await recurring.cancel();
    await expect(recurring.dialog()).toBeHidden();

    await recurring.addButton().click();
    await expect(recurring.dialog()).toBeVisible();
    await recurring.page.keyboard.press('Escape');
    await expect(recurring.dialog()).toBeHidden();
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
    await seed.recurring();
  });

  test.afterAll(async () => {
    await cleanup.recurring();
  });

  test.beforeEach(async ({ page }) => {
    recurring = new RecurringPage(page);
    await recurring.goto();
  });

  test('a due item shows the Due badge and a Confirm Payment button', async () => {
    await expect(recurring.dueBadge(E2E_RECURRING_NAME)).toBeVisible();
    await expect(recurring.dueBadge(E2E_RECURRING_NAME)).toHaveText('Due');
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

  test('reminder modal is not dismissible by backdrop click or Escape key', async () => {
    await recurring.confirmPaymentButton(E2E_RECURRING_NAME).click();
    await recurring.confirmNoButton().click();
    await expect(recurring.reminderModal()).toBeVisible();
    await recurring.page.mouse.click(5, 5);
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

  test('delete modal renders with correct content and buttons', async () => {
    await recurring.openDeleteModal(E2E_RECURRING_NAME);
    const dialog = recurring.deleteDialog();
    await expect(dialog.getByRole('heading')).toContainText('Remove');
    await expect(dialog).toContainText('Are you really sure you want to remove the record?');
    await expect(dialog).toContainText('This will not be retrieved anymore');
    await expect(recurring.deleteYesButton()).toBeVisible();
    await expect(recurring.deleteNoButton()).toBeVisible();
    await expect(recurring.deleteXButton()).toBeVisible();
  });

  test('X and "No, keep it" each close the modal without deleting the record', async () => {
    await recurring.openDeleteModal(E2E_RECURRING_NAME);
    await recurring.deleteXButton().click();
    await expect(recurring.deleteDialog()).toBeHidden();
    await expect(recurring.row(E2E_RECURRING_NAME)).toBeVisible();

    await recurring.openDeleteModal(E2E_RECURRING_NAME);
    await recurring.deleteNoButton().click();
    await expect(recurring.deleteDialog()).toBeHidden();
    await expect(recurring.row(E2E_RECURRING_NAME)).toBeVisible();
  });
});

test.describe('Recurring Expenses — pay now button', () => {
  let recurring!: RecurringPage;

  test.beforeAll(async () => {
    await cleanup.recurring();
    await seed.recurringFuture();
  });

  test.afterAll(async () => {
    await cleanup.recurring();
  });

  test.beforeEach(async ({ page }) => {
    recurring = new RecurringPage(page);
    await recurring.goto();
  });

  test('Pay Now button is visible and opens confirmation modal with item details', async () => {
    await expect(recurring.payNowButton(E2E_RECURRING_NAME)).toBeVisible();
    await expect(recurring.confirmPaymentButton(E2E_RECURRING_NAME)).toHaveCount(0);

    await recurring.payNowButton(E2E_RECURRING_NAME).click();
    await expect(recurring.earlyPayModal()).toBeVisible();
    await expect(recurring.earlyPayModal()).toContainText('Record Early Payment');
    await expect(recurring.earlyPayModal()).toContainText(E2E_RECURRING_NAME);
    await expect(recurring.earlyPayConfirmButton()).toBeVisible();
    await expect(recurring.earlyPayCancelButton()).toBeVisible();
  });

  test('Pay Now modal closes on Cancel, X button, and backdrop click', async () => {
    await recurring.payNowButton(E2E_RECURRING_NAME).click();
    await expect(recurring.earlyPayModal()).toBeVisible();
    await recurring.earlyPayCancelButton().click();
    await expect(recurring.earlyPayModal()).toBeHidden();

    await recurring.payNowButton(E2E_RECURRING_NAME).click();
    await expect(recurring.earlyPayModal()).toBeVisible();
    await recurring.earlyPayModal().getByRole('button', { name: 'Close' }).click();
    await expect(recurring.earlyPayModal()).toBeHidden();

    await recurring.payNowButton(E2E_RECURRING_NAME).click();
    await expect(recurring.earlyPayModal()).toBeVisible();
    await recurring.page.mouse.click(5, 5);
    await expect(recurring.earlyPayModal()).toBeHidden();
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

  test('Name sort activates and toggles direction', async ({ page }) => {
    if (await page.locator('.recurring-table').count() === 0) return;
    await recurring.sortableHeader('Name').click();
    await expect(recurring.sortableHeader('Name').locator('.sort-active')).toBeVisible();
    const first = await recurring.sortableHeader('Name').locator('.sort-active').textContent();
    await recurring.sortableHeader('Name').click();
    const second = await recurring.sortableHeader('Name').locator('.sort-active').textContent();
    expect(first).not.toBe(second);
  });
});
