import { defineConfig, devices } from '@playwright/test';

const isRemote = !!process.env.BASE_URL;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 3,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    ...(isRemote
      ? []
      : [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
          },
          {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 5'] },
          },
        ]),
  ],

  // Only spin up a local dev server when testing locally (not against a remote deployment)
  ...(!isRemote && {
    webServer: {
      command: 'npm run dev -w @expense/web',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      cwd: '../..',
    },
  }),
});
