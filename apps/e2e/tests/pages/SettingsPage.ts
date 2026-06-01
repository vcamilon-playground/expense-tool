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

  saveProfileButton(): Locator {
    return this.page.getByRole('button', { name: /save profile/i });
  }

  firstNameInput(): Locator {
    return this.page.locator('.card').filter({ hasText: 'Profile' }).getByRole('textbox').first();
  }

  lastNameInput(): Locator {
    return this.page.locator('.card').filter({ hasText: 'Profile' }).getByRole('textbox').nth(1);
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
    return this.page.locator('.card').filter({ hasText: 'Categories' }).locator('.row').filter({ hasText: name });
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
