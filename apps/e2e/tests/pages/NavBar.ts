import { expect, Locator, Page } from '@playwright/test';

export class NavBar {
  readonly toggle: Locator;
  readonly navLinks: Locator;

  constructor(private readonly page: Page) {
    this.toggle = page.getByRole('button', { name: 'Toggle navigation' });
    this.navLinks = page.locator('.nav-links');
  }

  nav(): Locator {
    return this.page.locator('nav.topnav');
  }

  link(name: string): Locator {
    return this.page.getByRole('navigation').getByRole('link', { name, exact: true });
  }

  brandLink(): Locator {
    return this.page.getByRole('link', { name: '💸 Expenses' });
  }

  footer(): Locator {
    return this.page.locator('footer.site-footer');
  }

  async openIfMobile(): Promise<void> {
    if (await this.toggle.isVisible()) {
      await this.toggle.click();
      await expect(this.navLinks).toHaveClass(/open/);
    }
  }

  async clickLink(name: string): Promise<void> {
    await this.openIfMobile();
    await this.link(name).click();
  }
}
