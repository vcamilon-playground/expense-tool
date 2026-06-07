import { test, expect } from '@playwright/test';

// PWA assets must be reachable without authentication so the app is installable
// from the login page (the middleware allowlists them).
test.describe('PWA', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('web manifest is public and valid', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.ok()).toBeTruthy();
    expect(res.headers()['content-type'] ?? '').toMatch(/manifest|json/);

    const manifest = await res.json();
    expect(manifest.name).toBe('Expense Tool');
    expect(manifest.display).toBe('standalone');
    expect(Array.isArray(manifest.icons)).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('apple touch icon is a public image', async ({ request }) => {
    const res = await request.get('/apple-icon');
    expect(res.ok()).toBeTruthy();
    expect(res.headers()['content-type'] ?? '').toMatch(/^image\//);
  });

  test('app icon SVG is public', async ({ request }) => {
    const res = await request.get('/icon.svg');
    expect(res.ok()).toBeTruthy();
    expect(res.headers()['content-type'] ?? '').toMatch(/svg/);
  });

  test('service worker script is public', async ({ request }) => {
    const res = await request.get('/sw.js');
    expect(res.ok()).toBeTruthy();
  });
});
