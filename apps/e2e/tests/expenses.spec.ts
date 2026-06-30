import { test, expect } from '@playwright/test';
import { SMOKE_MERCHANT, cleanup, seed } from './helpers/supabase';
import { ExpensesPage } from './pages/ExpensesPage';

test.describe('Expenses page', () => {
  let expenses!: ExpensesPage;

  test.beforeEach(async ({ page }) => {
    expenses = new ExpensesPage(page);
    await expenses.goto();
  });

  test('page renders heading, add button, and search/filter controls', async () => {
    await expect(expenses.heading()).toHaveText('Expenses');
    await expect(expenses.addButton()).toHaveText('+ Add Expense');
    await expect(expenses.searchInput()).toBeVisible();
    await expect(expenses.categoryFilterSelect()).toBeVisible();
    await expect(expenses.categoryFilterSelect()).toHaveValue('');
  });

  test('clicking Add Expense opens the modal with correct heading', async () => {
    await expenses.openAddModal();
    const heading = expenses.dialog().getByRole('heading', { name: 'Add Expense' });
    await expect(heading).toHaveText('Add Expense');
  });

  test('required fields have required attribute in modal', async () => {
    await expenses.openAddModal();
    const dialog = expenses.dialog();
    await expect(dialog.locator('input[type="number"][required]')).toBeAttached();
    await expect(dialog.locator('input[type="date"][required]')).toBeAttached();
  });

  test('modal closes on Cancel, Escape, and backdrop click', async () => {
    await expenses.openAddModal();
    await expenses.cancel();
    await expect(expenses.dialog()).toBeHidden();

    await expenses.openAddModal();
    await expenses.page.keyboard.press('Escape');
    await expect(expenses.dialog()).toBeHidden();

    await expenses.openAddModal();
    await expenses.modalOverlay().click({ position: { x: 5, y: 5 } });
    await expect(expenses.dialog()).toBeHidden();
  });

  test('submitting an empty or negative amount keeps modal open and shows inline error', async () => {
    await expenses.openAddModal();
    const dialog = expenses.dialog();
    const amountError = dialog.locator('label').filter({ hasText: 'Amount' }).locator('.field-error');

    await dialog.locator('input[type="number"]').fill('');
    await dialog.getByRole('button', { name: 'Add Expense' }).click();
    await expect(dialog).toBeVisible();
    await expect(amountError).toBeVisible();

    await dialog.locator('input[type="number"]').fill('-1');
    await dialog.getByRole('button', { name: 'Add Expense' }).click();
    await expect(dialog).toBeVisible();
    await expect(amountError).toBeVisible();
  });

  test('Category select shows the "— Select category —" placeholder and defaults to it', async () => {
    await expenses.openAddModal();
    const select = expenses.categorySelect();
    await expect(select).toHaveValue('');
    await expect(select.locator('option').first()).toHaveText('— Select category —');
  });

  test('submitting with no category shows "Category is required" inline error and aria-invalid; selecting one clears it', async () => {
    await expenses.openAddModal();
    const dialog = expenses.dialog();

    // Provide valid amount/date so only the category gate can block submission.
    await dialog.locator('input[type="number"]').fill('100');

    await dialog.getByRole('button', { name: 'Add Expense' }).click();
    await expect(dialog).toBeVisible();
    await expect(expenses.categoryError()).toHaveText('Category is required');
    await expect(expenses.categorySelect()).toHaveAttribute('aria-invalid', 'true');

    // Picking a category clears the error and the invalid state.
    await expenses.selectFirstCategory();
    await expect(expenses.categoryError()).toHaveCount(0);
    await expect(expenses.categorySelect()).toHaveAttribute('aria-invalid', 'false');
  });

  test('empty amount, missing date, and missing category can all show "is required" together', async () => {
    await expenses.openAddModal();
    const dialog = expenses.dialog();

    await dialog.locator('input[type="number"]').fill('');
    await dialog.locator('input[type="date"]').fill('');
    await dialog.getByRole('button', { name: 'Add Expense' }).click();

    await expect(dialog).toBeVisible();
    await expect(dialog.locator('label').filter({ hasText: 'Amount' }).locator('.field-error'))
      .toHaveText('Amount is required');
    await expect(dialog.locator('label').filter({ hasText: 'Date' }).locator('.field-error'))
      .toHaveText('Date is required');
    await expect(expenses.categoryError()).toHaveText('Category is required');
  });

  test('searching with no matches shows the no-results message; clearing restores the list', async () => {
    await expenses.searchInput().fill('zzznomatch999');
    await expect(expenses.page.getByText('No expenses match your search.')).toBeVisible();
    await expenses.searchInput().fill('');
    await expect(expenses.page.getByText('No expenses match your search.')).not.toBeVisible();
  });
});

