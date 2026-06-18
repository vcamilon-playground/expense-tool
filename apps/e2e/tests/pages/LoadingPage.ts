import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * The themed loading state shown at the `if (!user || loading)` guard on every
 * data page. Transient — only visible while the page's data request is in
 * flight, so tests must delay that request to observe it.
 */
export class LoadingPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Delay every Supabase data request so the loading state stays visible. */
  async delayDataRequests(ms: number): Promise<void> {
    await this.page.route('**/rest/v1/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      await route.continue();
    });
  }

  container(): Locator {
    return this.page.locator('.loading-screen');
  }

  status(): Locator {
    return this.page.getByRole('status', { name: 'Loading' });
  }

  spinner(): Locator {
    return this.page.locator('.loading-screen .spinner');
  }

  spinnerBars(): Locator {
    return this.page.locator('.loading-screen .spinner > div');
  }

  label(): Locator {
    return this.page.locator('.loading-label');
  }
}
