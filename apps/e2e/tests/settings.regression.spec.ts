import { test, expect } from '@playwright/test';
import { E2E_CATEGORY_NAME, cleanup, seed } from './helpers/supabase';
import { SettingsPage } from './pages/SettingsPage';
import { ExpensesPage } from './pages/ExpensesPage';

test.describe('Settings — category CRUD regression', () => {
  test.beforeEach(async () => {
    await cleanup.category();
  });

  test.afterAll(async () => {
    await cleanup.category();
  });

  test('add a category with a custom icon, then delete it', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();

    // ADD with custom icon
    await settings.addCategoryNameInput().fill(E2E_CATEGORY_NAME);
    await settings.addCategoryIconInput().fill('🧪');
    await settings.addCategoryButton().click();

    // Verify it appears in the list with the custom icon
    await expect(settings.categoryRow(E2E_CATEGORY_NAME)).toBeVisible();
    await expect(settings.categoryRow(E2E_CATEGORY_NAME)).toContainText('🧪');

    // DELETE
    await settings.categoryDeleteButton(E2E_CATEGORY_NAME).click();
    await expect(settings.page.getByRole('dialog').filter({ hasText: 'Are you really sure' })).toBeVisible();
    await settings.page.getByRole('button', { name: 'Yes, remove' }).click();

    // Verify removed
    await expect(settings.categoryRow(E2E_CATEGORY_NAME)).toHaveCount(0);
  });

  test('add a category without an icon uses the default icon', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();

    await settings.addCategoryNameInput().fill(E2E_CATEGORY_NAME);
    // leave icon empty
    await settings.addCategoryButton().click();

    await expect(settings.categoryRow(E2E_CATEGORY_NAME)).toBeVisible();
    await expect(settings.categoryRow(E2E_CATEGORY_NAME)).toContainText('🏷️');
  });
});

test.describe('Settings — deleting a category does not delete linked expenses', () => {
  test.beforeAll(async () => {
    await cleanup.category();
    await cleanup.expenses();
  });

  test.afterAll(async () => {
    await cleanup.expenses();
    await cleanup.category();
  });

  test('expense survives category deletion and still shows the original category name', async ({ page }) => {
    // Seed a category and an expense that references it
    await seed.categoryWithExpense();

    const settings = new SettingsPage(page);
    await settings.goto();

    // Confirm the category appears in the list
    await expect(settings.categoryRow(E2E_CATEGORY_NAME)).toBeVisible();

    // Soft-delete the category
    await settings.categoryDeleteButton(E2E_CATEGORY_NAME).click();
    await page.getByRole('button', { name: 'Yes, remove' }).click();
    // Category no longer appears in the settings list (it is inactive)
    await expect(settings.categoryRow(E2E_CATEGORY_NAME)).toHaveCount(0);

    // The linked expense still exists AND still shows the original category name
    const expenses = new ExpensesPage(page);
    await expenses.goto();
    const expRow = expenses.row('E2E-TEST');
    await expect(expRow).toBeVisible();
    await expect(expRow).toContainText(E2E_CATEGORY_NAME);
  });
});
