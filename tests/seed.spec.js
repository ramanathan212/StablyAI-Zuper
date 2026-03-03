import { test } from '@stablyai/playwright-test';

test('seed', async ({ page }) => {
  // This is just a seed test to set up the browser
  await page.goto('https://uat.zuperpro.com');
});