test.describe('Expenses — delete confirmation modal', () => {
  let expenses!: ExpensesPage;

  test.beforeAll(async () => {
    await cleanup.smokeExpenses();
    await seed.smokeExpense();
  });

  test.afterAll(async () => {
    await cleanup.smokeExpenses();
  });

  test.beforeEach(async ({ page }) => {
    expenses = new ExpensesPage(page);
    await expenses.goto();
  });

  test('delete modal renders with correct content and buttons', async () => {
    await expenses.openDeleteModal(SMOKE_MERCHANT);
    const dialog = expenses.deleteDialog();
    await expect(dialog.getByRole('heading')).toContainText('Remove');
    await expect(dialog).toContainText('Are you really sure you want to remove the record?');
    await expect(dialog).toContainText('This will not be retrieved anymore');
    await expect(expenses.deleteYesButton()).toBeVisible();
    await expect(expenses.deleteNoButton()).toBeVisible();
    await expect(expenses.deleteXButton()).toBeVisible();
  });

  test('X, "No, keep it", and backdrop each close the modal without deleting', async () => {
    await expenses.openDeleteModal(SMOKE_MERCHANT);
    await expenses.deleteXButton().click();
    await expect(expenses.deleteDialog()).toBeHidden();
    await expect(expenses.row(SMOKE_MERCHANT)).toBeVisible();

    await expenses.openDeleteModal(SMOKE_MERCHANT);
    await expenses.deleteNoButton().click();
    await expect(expenses.deleteDialog()).toBeHidden();
    await expect(expenses.row(SMOKE_MERCHANT)).toBeVisible();

    await expenses.openDeleteModal(SMOKE_MERCHANT);
    await expenses.modalOverlay().click({ position: { x: 5, y: 5 } });
    await expect(expenses.deleteDialog()).toBeHidden();
    await expect(expenses.row(SMOKE_MERCHANT)).toBeVisible();
  });
});

test.describe('Expenses — month group collapse behaviour', () => {
  let expenses!: ExpensesPage;

  test.beforeEach(async ({ page }) => {
    expenses = new ExpensesPage(page);
    await expenses.goto();
  });

  test('default expansion state: current month expanded, past months collapsed', async () => {
    const currentLabel = expenses.currentMonthLabel();
    const group = expenses.monthGroup(currentLabel);
    if ((await group.count()) > 0) {
      await expect(expenses.monthGroupHeader(currentLabel)).toHaveAttribute('aria-expanded', 'true');
      await expect(expenses.monthGroupBody(currentLabel)).toBeVisible();
    }
    const allGroups = expenses.page.locator('.date-group');
    const total = await allGroups.count();
    for (let i = 0; i < total; i++) {
      const header = allGroups.nth(i).locator('.date-group-header');
      const text = await header.textContent();
      if (text?.includes(currentLabel)) continue;
      await expect(header).toHaveAttribute('aria-expanded', 'false');
      await expect(allGroups.nth(i).locator('.date-group-body')).toBeHidden();
    }
  });

  test('toggling a month header expands a collapsed group and collapses an expanded one', async () => {
    const currentLabel = expenses.currentMonthLabel();

    // Expand a collapsed past-month group, if any exist.
    const allGroups = expenses.page.locator('.date-group');
    const total = await allGroups.count();
    for (let i = 0; i < total; i++) {
      const header = allGroups.nth(i).locator('.date-group-header');
      const text = await header.textContent();
      if (text?.includes(currentLabel)) continue;
      await header.click();
      await expect(header).toHaveAttribute('aria-expanded', 'true');
      await expect(allGroups.nth(i).locator('.date-group-body')).toBeVisible();
      break;
    }

    // Collapse the expanded current-month group, if present.
    const group = expenses.monthGroup(currentLabel);
    if ((await group.count()) > 0) {
      const header = expenses.monthGroupHeader(currentLabel);
      await header.click();
      await expect(header).toHaveAttribute('aria-expanded', 'false');
      await expect(expenses.monthGroupBody(currentLabel)).toBeHidden();
    }
  });
});

