import { defineConfig } from '@stablyai/playwright-test';

export default defineConfig({
  testDir: './tests/unit',
  testMatch: '**/*.test.js', // Only run .test.js files for unit tests
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: undefined, // Use all available cores for unit tests
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-unit' }]
  ],
  // Unit tests don't need browser or global setup
  use: {
    trace: 'off',
  },
});
