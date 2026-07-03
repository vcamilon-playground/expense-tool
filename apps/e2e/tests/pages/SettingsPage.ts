import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/** Page object for the `/settings` page: profile, session expiry, password change, theme, past-edit, and categories. */
export class SettingsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Navigate to the settings page and wait for the initial load to settle. */
  async goto(): Promise<void> {
    await this.page.goto('/settings');
    await this.waitForLoad();
  }

  /** The `<h1>` "Settings" page heading. */
  heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: 'Settings' });
  }

  // ── Profile section ──

  /** The `<h2>` "Profile" section heading. */
  profileHeading(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Profile' });
  }

  /**
   * The First Name input. Located by label — the Profile card also contains an
   * avatar "image URL" textbox above the name fields, so positional selectors
   * would target the wrong input.
   */
  firstNameInput(): Locator {
    return this.page.locator('label').filter({ hasText: 'First Name' }).locator('input');
  }

  /** The Last Name input (located by label, see {@link firstNameInput}). */
  lastNameInput(): Locator {
    return this.page.locator('label').filter({ hasText: 'Last Name' }).locator('input');
  }

  /** The avatar image-URL input. */
  avatarUrlInput(): Locator {
    return this.page.locator('input[type="url"]');
  }

  // ── Global save / cancel (only visible when there are unsaved changes) ──

  /** The unsaved-changes save bar. */
  unsavedBar(): Locator {
    return this.page.locator('.settings-save-bar');
  }

  /** The "Save changes" button in the unsaved bar. */
  saveChangesButton(): Locator {
    return this.page.locator('.settings-save-bar').getByRole('button', { name: /save changes/i });
  }

  /**
   * The "Settings saved successfully." confirmation. It appears only once the save
   * has fully completed (DB write + localStorage write-through), so it is the
   * reliable "save done" signal — the unsaved bar hides slightly earlier.
   */
  savedBanner(): Locator {
    return this.page.getByText('Settings saved successfully.');
  }

  /** Click Save and wait for the success confirmation (state fully persisted). */
  async saveAndWaitForSaved(): Promise<void> {
    await this.saveChangesButton().click();
    await expect(this.savedBanner()).toBeVisible();
  }

  /** The "Cancel" button in the unsaved bar. */
  cancelChangesButton(): Locator {
    return this.page.locator('.settings-save-bar').getByRole('button', { name: /^cancel$/i });
  }

  // ── Navigation guard modal ──

  /** The "unsaved changes" navigation-guard dialog. */
  navGuardModal(): Locator {
    return this.page.getByRole('dialog', { name: /unsaved changes/i });
  }

  /** The guard's "Leave without saving" button. */
  navGuardLeaveButton(): Locator {
    return this.navGuardModal().getByRole('button', { name: /leave without saving/i });
  }

  /** The guard's "Stay on page" button. */
  navGuardStayButton(): Locator {
    return this.navGuardModal().getByRole('button', { name: /stay on page/i });
  }

  /** The guard's "Save and leave" button. */
  navGuardSaveLeaveButton(): Locator {
    return this.navGuardModal().getByRole('button', { name: /save and leave/i });
  }

  // ── Session expiry section ──

  /** The `<h2>` "Session Expiry" section heading. */
  sessionExpiryHeading(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Session Expiry' });
  }

  /**
   * A session-timeout radio by value.
   * @param value - the timeout value ('never' | '30' | '60' | '120')
   */
  sessionTimeoutRadio(value: 'never' | '30' | '60' | '120'): Locator {
    return this.page.locator(`input[name="session-timeout"][value="${value}"]`);
  }

  // ── Password change section ──

  /** The `<h2>` "Change Password" section heading. */
  changePasswordHeading(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Change Password' });
  }

  /** The Change Password card. */
  passwordCard(): Locator {
    return this.page.locator('.card').filter({ hasText: 'Change Password' });
  }

  /** The Current Password input (unique `autocomplete="current-password"`). */
  currentPasswordInput(): Locator {
    return this.passwordCard().locator('input[autocomplete="current-password"]');
  }

  /**
   * The New Password input. Positional (`.first()` of the two `new-password`
   * inputs) — New and Confirm share the same autocomplete hint.
   */
  newPasswordInput(): Locator {
    return this.passwordCard().locator('input[autocomplete="new-password"]').first();
  }

  /** The Confirm New Password input (the 2nd `new-password` input; see {@link newPasswordInput}). */
  confirmPasswordInput(): Locator {
    return this.passwordCard().locator('input[autocomplete="new-password"]').nth(1);
  }

  /** The "Update password" button. */
  updatePasswordButton(): Locator {
    return this.page.getByRole('button', { name: /update password/i });
  }

  // ── Theme section ──

  /** The `<h2>` "Theme Color" section heading. */
  themeColorHeading(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Theme Color' });
  }

  /**
   * A theme colour swatch button by label.
   * @param label - the colour name
   */
  colorSwatch(label: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`${label} theme`, 'i') });
  }

  /** The "light mode only" note (first match). */
  lightModeNote(): Locator {
    return this.page.getByText(/light mode only/i).first();
  }

  /** The dark-mode warning banner. */
  darkModeBanner(): Locator {
    return this.page.locator('.banner.banner-warn');
  }

  // ── Expense editing section ──

  /** The `<h2>` "Expense Editing" section heading. */
  expenseEditingHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Expense Editing' });
  }

  /** The "Allow editing of past expenses" toggle. */
  pastEditToggle(): Locator {
    return this.page.getByRole('checkbox', { name: /Allow editing of past expenses/i });
  }

  /** The note shown when past-edit is enabled. */
  pastEditEnabledNote(): Locator {
    return this.page.getByText(/All expenses are now editable/i);
  }

  // ── Categories section ──

  /** The `<h2>` "Categories" section heading. */
  categoriesHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Categories' });
  }

  /** The Categories card. */
  categoriesCard(): Locator {
    return this.page.locator('.card').filter({ hasText: 'Categories' });
  }

  /** All category chips in the Categories card. */
  categoryChips(): Locator {
    return this.categoriesCard().locator('.cat-chip');
  }

  /**
   * A category chip by name.
   * @param name - the category name
   */
  categoryRow(name: string): Locator {
    return this.categoriesCard().locator('.cat-chip').filter({ hasText: name });
  }

  /**
   * The Delete button on a category chip.
   * @param name - the category name
   */
  categoryDeleteButton(name: string): Locator {
    return this.categoryRow(name).getByRole('button', { name: 'Delete' });
  }

  /** The new-category name input (matched by its placeholder). */
  addCategoryNameInput(): Locator {
    return this.categoriesCard().getByPlaceholder('e.g. Hobbies');
  }

  /**
   * The new-category icon input. Positional (`.nth(1)`) — the icon input's
   * placeholder is a dynamic default emoji with no stable text hook.
   */
  addCategoryIconInput(): Locator {
    return this.categoriesCard().locator('input').nth(1);
  }

  /** The "+ Add Category" button. */
  addCategoryButton(): Locator {
    return this.page.getByRole('button', { name: '+ Add Category' });
  }

  /** The category error banner in the Categories card. */
  categoryErrorBanner(): Locator {
    return this.categoriesCard().locator('.banner-danger');
  }

  // ── Shared delete-confirmation dialog ──

  /** The "Are you really sure" delete-confirmation dialog. */
  deleteDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'Are you really sure' });
  }

  /** The delete dialog's "Yes, remove" button. */
  deleteYesButton(): Locator {
    return this.deleteDialog().getByRole('button', { name: 'Yes, remove' });
  }
}
