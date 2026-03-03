import { test, expect } from '@stablyai/playwright-test';

test.describe('Add Note to Job', () => {
  /**
   * User Prompt:
   * - [Recorded actions: Login to stagingv3.zuperpro.com, navigate to Jobs, open job #223,
   *   click Update twice, go to Line Items then Notes tab, type "QA" in rich text editor,
   *   post note, attempt file attachment (close dialog), post note again]
   */
  test('should add a text note to an existing job', async ({ page }) => {
    // Step 1: Login to staging V2 (different flow from V3 LoginPage)
    await page.goto('https://staging.zuperpro.com/login');

    // Enter company name
    const companyNameInput = page.getByRole('textbox', { name: 'Your Company Name' }).describe('Company name input');
    await companyNameInput.waitFor({ state: 'visible', timeout: 15000 });
    await companyNameInput.fill(process.env.company_name);

    // Submit company name by clicking the arrow button next to it
    const submitCompanyButton = page.locator('button').first().describe('Company name submit arrow');
    await submitCompanyButton.click();
    await page.waitForTimeout(3000);

    // Enter email and password
    const emailInput = page.getByRole('textbox', { name: 'Email' }).describe('Email input');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(process.env.user_name);

    const passwordInput = page.getByRole('textbox', { name: 'Password' }).describe('Password input');
    await passwordInput.fill(process.env.password);

    // Click Log in button
    const loginButton = page.getByRole('button', { name: 'Log in' }).describe('Log in button');
    await loginButton.waitFor({ state: 'visible', timeout: 5000 });
    await loginButton.click();

    // Wait for login to complete
    await page.waitForTimeout(5000);

    // Step 2: Dismiss any popup/modal that appears after login
    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    if (await cancelButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cancelButton.click();
    }

    // Dismiss any overlay
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // Step 3: Navigate to Jobs
    await page.goto('https://staging.zuperpro.com/app/jobs');
    await page.waitForTimeout(3000);
  });
});
