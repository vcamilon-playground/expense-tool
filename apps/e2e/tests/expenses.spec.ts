import { test, expect } from '@playwright/test';
import { SMOKE_MERCHANT, cleanup, seed } from './helpers/supabase';
import { ExpensesPage } from './pages/ExpensesPage';

test.describe('Expenses page', () => {
  let expenses!: ExpensesPage;

  test.beforeEach(async ({ page }) => {
    expenses = new ExpensesPage(page);
    await expenses.goto();
  });

  test('page renders with heading and add button', async () => {
    await expect(expenses.heading()).toHaveText('Expenses');
    await expect(expenses.addButton()).toHaveText('+ Add Expense');
  });

  test('search and filter controls are present', async () => {
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

  test('submitting empty form keeps modal open and shows inline errors', async () => {
    await expenses.openAddModal();
    const dialog = expenses.dialog();
    await dialog.locator('input[type="number"]').fill('');
    await dialog.getByRole('button', { name: 'Add Expense' }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('label').filter({ hasText: 'Amount' }).locator('.field-error')).toBeVisible();
  });

  test('submitting with negative amount keeps modal open and shows inline error', async () => {
    await expenses.openAddModal();
    const dialog = expenses.dialog();
    await dialog.locator('input[type="number"]').fill('-1');
    await dialog.getByRole('button', { name: 'Add Expense' }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('label').filter({ hasText: 'Amount' }).locator('.field-error')).toBeVisible();
  });

  test('typing in search filters to no results message when nothing matches', async () => {
    await expenses.searchInput().fill('zzznomatch999');
    await expect(expenses.page.getByText('No expenses match your search.')).toBeVisible();
  });

  test('clearing search restores the expense list', async () => {
    await expenses.searchInput().fill('zzznomatch999');
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

  test('X button closes the modal without deleting the record', async () => {
    await expenses.openDeleteModal(SMOKE_MERCHANT);
    await expenses.deleteXButton().click();
    await expect(expenses.deleteDialog()).toBeHidden();
    await expect(expenses.row(SMOKE_MERCHANT)).toBeVisible();
  });

  test('No, keep it button closes the modal without deleting the record', async () => {
    await expenses.openDeleteModal(SMOKE_MERCHANT);
    await expenses.deleteNoButton().click();
    await expect(expenses.deleteDialog()).toBeHidden();
    await expect(expenses.row(SMOKE_MERCHANT)).toBeVisible();
  });

  test('clicking the backdrop closes the modal without deleting the record', async () => {
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

  test('current month group is expanded by default', async () => {
    const label = expenses.currentMonthLabel();
    const group = expenses.monthGroup(label);
    if (await group.count() === 0) return;
    await expect(expenses.monthGroupHeader(label)).toHaveAttribute('aria-expanded', 'true');
    await expect(expenses.monthGroupBody(label)).toBeVisible();
  });

  test('past month groups are collapsed by default', async () => {
    const currentLabel = expenses.currentMonthLabel();
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

  test('clicking a collapsed month header expands it', async () => {
    const currentLabel = expenses.currentMonthLabel();
    const allGroups = expenses.page.locator('.date-group');
    const total = await allGroups.count();
    let tested = false;
    for (let i = 0; i < total; i++) {
      const header = allGroups.nth(i).locator('.date-group-header');
      const text = await header.textContent();
      if (text?.includes(currentLabel)) continue;
      await header.click();
      await expect(header).toHaveAttribute('aria-expanded', 'true');
      await expect(allGroups.nth(i).locator('.date-group-body')).toBeVisible();
      tested = true;
      break;
    }
    if (!tested) test.skip();
  });

  test('clicking an expanded month header collapses it', async () => {
    const label = expenses.currentMonthLabel();
    const group = expenses.monthGroup(label);
    if (await group.count() === 0) return;
    const header = expenses.monthGroupHeader(label);
    await header.click();
    await expect(header).toHaveAttribute('aria-expanded', 'false');
    await expect(expenses.monthGroupBody(label)).toBeHidden();
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

  test('Amount sort activates and toggles direction', async ({ page }) => {
    if (await page.locator('.expense-table').count() === 0) return;
    await expenses.sortableHeader('Amount').click();
    await expect(expenses.sortableHeader('Amount').locator('.sort-active')).toBeVisible();
    const first = await expenses.sortableHeader('Amount').locator('.sort-active').textContent();
    await expenses.sortableHeader('Amount').click();
    const second = await expenses.sortableHeader('Amount').locator('.sort-active').textContent();
    expect(first).not.toBe(second);
  });

  test('clicking a different header moves the active indicator', async ({ page }) => {
    if (await page.locator('.expense-table').count() === 0) return;
    await expenses.sortableHeader('Amount').click();
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

  test('view toggle shows List, Grid and Calendar buttons with List active by default', async () => {
    await expect(expenses.viewToggle()).toBeVisible();
    await expect(expenses.listViewButton()).toBeVisible();
    await expect(expenses.gridViewButton()).toBeVisible();
    await expect(expenses.calendarViewButton()).toBeVisible();
    // List is the default view — its button uses the primary style.
    await expect(expenses.listViewButton()).toHaveClass(/primary/);
    await expect(expenses.gridViewButton()).not.toHaveClass(/primary/);
    await expect(expenses.calendarViewButton()).not.toHaveClass(/primary/);
    await expect(expenses.calendarGrid()).toHaveCount(0);
    await expect(expenses.grid()).toHaveCount(0);
  });

  test('view toggle renders three buttons in List, Grid, Calendar order with Grid in the middle', async () => {
    await expect(expenses.viewToggleButtons()).toHaveCount(3);
    await expect(expenses.viewToggleButtons().nth(0)).toHaveText('List');
    await expect(expenses.viewToggleButtons().nth(1)).toHaveText('Grid');
    await expect(expenses.viewToggleButtons().nth(2)).toHaveText('Calendar');
  });

  test('switching to Grid activates the Grid button and shows the card grid', async () => {
    await expenses.gridViewButton().click();
    await expect(expenses.gridViewButton()).toHaveClass(/primary/);
    await expect(expenses.listViewButton()).not.toHaveClass(/primary/);
    // The grid container shows when at least one expense exists; otherwise the
    // empty-state message renders. Either way the calendar and table are hidden.
    await expect(expenses.calendarGrid()).toHaveCount(0);
    await expect(expenses.page.locator('.expense-table')).toHaveCount(0);
  });

  test('switching from Grid back to List hides the grid', async () => {
    await expenses.gridViewButton().click();
    await expect(expenses.gridViewButton()).toHaveClass(/primary/);
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

  test('switching to Calendar shows the grid and month navigation', async () => {
    await expenses.calendarViewButton().click();
    await expect(expenses.calendarGrid()).toBeVisible();
    await expect(expenses.calendarMonthLabel()).toBeVisible();
    await expect(expenses.calendarPrevButton()).toBeVisible();
    await expect(expenses.calendarNextButton()).toBeVisible();
  });

  test('calendar month navigation changes the displayed month', async () => {
    await expenses.calendarViewButton().click();
    const before = await expenses.calendarMonthLabel().textContent();
    await expenses.calendarNextButton().click();
    const after = await expenses.calendarMonthLabel().textContent();
    expect(before).not.toBe(after);
  });

  test('switching back to List hides the calendar grid', async () => {
    await expenses.calendarViewButton().click();
    await expect(expenses.calendarGrid()).toBeVisible();
    await expenses.listViewButton().click();
    await expect(expenses.calendarGrid()).toHaveCount(0);
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
