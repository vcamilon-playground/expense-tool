import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ForgotPasswordPage extends BasePage {
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly successBanner: Locator;
  readonly errorBanner: Locator;
  readonly fieldError: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByRole('textbox', { name: /email/i });
    this.submitButton = page.getByRole('button', { name: /send reset link/i });
    this.successBanner = page.locator('.banner-success');
    this.errorBanner = page.locator('.banner-danger');
    this.fieldError = page.locator('.field-error');
  }

  async goto(): Promise<void> {
    await this.page.goto('/forgot-password');
    await this.waitForLoad();
  }

  async request(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }

  heading(): Locator {
    return this.page.getByRole('heading', { name: /reset password/i });
  }

  backToSignInLink(): Locator {
    return this.page.getByRole('link', { name: /back to sign in/i });
  }
}

export class ResetPasswordPage extends BasePage {
  readonly errorBanner: Locator;
  readonly successBanner: Locator;
  readonly fieldError: Locator;

  constructor(page: Page) {
    super(page);
    this.errorBanner = page.locator('.banner-danger');
    this.successBanner = page.locator('.banner-success');
    this.fieldError = page.locator('.field-error');
  }

  async goto(token?: string): Promise<void> {
    await this.page.goto(token ? `/reset-password?token=${token}` : '/reset-password');
    await this.waitForLoad();
  }

  passwordInput(): Locator {
    return this.page.locator('input[type="password"]').first();
  }

  confirmInput(): Locator {
    return this.page.locator('input[type="password"]').nth(1);
  }

  submitButton(): Locator {
    return this.page.getByRole('button', { name: /reset password/i });
  }

  async submit(password: string, confirm: string): Promise<void> {
    await this.passwordInput().fill(password);
    await this.confirmInput().fill(confirm);
    await this.submitButton().click();
  }
}
