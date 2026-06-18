import { test, expect } from '@playwright/test';
import { LoadingPage } from './pages/LoadingPage';

test.describe('Themed loading spinner', () => {
  test('shows the themed spinner with 12 bars while data loads', async ({ page }) => {
    const loading = new LoadingPage(page);

    // Hold the Supabase data request open so the transient loading state stays
    // on screen long enough to assert against.
    await loading.delayDataRequests(2000);

    // Navigate without waiting for the load to settle.
    await page.goto('/', { waitUntil: 'commit' });

    await expect(loading.container()).toBeVisible();
    await expect(loading.status()).toBeVisible();
    await expect(loading.spinner()).toBeVisible();
    await expect(loading.spinnerBars()).toHaveCount(12);
    await expect(loading.label()).toHaveText('Loading');
  });
});
