import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorBanner: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.getByRole('textbox', { name: /username/i });
    this.passwordInput = page.locator('input[type="password"]').first();
    this.submitButton = page.getByRole('button', { name: /sign in/i });
    this.errorBanner = page.locator('[role="alert"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await this.waitForLoad();
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  heading(): Locator {
    return this.page.getByRole('heading', { name: /expense tool/i });
  }

  registerLink(): Locator {
    return this.page.getByRole('link', { name: /create one/i });
  }

  forgotPasswordLink(): Locator {
    return this.page.getByRole('link', { name: /forgot your password/i });
  }
}
