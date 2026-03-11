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
  // globalSetup: './tests/global-setup.js', // Disabled - use test-level auth
  use: {
    baseURL: BASE_URLS[ENV],
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 60000, // Increased to 60 seconds for slow page loads
    // storageState: 'tests/.auth/user.json', // Disabled - test handles its own login

    // Cache and state management options
    launchOptions: {
      // Start with a clean browser profile each time
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-cache',
        '--disable-application-cache',
        '--disable-offline-load-stale-cache',
        '--disk-cache-size=0'
      ]
    },

    // Clear browser context state between tests
    contextOptions: {
      // Disable service workers that might cache data
      serviceWorkers: 'block'
    }
  },

  projects: [
    {
      name: 'mcp-isolated',
      testMatch: '**/navigate-to-quotes.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        storageState: undefined, // Don't use stored auth - test handles its own login
      },
    },
    {
      name: 'chromium',
      grep: /(Complete Vendor, MR, and PO Flow should complete full vendor, material request, and purchase order workflow)$/i,
      testMatch: ['complete-vendor-mr-po-flow-refactored.spec.js'],
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-cache',
            '--disable-application-cache',
            '--disable-offline-load-stale-cache',
            '--disk-cache-size=0',
            '--disable-gpu-shader-disk-cache',
            '--media-cache-size=0',
            '--aggressive-cache-discard',
          ]
        },
      },
    },
  ],
});
