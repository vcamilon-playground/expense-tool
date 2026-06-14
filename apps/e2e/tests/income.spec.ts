import { test, expect } from '@playwright/test';
import { IncomePage } from './pages/IncomePage';

test.describe('Income page', () => {
  let income!: IncomePage;

  test.beforeEach(async ({ page }) => {
    income = new IncomePage(page);
    await income.goto();
  });

  test('page renders heading, add button, and four summary cards', async () => {
    await expect(income.heading()).toHaveText('Income');
    await expect(income.addSourceButton()).toBeVisible();
    for (const label of ['Bank Total', 'E-Wallet Total', 'Cash on Hand', 'Grand Total']) {
      await expect(income.summaryCard(label)).toBeVisible();
    }
  });

  test('amounts are hidden by default and the eye toggle reveals them', async () => {
    // Default: hidden — summary values show the mask.
    await expect(income.summaryValue('Grand Total')).toHaveText('••••••');
    await expect(income.privacyToggle()).toHaveAttribute('aria-label', 'Show amounts');

    // Reveal — values become a formatted peso amount.
    await income.privacyToggle().click();
    await expect(income.summaryValue('Grand Total')).toContainText('₱');
    await expect(income.privacyToggle()).toHaveAttribute('aria-label', 'Hide amounts');

    // Hide again.
    await income.privacyToggle().click();
    await expect(income.summaryValue('Grand Total')).toHaveText('••••••');
  });

  test('each summary card has its own eye that reveals only that card', async () => {
    // Four per-card eyes; everything masked by default.
    await expect(income.summaryCardEye('Bank Total')).toHaveCount(1);
    await expect(income.summaryValue('Bank Total')).toContainText('••••••');
    await expect(income.summaryValue('Grand Total')).toContainText('••••••');

    // Revealing one card does not reveal the others.
    await income.summaryCardEye('Bank Total').click();
    await expect(income.summaryValue('Bank Total')).toContainText('₱');
    await expect(income.summaryValue('Grand Total')).toContainText('••••••');
  });

  test('Add Source modal opens with type, name, balance fields and capitalised type options', async () => {
    await income.openAddModal();
    await expect(income.typeSelect()).toBeVisible();
    await expect(income.nameInput()).toBeVisible();
    await expect(income.balanceInput()).toBeVisible();
    await expect(income.submitButton()).toHaveText('Add');
    const options = await income.typeSelect().locator('option').allTextContents();
    expect(options).toContain('Bank');
    expect(options).toContain('E-Wallet');
    expect(options).toContain('Cash on Hand');
  });

  test('selecting Cash on Hand hides the name field', async () => {
    await income.openAddModal();
    await expect(income.nameInput()).toBeVisible();
    await income.typeSelect().selectOption('cash');
    await expect(income.nameInput()).toBeHidden();
  });

  test('empty required fields show inline errors', async () => {
    await income.openAddModal();
    await income.typeSelect().selectOption('bank');
    await income.dialog().getByRole('button', { name: 'Add' }).click();
    // Name and balance are both required for a bank source.
    await expect(income.fieldError().first()).toBeVisible();
  });
});
