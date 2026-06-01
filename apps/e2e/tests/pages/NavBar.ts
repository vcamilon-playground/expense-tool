import { expect, Locator, Page } from '@playwright/test';

export class NavBar {
  readonly toggle: Locator;
  readonly navLinks: Locator;

  constructor(private readonly page: Page) {
    this.toggle = page.getByRole('button', { name: 'Toggle navigation' });
    this.navLinks = page.locator('.nav-links');
  }

  nav(): Locator {
    return this.page.locator('nav.sidenav');
  }

  link(name: string): Locator {
    return this.page.getByRole('navigation').getByRole('link', { name, exact: true });
  }

  brandLink(): Locator {
    return this.page.getByRole('link', { name: /💸 Expenses/ });
  }

  collapseButton(): Locator {
    return this.page.getByRole('button', { name: /Collapse sidebar/i });
  }

  expandButton(): Locator {
    return this.page.getByRole('button', { name: /Expand sidebar/i });
  }

  navLabel(name: string): Locator {
    return this.page.locator('.nav-label').filter({ hasText: name });
  }

  brandText(): Locator {
    return this.page.locator('.brand-text');
  }

  themeToggle(): Locator {
    return this.page.locator('nav.sidenav button[title*="Switch to"]');
  }

  // Profile menu trigger (the clickable user avatar block)
  settingsLink(): Locator {
    return this.page.locator('nav.sidenav .nav-user');
  }

  profileMenu(): Locator {
    return this.page.locator('.nav-profile-menu');
  }

  settingsMenuItem(): Locator {
    return this.page.locator('.nav-profile-menu').getByRole('menuitem', { name: /settings/i });
  }

  logoutButton(): Locator {
    return this.page.locator('.nav-profile-menu').getByRole('menuitem', { name: /log out/i });
  }

  switchUserButton(): Locator {
    return this.page.locator('.nav-profile-menu').getByRole('menuitem', { name: /switch user/i });
  }

  logoutModal(): Locator {
    return this.page.getByRole('dialog', { name: /confirm logout/i });
  }

  switchUserModal(): Locator {
    return this.page.getByRole('dialog', { name: /confirm switch user/i });
  }

  userInfo(): Locator {
    return this.page.locator('.nav-user');
  }

  async openProfileMenu(): Promise<void> {
    await this.userInfo().click();
    await expect(this.profileMenu()).toBeVisible();
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
