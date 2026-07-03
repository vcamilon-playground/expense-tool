import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/** Page object for the `/login` page. */
export class LoginPage extends BasePage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorBanner: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.getByRole('textbox', { name: /username/i });
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.getByRole('button', { name: /sign in/i });
    this.errorBanner = page.locator('[role="alert"]');
  }

  /** Navigate to the login page and wait for the initial load to settle. */
  async goto(): Promise<void> {
    await this.page.goto('/login');
    await this.waitForLoad();
  }

  /**
   * Fill the credentials and submit the login form.
   * @param username - the username or email
   * @param password - the password
   */
  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /** The "Expense Tool" heading. */
  heading(): Locator {
    return this.page.getByRole('heading', { name: /expense tool/i });
  }

  /** The "create one" (register) link. */
  registerLink(): Locator {
    return this.page.getByRole('link', { name: /create one/i });
  }

  /** The "forgot your password" link. */
  forgotPasswordLink(): Locator {
    return this.page.getByRole('link', { name: /forgot your password/i });
  }
}
