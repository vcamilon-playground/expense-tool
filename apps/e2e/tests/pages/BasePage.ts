import { expect, Page } from '@playwright/test';

export class BasePage {
  constructor(readonly page: Page) {}

  protected async waitForLoad(): Promise<void> {
    await expect(this.page.getByText('Loading…')).toBeHidden({ timeout: 15_000 });
  }
}
