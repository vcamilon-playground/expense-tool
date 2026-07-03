import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/** Page object for the public `/forgot-password` request form. */
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

  /** Navigate to the forgot-password page and wait for the initial load to settle. */
  async goto(): Promise<void> {
    await this.page.goto('/forgot-password');
    await this.waitForLoad();
  }

  /**
   * Fill the email field and submit the reset request.
   * @param email - the email address to request a reset link for
   */
  async request(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }

  /** The page's `<h1>` "Reset password" heading. */
  heading(): Locator {
    return this.page.getByRole('heading', { name: /reset password/i });
  }

  /** The "Back to sign in" link. */
  backToSignInLink(): Locator {
    return this.page.getByRole('link', { name: /back to sign in/i });
  }
}
