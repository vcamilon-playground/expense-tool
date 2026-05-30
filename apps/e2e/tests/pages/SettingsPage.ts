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
}
