import { test, expect } from '@stablyai/playwright-test';

test.describe('Navigate to Quotes Module', () => {
  /**
   * User Prompt:
   * - url - https://developmentv3.zuperpro.com/v7/dashboard
   * - login details: Companyname - sofyaizuper, username - ramanathan.m@zuper.co, pw - Test@123
   * - Navigation test to Quote module
   */
  test('should login and navigate to Quotes page', async ({ page }) => {
    // Step 1: Navigate to login page
    await test.step('Navigate to login page', async () => {
      await page.goto('https://developmentv3.zuperpro.com/v7/login');
      await page.getByText('Company Name').first().waitFor({ state: 'visible' });
    });

    // Step 2: Enter company name and continue
    await test.step('Enter company name', async () => {
      await page.getByRole('textbox', { name: 'Company Name' }).fill('sofyaizuper');
      await page.getByRole('button', { name: 'Continue' }).click();
    });

    // Step 3: Enter credentials and login
    await test.step('Enter credentials and login', async () => {
      const emailField = page.getByRole('textbox', { name: 'Email address' });
      const passwordField = page.getByRole('textbox', { name: 'Password Forgot password?' });

      // Wait for both fields to be visible
      await emailField.waitFor({ state: 'visible' });
      await passwordField.waitFor({ state: 'visible' });

      // Fill email
      await emailField.fill('ramanathan.m@zuper.co');

      // Fill password
      await passwordField.fill('Test@123');

      // Click login
      await page.getByRole('button', { name: 'Login' }).click();
    });

    // Step 4: Wait for dashboard and dismiss any popups
    await test.step('Wait for dashboard and dismiss popups', async () => {
      await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });

      // Wait a moment for any modals to appear
      await page.waitForTimeout(2000);

      // Dismiss timezone dialog if it appears - look for the specific heading
      const timezoneDialog = page.getByRole('heading', { name: 'Your timezone has changed' });
      if (await timezoneDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        const cancelButton = page.getByRole('button', { name: 'Cancel' });
        await cancelButton.click();
        // Wait for dialog to close
        await timezoneDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      }

      // Dismiss "No, thanks" notification if present
      const noThanksButton = page.getByRole('button', { name: 'No, thanks' });
      if (await noThanksButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await noThanksButton.click();
        await page.waitForTimeout(500);
      }

      // Dismiss any remaining overlay backdrops
      const overlay = page.locator('.cdk-overlay-backdrop');
      if (await overlay.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
      }
    });

    // Step 5: Navigate to Quotes module
    await test.step('Navigate to Quotes module', async () => {
      // Hover over the quotations menu to reveal submenu
      await page.locator('#quotations_group > .zuper-vertical-navigation-item-wrapper > .mat-mdc-tooltip-trigger > .mat-icon').hover();

      // Click on Quotes link
      await page.getByRole('link', { name: 'Quotes' }).click();
    });

    // Step 6: Verify Quotes page loaded
    await test.step('Verify Quotes page loaded', async () => {
      await expect(page).toHaveURL(/estimates/, { timeout: 15000 });
      await expect(page).toHaveTitle(/Quotes/);

      // Verify the quotes table is visible
      await expect(page.getByRole('table')).toBeVisible();
    });
  });
});
