import { test, expect, Page } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoadingPage } from './pages/LoadingPage';

/**
 * Coverage for the InlineSpinner (`.btn-spinner`) visual-polish change: while a
 * button's request is in flight the spinner renders inside the still-disabled
 * button, and it disappears once the request resolves. Also covers the
 * reduced-motion timing for both the inline spinner (~1.6s) and the themed
 * loading spinner's bars (~2.4s).
 *
 * The spinner is `aria-hidden` decorative markup with no role/text, so it is
 * located by its `.btn-spinner` class scoped inside the owning button (see
 * TEST_AUTOMATION_STANDARDS.md §3 — a class is acceptable for a brand-new
 * decorative element with no semantic hook).
 */

/**
 * Intercept a route and hold every matching request open until the returned
 * release callback is invoked, then answer with the given failure response.
 * Lets a test observe the transient in-flight button state deterministically.
 * @param page - the page whose network to intercept
 * @param url - the route glob to hold (e.g. an API endpoint)
 * @param response - the response to fulfil with once released
 * @returns a callback that releases the held request
 */
async function holdRoute(
  page: Page,
  url: string,
  response: { status: number; body: unknown },
): Promise<() => void> {
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(url, async (route) => {
    await released;
    await route.fulfill({
      status: response.status,
      contentType: 'application/json',
      body: JSON.stringify(response.body),
    });
  });
  return release;
}

test.describe('Inline spinner — public auth buttons', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login button shows the inline spinner while the request is in flight, then clears it', async ({
    page,
  }) => {
    const login = new LoginPage(page);
    await login.goto();
    const release = await holdRoute(page, '**/api/auth/login', {
      status: 401,
      body: { error: 'Invalid credentials' },
    });

    await login.login('e2e-user', 'wrong-pass');

    await expect(login.submitSpinner(), 'spinner should appear inside the Signing in… button').toBeVisible();
    await expect(login.submitButton, 'submit button stays disabled while in flight').toBeDisabled();

    release();
    await expect(login.submitSpinner(), 'spinner should clear once the request resolves').toBeHidden();
  });

  test('register button shows the inline spinner while the request is in flight, then clears it', async ({
    page,
  }) => {
    const register = new RegisterPage(page);
    await register.goto();
    const release = await holdRoute(page, '**/api/auth/register', {
      status: 400,
      body: { error: 'Username taken' },
    });

    await register.register({
      firstName: 'E2E',
      lastName: 'Spinner',
      username: `e2e-spinner-${Date.now()}`,
      password: 'Password123',
    });

    await expect(register.createAccountSpinner(), 'spinner should appear inside the Creating account… button').toBeVisible();
    await expect(register.createAccountButton(), 'submit button stays disabled while in flight').toBeDisabled();

    release();
    await expect(register.createAccountSpinner(), 'spinner should clear once the request resolves').toBeHidden();
  });

  test('forgot-password button shows the inline spinner while the request is in flight, then clears it', async ({
    page,
  }) => {
    const forgot = new ForgotPasswordPage(page);
    await forgot.goto();
    const release = await holdRoute(page, '**/api/auth/forgot-password', {
      status: 200,
      body: { ok: true },
    });

    await forgot.request('camilonvegil@gmail.com');

    await expect(forgot.submitSpinner(), 'spinner should appear inside the Sending… button').toBeVisible();
    await expect(forgot.submitButton, 'submit button stays disabled while in flight').toBeDisabled();

    release();
    await expect(forgot.submitSpinner(), 'spinner should clear once the request resolves').toBeHidden();
  });

  test('reset-password button shows the inline spinner while the request is in flight, then clears it', async ({
    page,
  }) => {
    const reset = new ResetPasswordPage(page);
    await reset.goto('dummy-token');
    const release = await holdRoute(page, '**/api/auth/reset-password', {
      status: 400,
      body: { error: 'Invalid or expired token' },
    });

    await reset.submit('Password123', 'Password123');

    await expect(reset.submitSpinner(), 'spinner should appear inside the Resetting… button').toBeVisible();
    await expect(reset.submitButton(), 'submit button stays disabled while in flight').toBeDisabled();

    release();
    await expect(reset.submitSpinner(), 'spinner should clear once the request resolves').toBeHidden();
  });
});

test.describe('Inline spinner — dashboard AI insight', () => {
  test('Generate shows the inline spinner inside a disabled "Thinking…" button while the insight loads', async ({
    page,
  }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    const release = await holdRoute(page, '**/api/insights', {
      status: 500,
      body: { error: 'nope' },
    });

    await expect(dashboard.insightButton()).toBeVisible();
    await dashboard.insightButton().click();

    // Do NOT assert the AI text — only the transient in-flight button state.
    await expect(dashboard.insightSpinner(), 'spinner should appear inside the Thinking… button').toBeVisible();
    await expect(dashboard.insightButton(), 'insight button stays disabled while in flight').toBeDisabled();

    release();
    await expect(dashboard.insightSpinner(), 'spinner should clear once the request resolves').toBeHidden();
  });
});

test.describe('Inline spinner — reduced motion (button spinner)', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' }, storageState: { cookies: [], origins: [] } });

  test('inline button spinner slows to ~1.6s under reduced motion (not removed)', async ({ page }) => {
    // Hold the login request open so the .btn-spinner stays mounted to read its timing.
    const login = new LoginPage(page);
    await login.goto();
    const release = await holdRoute(page, '**/api/auth/login', {
      status: 401,
      body: { error: 'Invalid credentials' },
    });
    await login.login('e2e-user', 'wrong-pass');
    await expect(login.submitSpinner()).toBeVisible();

    const duration = await login.submitSpinner().evaluate((el) => window.getComputedStyle(el).animationDuration);
    expect(duration, 'reduced-motion .btn-spinner should slow, not stop').toBe('1.6s');

    release();
  });
});

test.describe('Inline spinner — reduced motion (themed spinner)', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('themed loading spinner bars slow to ~2.4s under reduced motion (not removed)', async ({ page }) => {
    const loading = new LoadingPage(page);
    // Hold the data request open so the home page's themed <LoadingScreen> guard
    // stays on screen (reliable in dev; the reset-password Suspense fallback only
    // renders in a production static build, so it can't be used here).
    await loading.delayDataRequests(3000);
    await page.goto('/', { waitUntil: 'commit' });
    await expect(loading.spinner()).toBeVisible();

    // Read a bar's duration inside a single evaluate (all 12 bars share it) to
    // avoid an index-based locator.
    const duration = await loading.spinner().evaluate((el) => {
      const bar = el.querySelector('div');
      return bar ? window.getComputedStyle(bar).animationDuration : '';
    });
    expect(duration, 'reduced-motion .spinner div should slow, not stop').toBe('2.4s');
  });
});
