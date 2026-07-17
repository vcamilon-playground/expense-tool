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

  /** The Password input (matched by its unique placeholder). */
  passwordInput(): Locator {
    return this.page.getByPlaceholder('At least 8 characters');
  }

  /** The Confirm Password input (matched by its unique placeholder). */
  confirmPasswordInput(): Locator {
    return this.page.getByPlaceholder('Re-enter your password');
  }

  /**
   * The "Create account" submit button. Located by type, not name — while
   * submitting the label becomes "Creating account…".
   */
  createAccountButton(): Locator {
    return this.page.locator('button[type="submit"]');
  }

  /**
   * The inline `.btn-spinner` shown inside the submit button while creating an account.
   * Anchored on `button[type="submit"]` (the name becomes "Creating account…" while loading).
   */
  createAccountSpinner(): Locator {
    return this.page.locator('button[type="submit"] .btn-spinner');
  }

  /** The "sign in" link back to login. */
  signInLink(): Locator {
    return this.page.getByRole('link', { name: /sign in/i });
  }

  /**
   * Fill every required registration field with valid values and submit.
   * @param details - the account details to register with
   */
  async register(details: {
    firstName: string;
    lastName: string;
    username: string;
    password: string;
  }): Promise<void> {
    await this.firstNameInput().fill(details.firstName);
    await this.lastNameInput().fill(details.lastName);
    await this.usernameInput().fill(details.username);
    await this.passwordInput().fill(details.password);
    await this.confirmPasswordInput().fill(details.password);
    await this.createAccountButton().click();
  }
}
