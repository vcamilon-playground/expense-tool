import { expect, Locator, Page } from '@playwright/test';

/**
 * Navigation model for the redesigned shell:
 * - Desktop: a fixed left sidebar (`nav.sidenav`, aria-label "Sidebar navigation")
 *   with a profile card at the top, nav links, and Switch User / Log Out buttons
 *   at the bottom. Settings is a direct nav link (no popup on desktop).
 * - Mobile (≤640px): the sidebar is hidden; a fixed bottom tab bar
 *   (`nav.bottom-nav`, aria-label "Mobile navigation") is shown. The profile
 *   popup is opened by tapping the avatar in the site header.
 */
export class NavBar {
  constructor(private readonly page: Page) {}

  // ── Desktop sidebar ──────────────────────────────────────────────────────
  nav(): Locator {
    return this.page.locator('nav.sidenav');
  }

  sidebarNav(): Locator {
    return this.page.getByRole('navigation', { name: 'Sidebar navigation' });
  }

  /** Sidebar nav link by its visible label (Home, Income, Expenses, …, Settings). */
  link(name: string): Locator {
    return this.sidebarNav().getByRole('link', { name, exact: true });
  }

  navLabel(name: string): Locator {
    return this.page.locator('.nav-label').filter({ hasText: name });
  }

  // Profile card at the top of the sidebar
  profileCard(): Locator {
    return this.page.locator('.sidebar-profile');
  }

  userName(): Locator {
    return this.page.locator('.sidebar-user-name');
  }

  userHandle(): Locator {
    return this.page.locator('.sidebar-user-handle');
  }

  // Direct actions at the bottom of the sidebar (desktop)
  sidebarSwitchUserButton(): Locator {
    return this.nav().locator('.sidebar-action-btn', { hasText: 'Switch User' });
  }

  sidebarLogoutButton(): Locator {
    return this.nav().locator('.sidebar-action-btn.sidebar-logout');
  }

  // ── Mobile bottom tab bar ────────────────────────────────────────────────
  bottomNav(): Locator {
    return this.page.locator('nav.bottom-nav');
  }

  /** Bottom tab by its visible label (Home, Income, Expenses, Budgets, Recurring, Reports). */
  bottomTab(name: string): Locator {
    return this.bottomNav().locator('.bottom-nav-tab').filter({ hasText: name });
  }

  // ── Profile popup (opened by the site-header avatar on mobile) ────────────
  headerAvatar(): Locator {
    return this.page.locator('.header-avatar');
  }

  profileMenu(): Locator {
    return this.page.locator('.nav-profile-menu');
  }

  settingsMenuItem(): Locator {
    return this.profileMenu().getByRole('menuitem', { name: /settings/i });
  }

  switchUserMenuItem(): Locator {
    return this.profileMenu().getByRole('menuitem', { name: /switch user/i });
  }

  logoutMenuItem(): Locator {
    return this.profileMenu().getByRole('menuitem', { name: /log out/i });
  }

  /** Mobile only: tap the header avatar to open the profile popup. */
  async openMobileProfileMenu(): Promise<void> {
    await this.headerAvatar().click();
    await expect(this.profileMenu()).toBeVisible();
  }

  // ── Confirmation modals (shared desktop + mobile) ─────────────────────────
  logoutModal(): Locator {
    return this.page.getByRole('dialog', { name: /confirm logout/i });
  }

  switchUserModal(): Locator {
    return this.page.getByRole('dialog', { name: /confirm switch user/i });
  }

  // ── Site header (greeting, theme pill, notification bell) ─────────────────
  greeting(): Locator {
    return this.page.locator('.site-welcome');
  }

  themePill(): Locator {
    return this.page.locator('.theme-toggle-pill');
  }

  themePillButton(mode: 'light' | 'dark'): Locator {
    return this.themePill().getByRole('button', { name: mode === 'light' ? 'Light mode' : 'Dark mode' });
  }

  notifBell(): Locator {
    return this.page.locator('.site-notif-btn');
  }

  notifBadge(): Locator {
    return this.page.locator('.notif-badge');
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  footer(): Locator {
    return this.page.locator('footer.site-footer');
  }

  /** Navigate by visible label: desktop uses the sidebar link, mobile the bottom tab. */
  async clickLink(name: string): Promise<void> {
    if (await this.bottomNav().isVisible()) {
      await this.bottomTab(name).click();
    } else {
      await this.link(name).click();
    }
  }
}