test.describe('Expenses — column sorting', () => {
  let expenses!: ExpensesPage;

  test.beforeEach(async ({ page }) => {
    expenses = new ExpensesPage(page);
    await expenses.goto();
  });

  test('Date, Category, Merchant and Amount headers are sortable', async ({ page }) => {
    if (await page.locator('.expense-table').count() === 0) return;
    for (const col of ['Date', 'Category', 'Merchant', 'Amount']) {
      await expect(expenses.sortableHeader(col)).toBeVisible();
    }
  });

  test('Amount sort toggles direction and a different header moves the active indicator', async ({ page }) => {
    if (await page.locator('.expense-table').count() === 0) return;
    await expenses.sortableHeader('Amount').click();
    await expect(expenses.sortableHeader('Amount').locator('.sort-active')).toBeVisible();
    const first = await expenses.sortableHeader('Amount').locator('.sort-active').textContent();
    await expenses.sortableHeader('Amount').click();
    const second = await expenses.sortableHeader('Amount').locator('.sort-active').textContent();
    expect(first).not.toBe(second);

    await expenses.sortableHeader('Merchant').click();
    await expect(expenses.sortableHeader('Merchant').locator('.sort-active')).toBeVisible();
    await expect(expenses.sortableHeader('Amount').locator('.sort-active')).toHaveCount(0);
  });
});

test.describe('Expenses — List / Grid / Calendar view', () => {
  let expenses!: ExpensesPage;

  test.beforeEach(async ({ page }) => {
    expenses = new ExpensesPage(page);
    await expenses.goto();
  });

  test('view toggle shows List, Grid, Calendar in order with List active by default', async () => {
    await expect(expenses.viewToggle()).toBeVisible();
    await expect(expenses.viewToggleButtons()).toHaveCount(3);
    await expect(expenses.viewToggleButtons().nth(0)).toHaveText('List');
    await expect(expenses.viewToggleButtons().nth(1)).toHaveText('Grid');
    await expect(expenses.viewToggleButtons().nth(2)).toHaveText('Calendar');
    // List is the default view — its button uses the primary style.
    await expect(expenses.listViewButton()).toHaveClass(/primary/);
    await expect(expenses.gridViewButton()).not.toHaveClass(/primary/);
    await expect(expenses.calendarViewButton()).not.toHaveClass(/primary/);
    await expect(expenses.calendarGrid()).toHaveCount(0);
    await expect(expenses.grid()).toHaveCount(0);
  });

  test('switching to Grid shows the grid, switching back to List hides it', async () => {
    await expenses.gridViewButton().click();
    await expect(expenses.gridViewButton()).toHaveClass(/primary/);
    await expect(expenses.listViewButton()).not.toHaveClass(/primary/);
    // The grid container shows when at least one expense exists; otherwise the
    // empty-state message renders. Either way the calendar and table are hidden.
    await expect(expenses.calendarGrid()).toHaveCount(0);
    await expect(expenses.page.locator('.expense-table')).toHaveCount(0);

    await expenses.listViewButton().click();
    await expect(expenses.grid()).toHaveCount(0);
    await expect(expenses.listViewButton()).toHaveClass(/primary/);
  });

  test('Grid view shows the no-match page message when a search matches nothing', async () => {
    await expenses.gridViewButton().click();
    await expenses.searchInput().fill('zzznomatch999');
    await expect(expenses.page.getByText('No expenses match your search.')).toBeVisible();
    // The grid's own "No expenses yet." empty state must NOT show while filtering.
    await expect(expenses.page.getByText('No expenses yet.')).toHaveCount(0);
  });

  test('switching to Calendar shows the grid and nav, switching back to List hides it', async () => {
    await expenses.calendarViewButton().click();
    await expect(expenses.calendarGrid()).toBeVisible();
    await expect(expenses.calendarMonthLabel()).toBeVisible();
    await expect(expenses.calendarPrevButton()).toBeVisible();
    await expect(expenses.calendarNextButton()).toBeVisible();

    await expenses.listViewButton().click();
    await expect(expenses.calendarGrid()).toHaveCount(0);
  });

  test('calendar month navigation changes the displayed month', async () => {
    await expenses.calendarViewButton().click();
    const before = await expenses.calendarMonthLabel().textContent();
    await expenses.calendarNextButton().click();
    const after = await expenses.calendarMonthLabel().textContent();
    expect(before).not.toBe(after);
  });
});

test.describe('Expenses — Grid view on mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  let expenses!: ExpensesPage;

  test.beforeEach(async ({ page }) => {
    expenses = new ExpensesPage(page);
    await expenses.goto();
  });

  test('the three-way toggle and Grid view are reachable at a mobile viewport', async () => {
    await expect(expenses.viewToggleButtons()).toHaveCount(3);
    await expect(expenses.gridViewButton()).toBeVisible();
    await expenses.gridViewButton().click();
    await expect(expenses.gridViewButton()).toHaveClass(/primary/);
    await expect(expenses.calendarGrid()).toHaveCount(0);
    await expect(expenses.page.locator('.expense-table')).toHaveCount(0);
  });
});
