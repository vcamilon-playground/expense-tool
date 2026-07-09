import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/** Page object for the site footer and its About / Contact dialogs. */
export class FooterPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** The site footer element. */
  footer(): Locator {
    return this.page.getByTestId('site-footer');
  }

  /** The footer's "About" button. */
  aboutButton(): Locator {
    return this.footer().getByRole('button', { name: 'About' });
  }

  /** The footer's "Contact" button. */
  contactButton(): Locator {
    return this.footer().getByRole('button', { name: 'Contact' });
  }

  /** The footer copyright line. */
  copyright(): Locator {
    return this.footer().getByText(/© \d{4} Vegil Camilon/);
  }

  /** The About/Contact dialog. */
  dialog(): Locator {
    return this.page.getByRole('dialog');
  }

  /**
   * The dialog's heading by title.
   * @param title - the dialog title
   */
  dialogTitle(title: string): Locator {
    return this.dialog().getByRole('heading', { name: title });
  }

  /** The dialog's header bar. */
  modalHeader(): Locator {
    return this.dialog().getByTestId('form-modal-header');
  }

  /** The dialog header's title text. */
  modalHeaderTitle(): Locator {
    return this.modalHeader().locator('h3');
  }

  /** The app version line in the About dialog. */
  versionLine(): Locator {
    return this.dialog().getByTestId('footer-version');
  }

  /** The email link in the Contact dialog. */
  emailLink(): Locator {
    return this.dialog().getByRole('link', { name: /@/ });
  }

  /** The phone (tel:) link in the Contact dialog. */
  phoneLink(): Locator {
    return this.dialog().locator('a[href^="tel:"]');
  }

  /** The dialog header's Close (X) button. */
  headerCloseButton(): Locator {
    return this.modalHeader().getByRole('button', { name: 'Close' });
  }

  /** The dialog's footer "Close" button. */
  closeButton(): Locator {
    return this.dialog().locator('.row').getByRole('button', { name: 'Close', exact: true });
  }

  /** The About dialog's descriptive blurb. */
  aboutBlurb(): Locator {
    return this.dialog().locator('.muted');
  }

  /** Open the About dialog. */
  async openAbout(): Promise<void> {
    await this.aboutButton().click();
  }

  /** Open the Contact dialog. */
  async openContact(): Promise<void> {
    await this.contactButton().click();
  }
}
