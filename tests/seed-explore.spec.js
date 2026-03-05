import { test, expect } from '@stablyai/playwright-test';

test('explore app', async ({ page }) => {
  // Navigate to login
  await page.goto('https://web.zuperpro.com/login');
  await page.getByRole('textbox', { name: 'Company Name' }).waitFor({ state: 'visible' });
  await page.getByRole('textbox', { name: 'Company Name' }).fill('ZuperQA');
  await page.getByRole('button', { name: 'Continue' }).click();

  const emailField = page.getByRole('textbox', { name: 'Email address' });
  await emailField.waitFor({ state: 'visible' });
  await emailField.fill('qa@zuper.co');

  const passwordField = page.getByRole('textbox', { name: 'Password Forgot password?' });
  await passwordField.fill('Test@1234');
  await page.getByRole('button', { name: 'Login' }).click();

  // Wait for dashboard
  await page.waitForURL(/dashboard/, { timeout: 60000 });
  await page.waitForTimeout(3000);
});
