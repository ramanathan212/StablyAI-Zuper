import { test, expect } from '@stablyai/playwright-test';

test.describe('Create Quote with Dynamic Parts', () => {
  /**
   * User Prompt:
   * - create quote with mandatory fields dynamically like parts name as roof#current time stamp,
   *   product category as main product unit selling price as 1500 and fill mandatory fields
   */
  test('should create a quote with dynamic part details', async ({ page }) => {
    const timestamp = Date.now();
    const partName = `roof#${timestamp}`;
    const partId = `ROOF${timestamp.toString().slice(-4)}`;

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

      await emailField.waitFor({ state: 'visible' });
      await passwordField.waitFor({ state: 'visible' });

      await emailField.fill('ramanathan.m@zuper.co');
      await passwordField.fill('Test@123');

      const loginButton = page.getByRole('button', { name: 'Login' });
      await loginButton.waitFor({ state: 'visible' });
      await loginButton.click();

      // Wait for navigation to start
      await page.waitForURL(/dashboard/, { timeout: 60000 });
    });

    // Step 4: Wait for dashboard and dismiss any popups
    await test.step('Wait for dashboard and dismiss popups', async () => {
      // Dashboard URL was already verified in login step, now wait for page to stabilize
      await page.waitForTimeout(2000);

      // Dismiss timezone dialog if it appears
      const timezoneDialog = page.getByRole('heading', { name: 'Your timezone has changed' });
      if (await timezoneDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.getByRole('button', { name: 'Cancel' }).click();
        await timezoneDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      }

      // Dismiss "No, thanks" notification if present
      const noThanksButton = page.getByRole('button', { name: 'No, thanks' });
      if (await noThanksButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await noThanksButton.click();
        await page.waitForTimeout(500);
      }

      // Dismiss any remaining overlay backdrops with multiple attempts
      for (let i = 0; i < 3; i++) {
        const overlay = page.locator('.cdk-overlay-backdrop');
        if (await overlay.first().isVisible({ timeout: 1000 }).catch(() => false)) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1000);
        } else {
          break;
        }
      }

      // Final wait to ensure all overlays are cleared
      await page.waitForTimeout(1000);
    });

    // Step 5: Navigate to Quotes module
    await test.step('Navigate to Quotes module', async () => {
      await page.locator('#quotations_group > .zuper-vertical-navigation-item-wrapper > .mat-mdc-tooltip-trigger > .mat-icon').hover();
      await page.getByRole('link', { name: 'Quotes' }).click();
      await expect(page).toHaveURL(/estimates/, { timeout: 15000 });
    });

    // Step 6: Click New to create a quote
    await test.step('Click New to create quote', async () => {
      await page.locator('breadcrumb a').filter({ hasText: 'New' }).click();
      await page.getByRole('menuitem', { name: ' Quote' }).waitFor({ state: 'visible' });
      await page.getByRole('menuitem', { name: ' Quote' }).click();
      await expect(page).toHaveURL(/estimates\/new/, { timeout: 15000 });
    });

    // Step 7: Select Organization
    await test.step('Select Organization', async () => {
      await page.getByRole('textbox', { name: 'Choose Organization' }).click();

      // Wait for organization dialog and select first organization
      await page.getByRole('radio', { name: 'Aircon Company T' }).waitFor({ state: 'visible' });
      await page.getByRole('radio', { name: 'Aircon Company T' }).click();

      // Confirm selection
      await page.getByRole('button', { name: 'Choose Organization' }).click();

      // Verify organization is selected
      await expect(page.getByRole('textbox', { name: 'Choose Organization' })).toHaveValue('Aircon Company T');
    });

    // Step 8: Add custom line item with dynamic part
    await test.step('Add custom line item with dynamic part', async () => {
      // Click Add button in Parts & Services section (use locator that targets button with menu trigger)
      await page.locator('button[aria-haspopup="menu"]').filter({ hasText: 'Add' }).click();

      // Select Custom Line Item
      await page.getByRole('menuitem', { name: 'Custom Line Item' }).waitFor({ state: 'visible' });
      await page.getByRole('menuitem', { name: 'Custom Line Item' }).click();

      // Wait for dialog to appear
      await page.getByRole('heading', { name: 'Create New Line Item' }).waitFor({ state: 'visible' });

      // Fill ID field (required)
      await page.getByRole('textbox', { name: 'Eg: P001' }).fill(partId);

      // Select Type as Product
      await page.getByRole('combobox', { name: 'Type' }).click();
      await page.getByRole('option', { name: 'Product' }).click();

      // Fill Name field (required) with dynamic timestamp
      await page.getByRole('textbox', { name: 'Eg: Carton Box' }).fill(partName);

      // Fill Unit Selling Price (required)
      await page.getByPlaceholder('Unit Selling Price').fill('1500');

      // Fill Quantity (required)
      await page.getByPlaceholder('Eg: 2').fill('1');

      // Click Create to add the line item
      await page.getByRole('button', { name: 'Create' }).click();

      // Verify line item was added - check that Parts & Services count is 1
      await expect(page.locator('text=Parts & Services').locator('..').getByText('1')).toBeVisible();
    });

    // Step 9: Save quote as draft
    await test.step('Save quote as draft', async () => {
      // Click Save as Draft button
      await page.locator('#undefined').click();

      // Confirm in dialog
      await page.getByRole('button', { name: 'Save as Draft' }).waitFor({ state: 'visible' });
      await page.getByRole('button', { name: 'Save as Draft' }).click();
    });

    // Step 10: Verify quote created successfully
    await test.step('Verify quote created successfully', async () => {
      // Verify redirected to quote details page
      await expect(page).toHaveURL(/estimates\/.*\/details/, { timeout: 15000 });

      // Verify page title contains Quote
      await expect(page).toHaveTitle(/Quote \d+ - Zuper Pro/);

      // Verify the part name appears in the quote details table
      await expect(page.locator('table').getByText(partName)).toBeVisible();

      // Verify total amount is displayed correctly in the Total row
      await expect(page.getByRole('cell', { name: '₹1,650.000' })).toBeVisible();

      // Verify status is Draft (use the combobox which shows the status)
      await expect(page.getByRole('combobox', { name: 'Draft' })).toBeVisible();
    });
  });
});
