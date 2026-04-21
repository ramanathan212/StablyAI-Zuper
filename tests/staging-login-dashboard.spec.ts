import { test, expect } from '@stablyai/playwright-test';
import { LoginPage } from './pages/LoginPage.js';

test.describe('Staging Login and Dashboard Verification', () => {
  /**
   * User Prompt:
   * - Navigate to https://stagingv3.zuperpro.com/
   * - Enter company name, email, and password
   * - Click Login
   * - Dismiss any popups and verify dashboard is displayed
   */
  test('should login to staging and verify dashboard loads', async ({ page }) => {
    // Staging uses 'zuper' as company name (differs from UAT's 'zuper-pro')
    const companyName = 'zuper';
    const userName = process.env.user_name!;
    const password = process.env.password!;

    // Navigate to staging login page
    const loginPage = new LoginPage(page, 'https://stagingv3.zuperpro.com');
    await loginPage.navigate();

    // Fill company name and continue
    await loginPage.companyNameInput.waitFor({ state: 'visible', timeout: 30000 });
    await loginPage.companyNameInput.fill(companyName);

    // Use JS click to bypass banner overlay on Continue button
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Continue'
      );
      if (btn) btn.click();
    });

    // Fill email and password
    await loginPage.emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await loginPage.emailInput.fill(userName);
    await loginPage.passwordInput.fill(password);

    // Use JS click to bypass banner overlay on Login button
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Login'
      );
      if (btn) btn.click();
    });

    // Verify dashboard loaded
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
    await expect(page).toHaveTitle(/Dashboard/);

    // Dismiss timezone/cancel popup if present
    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    await cancelButton.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }

    // Dismiss notification permission dialog if present
    const noThanksButton = page.getByRole('button', { name: 'No, thanks' });
    await noThanksButton.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await noThanksButton.isVisible()) {
      await noThanksButton.click();
    }

    // Final assertion: dashboard is accessible and loaded
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
