import { test, expect } from '@stablyai/playwright-test';

test('seed', async ({ page }) => {
  // Navigate to jobs page using stored auth
  await page.goto('https://stagingv3.zuperpro.com/jobs');
});
