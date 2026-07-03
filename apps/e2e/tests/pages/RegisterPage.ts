import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/** Page object for the `/register` (create account) page. */
export class RegisterPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Navigate to the register page and wait for the initial load to settle. */
  async goto(): Promise<void> {
    await this.page.goto('/register');
    await this.waitForLoad();
  }

  /** The "Create account" heading. */
  heading(): Locator {
    return this.page.getByRole('heading', { name: /create account/i });
  }

  /** The First Name input. */
  firstNameInput(): Locator {
    return this.page.getByRole('textbox', { name: /first name/i });
  }

  /** The Last Name input. */
  lastNameInput(): Locator {
    return this.page.getByRole('textbox', { name: /last name/i });
  }

  /** The Username input. */
  usernameInput(): Locator {
    return this.page.getByRole('textbox', { name: /username/i });
  }

  /** The optional Email input. */
  emailInput(): Locator {
    return this.page.getByRole('textbox', { name: /email/i });
  }

  /** The "Create account" submit button. */
  createAccountButton(): Locator {
    return this.page.getByRole('button', { name: /create account/i });
  }

  /** The "sign in" link back to login. */
  signInLink(): Locator {
    return this.page.getByRole('link', { name: /sign in/i });
  }
}
