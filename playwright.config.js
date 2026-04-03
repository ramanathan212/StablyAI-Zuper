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
    headless: true,
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
      grep: /(Navigate to Quotes Module should login and navigate to Quotes page|Quick Create Deployment Check - March 4 Create new job with quick create organization, contact, and property)$/i,
      testMatch: ['navigate-to-quotes.spec.js', 'quick-create-deployment-check.spec.js'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: undefined, // Don't use stored auth - test handles its own login
      },
    },
    {
      name: 'chromium',
      grep: /(Quick Create Deployment Check - March 4 Create new job with quick create organization, contact, and property)$/i,
      testMatch: ['quick-create-deployment-check.spec.js'],
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
    {
      name: 'chromium-default',
      grep: /(Complete Vendor, MR, and PO Flow should complete full vendor, material request, and purchase order workflow|Asset Management Create new asset with organization and contact|Customer Management Create new customer with complete details|Complete Job, MR, PO, and Quote Workflow should create job, request materials, process PO, and create quote|Job Creation with Quick Create Organization and Customer Create new job with quick create organization and customer|Organization Management Create new organization with complete details)$/i,
      testMatch: [
        'complete-vendor-mr-po-flow-refactored.spec.js',
        'create-asset.spec.js',
        'create-customer.spec.js',
        'create-job-mr-po-workflow.spec.js',
        'create-job-with-quick-create-org-customer.spec.js',
        'create-org.spec.js',
      ],
      stably: {
        notifications: {
          slack: {
            channelName: 'qa-automation-stably-report',
            notifyOnResult: 'all',
          },
        },
      },
      use: {
        ...devices['Desktop Chrome'],
        // Override base config to avoid aggressive cache/service worker blocking
        // which prevents API data (like job categories) from loading
        launchOptions: {
          args: [
            '--disable-blink-features=AutomationControlled',
          ]
        },
        contextOptions: {
          serviceWorkers: 'allow',
        },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'browser.cache.disk.enable': false,
            'browser.cache.memory.enable': false,
            'browser.cache.offline.enable': false,
            'network.http.use-cache': false,
          }
        },
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        launchOptions: {
          args: [
            '--disable-cache',
            '--disable-application-cache',
          ]
        },
      },
    },
    {
      name: 'chrome',
      grep: /.^/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
