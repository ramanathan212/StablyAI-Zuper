import { test, expect } from '@stablyai/playwright-test';

// Skip global auth - this test handles its own login
test.use({ storageState: undefined });

test.describe('Parts & Services Settings', () => {
  /**
   * User Prompt:
   * - url - https://stagingv3.zuperpro.com/estimates
   * - company name - sofyaizuper
   * - username - ramanathan.m@zuper.co
   * - password - Test@123
   * - Go to settings -> parts& services module -> General Settings -> turn on - options toggle button
   *
   * [Clarification: "Options toggle" refers to the "Enable Options?" toggle in Parts & Services General Settings]
   */
  test('Enable options toggle in Parts & Services General Settings', async ({ page, agent }) => {
    // Step 1: Login to Staging V3 environment
    await page.goto('https://stagingv3.zuperpro.com/login');

    // Enter company name
    await page.getByRole('textbox', { name: 'Company Name' }).fill('sofyaizuper');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Wait for credentials form to appear
    const loginEmailInput = page.locator('input[type="email"], [name="email"], input[placeholder*="email" i]').first();
    await loginEmailInput.waitFor({ state: 'visible', timeout: 30000 });
    await loginEmailInput.fill('ramanathan.m@zuper.co');

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.fill('Test@123');

    await page.getByRole('button', { name: 'Login', exact: true }).click();

    // Wait for dashboard to load
    await page.waitForURL('**/dashboard', { timeout: 30000 });

    // Dismiss timezone change dialog if present
    try {
      const cancelButton = page.getByRole('button', { name: 'Cancel' });
      await cancelButton.waitFor({ state: 'visible', timeout: 5000 });
      await cancelButton.click();
    } catch {
      // No dialog to dismiss
    }

    // Dismiss notification popup if present
    try {
      const noThanksButton = page.getByRole('button', { name: 'No, thanks' });
      await noThanksButton.waitFor({ state: 'visible', timeout: 3000 });
      await noThanksButton.click();
    } catch {
      // No notification popup
    }

    // Step 2: Navigate directly to Parts & Services General Settings
    await page.goto('https://stagingv3.zuperpro.com/settings_new/products/configuration');
    await page.waitForURL('**/products/configuration', { timeout: 15000 });

    // Step 3: Enable the "Enable Options?" toggle
    // Wait for the settings page to load
    const enableOptionsLabel = page.getByText('Enable Options?');
    await enableOptionsLabel.waitFor({ state: 'visible', timeout: 10000 });

    // Check current toggle state and enable if needed
    const enableOptionsYes = page.getByText('Enable Options?').locator('..').locator('..').getByText('Yes', { exact: true });
    const enableOptionsNo = page.getByText('Enable Options?').locator('..').locator('..').getByText('No', { exact: true });

    // Try to find and click "No" if it exists (needs to be enabled)
    if (await enableOptionsNo.isVisible({ timeout: 2000 }).catch(() => false)) {
      await enableOptionsNo.click();

      // Wait for toggle change and save
      await expect(enableOptionsYes).toBeVisible({ timeout: 5000 });

      // Click Save button
      await page.getByRole('button', { name: 'Save' }).click();

      // Wait for success message
      await expect(page.getByText('updated successfully')).toBeVisible({ timeout: 10000 });
    }

    // Verify toggle is enabled (shows "Yes")
    await expect(enableOptionsYes).toBeVisible({ timeout: 5000 });

    // Step 4: Navigate to Parts & Services module
    await page.goto('https://stagingv3.zuperpro.com/products');
    await page.waitForURL('**/products**', { timeout: 15000 });

    // Step 5: Click "New Part/Service" to create a new part
    const newPartLink = page.getByRole('link', { name: /New Part\/Service/i });
    await newPartLink.waitFor({ state: 'visible', timeout: 10000 });
    await newPartLink.click();
    await page.waitForURL('**/products/new**', { timeout: 15000 });

    // Step 6: Fill mandatory fields
    // Generate unique part name with timestamp
    const timestamp = Date.now();
    const partName = `product${timestamp}`;

    // Fill Part Name
    const partNameInput = page.getByRole('textbox', { name: /Part Name/i });
    await partNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await partNameInput.fill(partName);

    // Fill Part Number (required field)
    const partNumberInput = page.getByRole('textbox', { name: /Part Number/i });
    await partNumberInput.fill(`PN-${timestamp}`);

    // Wait for the form to fully load before selecting category
    await page.waitForTimeout(2000);

    // Select Category -> Main Product (custom dropdown)
    // Try "Select Category" first, if not visible try the untranslated key
    let categoryDropdown = page.getByText('Select Category', { exact: true });
    if (!(await categoryDropdown.isVisible({ timeout: 3000 }).catch(() => false))) {
      categoryDropdown = page.getByText('text.select_category', { exact: true });
    }
    await categoryDropdown.waitFor({ state: 'visible', timeout: 10000 });
    await categoryDropdown.click();
    await page.getByText('Main Product', { exact: true }).click();

    // Fill Unit Selling Price (required field)
    const unitSellingPriceInput = page.getByRole('spinbutton', { name: /Unit Selling Price/i });
    await unitSellingPriceInput.fill('100');

    // Step 7: Look for Options section and click "Add" to add option details
    // Click the "Add" link in the Options panel header
    const optionsAddLink = page.getByRole('button', { name: /Option.*Add/i }).getByText('Add');
    await optionsAddLink.waitFor({ state: 'visible', timeout: 10000 });
    await optionsAddLink.click();

    // Wait for the option form to appear
    await page.waitForTimeout(1000);

    // Fill in option name (required field)
    const optionNameInput = page.getByRole('textbox', { name: 'e.g., Charcoal' });
    await optionNameInput.waitFor({ state: 'visible', timeout: 5000 });
    await optionNameInput.fill('Red Color');

    // Fill Location Availability fields (required) using agent for reliable interaction
    await agent.act('Scroll down to the "Location Availability" section and fill "Available Qty" with 100 and "Minimum Qty" with 10', { page, maxCycles: 8 });

    // Step 8: Click Save Part / Service using agent.act for reliable interaction
    await agent.act('Click the "Save Part / Service" button at the top of the page to save the new part', { page, maxCycles: 5 });

    // Wait for save to process
    await page.waitForTimeout(3000);

    // Verify success - check for success message or navigation away from create page
    const currentUrl = page.url();
    if (!currentUrl.includes('/products/new')) {
      // Successfully saved - we were redirected to product list or detail
      // Verify we're on a products page (detail or list)
      await expect(page).toHaveURL(/\/products\//);
    } else {
      // Still on create page - check for success toast message
      await expect(page.getByText(/created successfully|saved successfully|added successfully/i)).toBeVisible({ timeout: 10000 });
    }
  });
});
