import { chromium, type FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Use || not ?? so that empty strings from unset GitHub secrets also fall back
const E2E_USERNAME = process.env.E2E_USERNAME || 'e2e_tester';
const E2E_PASSWORD = process.env.E2E_PASSWORD || 'E2eTestPass123';
const E2E_FIRST = 'E2E';
const E2E_LAST = 'Tester';

const STATE_FILE = path.join(__dirname, '..', 'auth.json');
const USER_FILE = path.join(__dirname, '..', 'e2e-user.json');

const EMPTY_STATE = JSON.stringify({ cookies: [], origins: [] });

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000';
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });

  let loginOk = false;

  try {
    // Try login first; if it fails, register the test user
    const loginRes = await context.request.post('/api/auth/login', {
      data: { username: E2E_USERNAME, password: E2E_PASSWORD },
    });

    if (loginRes.ok()) {
      loginOk = true;
      console.log('[global-setup] Logged in as existing E2E test user');
    } else {
      const regRes = await context.request.post('/api/auth/register', {
        data: {
          username: E2E_USERNAME,
          password: E2E_PASSWORD,
          first_name: E2E_FIRST,
          last_name: E2E_LAST,
        },
      });
      if (regRes.ok()) {
        loginOk = true;
        console.log('[global-setup] Registered new E2E test user');
      } else {
        const body = await regRes.text();
        console.error('[global-setup] Failed to register/login E2E user:', body);
      }
    }

    if (loginOk) {
      const meRes = await context.request.get('/api/auth/me');
      if (meRes.ok()) {
        const { user } = await meRes.json();
        fs.writeFileSync(USER_FILE, JSON.stringify({ userId: user.id, username: user.username }));
        console.log(`[global-setup] E2E user id: ${user.id}`);
      }
      await context.storageState({ path: STATE_FILE });
      console.log(`[global-setup] Session saved to ${STATE_FILE}`);
    }
  } catch (err) {
    console.error('[global-setup] Unexpected error:', err);
  } finally {
    await browser.close();
  }

  // Always write auth.json so Playwright can start even if login failed.
  // Tests that require auth will fail with a meaningful redirect error, not ENOENT.
  if (!fs.existsSync(STATE_FILE)) {
    fs.writeFileSync(STATE_FILE, EMPTY_STATE);
    console.warn('[global-setup] Wrote empty auth.json — authenticated tests will redirect to /login');
  }
}
