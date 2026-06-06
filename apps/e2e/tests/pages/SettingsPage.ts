import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class SettingsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/settings');
    await this.waitForLoad();
  }

  heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: 'Settings' });
  }

  // Profile section
  profileHeading(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Profile' });
  }

  // Located by label — the Profile card also contains an avatar "image URL"
  // textbox above the name fields, so positional (.first()/.nth()) selectors
  // would target the wrong input.
  firstNameInput(): Locator {
    return this.page.locator('label').filter({ hasText: 'First Name' }).locator('input');
  }

  lastNameInput(): Locator {
    return this.page.locator('label').filter({ hasText: 'Last Name' }).locator('input');
  }

  avatarUrlInput(): Locator {
    return this.page.locator('input[type="url"]');
  }

  // Global save / cancel (only visible when there are unsaved changes)
  unsavedBar(): Locator {
    return this.page.locator('.settings-save-bar');
  }

  saveChangesButton(): Locator {
    return this.page.locator('.settings-save-bar').getByRole('button', { name: /save changes/i });
  }

  cancelChangesButton(): Locator {
    return this.page.locator('.settings-save-bar').getByRole('button', { name: /^cancel$/i });
  }

  // Navigation guard modal
  navGuardModal(): Locator {
    return this.page.getByRole('dialog', { name: /unsaved changes/i });
  }

  navGuardLeaveButton(): Locator {
    return this.navGuardModal().getByRole('button', { name: /leave without saving/i });
  }

  navGuardStayButton(): Locator {
    return this.navGuardModal().getByRole('button', { name: /stay on page/i });
  }

  navGuardSaveLeaveButton(): Locator {
    return this.navGuardModal().getByRole('button', { name: /save and leave/i });
  }

  // Session expiry section
  sessionExpiryHeading(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Session Expiry' });
  }

  sessionTimeoutRadio(value: 'never' | '30' | '60' | '120'): Locator {
    return this.page.locator(`input[name="session-timeout"][value="${value}"]`);
  }

  // Password change section
  changePasswordHeading(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Change Password' });
  }

  updatePasswordButton(): Locator {
    return this.page.getByRole('button', { name: /update password/i });
  }

  // Theme section
  themeColorHeading(): Locator {
    return this.page.getByRole('heading', { level: 2, name: 'Theme Color' });
  }

  colorSwatch(label: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`${label} theme`, 'i') });
  }

  lightModeNote(): Locator {
    return this.page.getByText(/light mode only/i).first();
  }

  darkModeBanner(): Locator {
    return this.page.locator('.banner.banner-warn');
  }

  pastEditToggle(): Locator {
    return this.page.getByRole('checkbox', { name: /Allow editing of past expenses/i });
  }

  pastEditEnabledNote(): Locator {
    return this.page.getByText(/All expenses are now editable/i);
  }

  categoriesHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Categories' });
  }

  categoryRow(name: string): Locator {
    return this.page.locator('.card').filter({ hasText: 'Categories' }).locator('.cat-chip').filter({ hasText: name });
  }

  categoryDeleteButton(name: string): Locator {
    return this.categoryRow(name).getByRole('button', { name: 'Delete' });
  }

  addCategoryNameInput(): Locator {
    return this.page.locator('.card').filter({ hasText: 'Categories' }).locator('input').first();
  }

  addCategoryIconInput(): Locator {
    return this.page.locator('.card').filter({ hasText: 'Categories' }).locator('input').nth(1);
  }

  addCategoryButton(): Locator {
    return this.page.getByRole('button', { name: '+ Add Category' });
  }

  categoryErrorBanner(): Locator {
    return this.page.locator('.card').filter({ hasText: 'Categories' }).locator('.banner-danger');
  }
}
