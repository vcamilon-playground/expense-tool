import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/** Page object for the public `/reset-password?token=…` form. */
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

  /**
   * Navigate to the reset-password page and wait for the initial load to settle.
   * @param token - optional reset token to include as the `token` query param
   */
  async goto(token?: string): Promise<void> {
    await this.page.goto(token ? `/reset-password?token=${token}` : '/reset-password');
    await this.waitForLoad();
  }

  /** The "New password" input (matched by its unique placeholder). */
  passwordInput(): Locator {
    return this.page.getByPlaceholder('At least 8 characters');
  }

  /** The "Confirm new password" input (matched by its unique placeholder). */
  confirmInput(): Locator {
    return this.page.getByPlaceholder('Re-enter your password');
  }

  /** The "Reset password" submit button. */
  submitButton(): Locator {
    return this.page.getByRole('button', { name: /reset password/i });
  }

  /**
   * Fill both password fields and submit.
   * @param password - the new password
   * @param confirm - the confirmation value
   */
  async submit(password: string, confirm: string): Promise<void> {
    await this.passwordInput().fill(password);
    await this.confirmInput().fill(confirm);
    await this.submitButton().click();
  }
}
