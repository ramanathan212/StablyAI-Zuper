import { test, expect } from '@playwright/test';

test.describe('Test group', () => {
  test('seed', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Company Name' }).waitFor({ state: 'visible', timeout: 30000 });
    await page.getByRole('textbox', { name: 'Company Name' }).fill(process.env.company_name ?? 'zuper-pro');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Continue');
      if (btn) (btn as HTMLElement).click();
    });
    await page.getByRole('textbox', { name: 'Email address' }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByRole('textbox', { name: 'Email address' }).fill(process.env.user_name || 'ragupathy.s@zuper.co');
    await page.getByRole('textbox', { name: 'Password Forgot password?' }).fill(process.env.password || 'Test@1234');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Login');
      if (btn) (btn as HTMLElement).click();
    });
    await page.waitForURL('**/dashboard', { waitUntil: 'commit', timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.goto('/jobs');
    await expect(page).toHaveTitle(/Jobs/, { timeout: 30000 });
    await page.waitForTimeout(3000);
  });
});
