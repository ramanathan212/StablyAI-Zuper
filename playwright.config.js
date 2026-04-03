import { defineConfig, devices, stablyReporter } from '@stablyai/playwright-test';

// Environment configuration
const ENV = process.env.TEST_ENV || 'uat'; // default to uat
const BASE_URLS = {
  development: 'https://developmentv3.zuperpro.com/v2',
  staging: 'https://staging.zuperpro.com',
  uat: 'https://uat.zuperpro.com'
};

export default defineConfig({
  testDir: './tests',
  timeout: 180000, // Increased to 3 minutes for slow-loading pages
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html'],
    ['list'],
    ...(process.env.STABLY_API_KEY
      ? [stablyReporter({
          apiKey: process.env.STABLY_API_KEY,
          projectId: process.env.STABLY_PROJECT_ID,
        })]
      : []),
  ],
  use: {
    baseURL: BASE_URLS[ENV],
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 60000, // Increased to 60 seconds for slow page loads

    launchOptions: {
      args: [
        '--disable-blink-features=AutomationControlled',
      ]
    },
  },

  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'firefox',
      grep: /.^/, // Opt-in: run with --project=firefox
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit',
      grep: /.^/, // Opt-in: run with --project=webkit
      use: {
        ...devices['Desktop Safari'],
      },
    },
  ],
});
