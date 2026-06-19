import { expect, Page } from '@playwright/test';

export class BasePage {
  constructor(readonly page: Page) {}

  protected async waitForLoad(): Promise<void> {
    // The data-page guard renders <LoadingScreen> (role="status", label "Loading")
    // while its initial request is in flight. Wait for it to clear so callers
    // don't observe the initial fetch as if it were a later refetch.
    await expect(this.page.locator('.loading-screen')).toBeHidden({ timeout: 15_000 });
  }
}
