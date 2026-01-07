import { defineConfig, devices } from '@playwright/test';

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
    ['list']
  ],
  globalSetup: './tests/global-setup.js',
  use: {
    baseURL: 'https://uat.zuperpro.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 60000, // Increased to 60 seconds for slow page loads
    storageState: 'tests/.auth/user.json',

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
      name: 'chromium',
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
  ],
});
