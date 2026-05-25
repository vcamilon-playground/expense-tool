import { defineConfig, devices } from '@playwright/test';

const isRemote = !!process.env.BASE_URL;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 3,
  timeout: 60_000,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',

  expect: {
    timeout: 20_000,
  },

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
    trace: 'retain-on-failure',
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

  ...(!isRemote && {
    webServer: {
      command: 'npm run dev -w @expense/web',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      cwd: '../..',
    },
  }),
});
