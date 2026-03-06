import { test, expect } from '@stablyai/playwright-test';

test('login seed', async ({ page }) => {
  await page.goto(`${process.env.staging_env}/login`);
  await page.getByRole('textbox', { name: 'Company Name' }).waitFor({ state: 'visible' });
  await page.getByRole('textbox', { name: 'Company Name' }).fill(process.env.company_name);
  await page.getByRole('button', { name: 'Continue' }).click();

  const emailField = page.getByRole('textbox', { name: 'Email address' });
  const passwordField = page.getByRole('textbox', { name: 'Password Forgot password?' });
  await emailField.waitFor({ state: 'visible' });
  await emailField.fill(process.env.user_name);
  await passwordField.fill(process.env.password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });
  await page.waitForTimeout(3000);
});
