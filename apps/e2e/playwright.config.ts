import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const isRemote = !!process.env.BASE_URL;
const fullBrowsers = !!process.env.FULL_BROWSERS;
const smokeOnly = !!process.env.SMOKE_ONLY;

const AUTH_STATE = path.join(__dirname, 'auth.json');

export default defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./tests/global-setup'),
  ...(smokeOnly && { testIgnore: '**/*.regression.spec.ts' }),
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results.json' }]]
    : [['html', { open: 'never' }], ['json', { outputFile: 'test-results.json' }]],

  expect: {
    timeout: 20_000,
  },

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    storageState: AUTH_STATE,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    ...(fullBrowsers
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
          },
          {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 5'] },
          },
        ]
      : []),
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
