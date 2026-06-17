import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class FooterPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  footer(): Locator {
    return this.page.locator('footer.site-footer');
  }

  aboutButton(): Locator {
    return this.footer().getByRole('button', { name: 'About' });
  }

  contactButton(): Locator {
    return this.footer().getByRole('button', { name: 'Contact' });
  }

  copyright(): Locator {
    return this.footer().getByText(/© \d{4} Vegil Camilon/);
  }

  dialog(): Locator {
    return this.page.getByRole('dialog');
  }

  dialogTitle(title: string): Locator {
    return this.dialog().getByRole('heading', { name: title });
  }

  modalHeader(): Locator {
    return this.dialog().locator('.modal-header');
  }

  modalHeaderTitle(): Locator {
    return this.modalHeader().locator('h3');
  }

  versionLine(): Locator {
    return this.dialog().locator('.footer-version');
  }

  emailLink(): Locator {
    return this.dialog().getByRole('link', { name: /@/ });
  }

  phoneLink(): Locator {
    return this.dialog().locator('a[href^="tel:"]');
  }

  closeButton(): Locator {
    return this.dialog().getByRole('button', { name: 'Close' });
  }

  async openAbout(): Promise<void> {
    await this.aboutButton().click();
  }

  async openContact(): Promise<void> {
    await this.contactButton().click();
  }
}
