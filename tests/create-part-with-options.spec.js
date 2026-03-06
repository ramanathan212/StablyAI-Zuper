import { test, expect } from '@stablyai/playwright-test';

// Skip global auth - this test handles its own login
test.use({ storageState: undefined });

test.describe('Create Part with Options and Contact Selection on Proposal', () => {
  /**
   * User Prompt:
   * - Create a automation test using url - https://stagingv3.zuperpro.com/dashboard Company name - sofyaizuper
   * - Username - ramanathan.m@zuper.co password - Test@123
   * - Go to Settings -> Parts & services -> General Settings -> enable toggle button for options.
   * - Go to Parts and service -> Create parts -> fill mandatory fields -> Part title as shingles+timestamp -> fill options details and turn on toggle button -> Enable Contact Selection on Proposal.
   * - Validate assert actions for created Part.
   */
  test('Create part with options, toggle, and contact selection on proposal', async ({ page, agent }) => {
    // Step 1: Login
    await page.goto('https://stagingv3.zuperpro.com/login');

    await page.getByRole('textbox', { name: 'Company Name' }).describe('Company name input').fill('sofyaizuper');
    await page.getByRole('button', { name: 'Continue' }).describe('Continue button').click();

    const emailInput = page.getByRole('textbox', { name: 'Email address' }).describe('Email input');
    await emailInput.waitFor({ state: 'visible', timeout: 30000 });
    await emailInput.fill('ramanathan.m@zuper.co');

    const passwordInput = page.getByRole('textbox', { name: 'Password Forgot password?' }).describe('Password input');
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.fill('Test@123');

    await page.getByRole('button', { name: 'Login', exact: true }).describe('Login button').click();

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

    // Dismiss any other modals
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Step 2: Navigate to Settings -> Parts & Services -> General Settings
    await page.goto('https://stagingv3.zuperpro.com/settings_new/products/configuration');
    await page.waitForURL('**/products/configuration', { timeout: 15000 });

    // Step 3: Enable the "Enable Options?" toggle
    const enableOptionsLabel = page.getByText('Enable Options?').describe('Enable Options label');
    await enableOptionsLabel.waitFor({ state: 'visible', timeout: 10000 });

    // Use agent to reliably enable the Options toggle if not already enabled
    await agent.act('Look at the "Enable Options?" toggle. If it shows "No" (meaning it is disabled), click on it to switch it to "Yes". If it already shows "Yes", do nothing.', { page, maxCycles: 5 });

    // Save settings if save button is visible and enabled
    try {
      const saveButton = page.getByRole('button', { name: 'Save' }).describe('Save settings button');
      const isSaveVisible = await saveButton.isVisible({ timeout: 3000 });
      if (isSaveVisible) {
        await saveButton.click();
        // Wait for success message
        await expect(page.getByText('updated successfully')).toBeVisible({ timeout: 10000 });
      }
    } catch {
      // Save might not be needed if toggle was already enabled
    }

    // Assert: Verify Options toggle is enabled (shows "Yes")
    await expect(page.getByText('Enable Options?').locator('..').locator('..').getByText('Yes', { exact: true }).describe('Options toggle Yes state')).toBeVisible({ timeout: 5000 });

    // Step 4: Navigate to Parts & Services to create a new part
    await page.goto('https://stagingv3.zuperpro.com/products');
    await page.waitForURL('**/products**', { timeout: 15000 });

    // Click "New Part/Service"
    const newPartLink = page.getByRole('link', { name: /New Part\/Service/i }).describe('New Part/Service button');
    await newPartLink.waitFor({ state: 'visible', timeout: 10000 });
    await newPartLink.click();
    await page.waitForURL('**/products/new**', { timeout: 15000 });

    // Step 5: Fill mandatory fields
    const timestamp = Date.now();
    const partName = `shingles${timestamp}`;

    // Fill Part Name
    const partNameInput = page.getByRole('textbox', { name: 'Part Name *' }).describe('Part Name input');
    await partNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await partNameInput.fill(partName);

    // Fill Part Number
    const partNumberInput = page.getByRole('textbox', { name: 'Prefix Part Number *' }).describe('Part Number input');
    await partNumberInput.fill(`SH-${timestamp}`);

    // Select Category
    await page.waitForTimeout(1000);
    const categoryDropdown = page.getByText('Choose a category', { exact: true }).describe('Category dropdown');
    if (await categoryDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
      await categoryDropdown.click();
      await page.getByText('Main Product', { exact: true }).describe('Main Product option').click();
    } else {
      // Try alternative selector
      const altCategoryDropdown = page.getByText('Select Category', { exact: true }).describe('Alt Category dropdown');
      if (await altCategoryDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
        await altCategoryDropdown.click();
        await page.getByText('Main Product', { exact: true }).describe('Main Product option').click();
      }
    }

    // Fill Unit Selling Price
    const unitSellingPriceInput = page.getByRole('spinbutton', { name: 'Unit Selling Price *' }).describe('Unit Selling Price input');
    await unitSellingPriceInput.fill('1500');

    // Step 6: Fill Options details - click "Add" in the Options section
    await agent.act('Scroll down to find the "Options" section header. Click the "Add" link/button next to the Options header to expand and add a new option.', { page, maxCycles: 8 });

    // Fill option name
    await page.waitForTimeout(1000);
    const optionNameInput = page.getByRole('textbox', { name: 'e.g., Charcoal' }).describe('Option name input');
    await optionNameInput.waitFor({ state: 'visible', timeout: 5000 });
    await optionNameInput.fill('Premium Red');

    // Step 7: Turn on the toggle button in the options section
    await agent.act('In the Options section, find the toggle switch (it might be near the option name or color picker area) and turn it ON if it is currently OFF. This is a small toggle/switch control within the options area, not the main settings toggle.', { page, maxCycles: 5 });

    // Step 8: Enable Contact Selection on Proposal
    await agent.act('Scroll down to find the "Enable Contact Selection on Proposal" toggle/checkbox and turn it ON if it is not already enabled. It might be in the form below the options section.', { page, maxCycles: 8 });

    // Step 9: Fill Location Availability fields
    await agent.act('Scroll down to the "Location Availability" section. Fill "Available Qty" with 500 and "Minimum Qty" with 50.', { page, maxCycles: 8 });

    // Step 10: Save the Part
    await agent.act('Click the "Save Part / Service" button at the top of the page to save the new part. If a confirmation dialog appears asking "Do you want to create part...", click the "Create" button to confirm.', { page, maxCycles: 8 });

    // Wait for navigation to the part detail page
    await page.waitForTimeout(3000);

    // Step 11: Validate assertions for the created part

    // Assert: URL changed from /products/new to the product detail page
    await expect(page).toHaveURL(/\/products\/.*\/details/, { timeout: 15000 });

    // Assert: Part name is displayed on the detail page
    await expect(page.getByText(partName).first().describe('Created part name on detail page')).toBeVisible({ timeout: 15000 });

    // Assert: Part number is displayed
    await expect(page.getByText(`SH-${timestamp}`).first().describe('Part number on detail page')).toBeVisible({ timeout: 10000 });

    // Assert: Primary Details section shows correct values
    await expect(page.getByText('Main Product').describe('Category value')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('500').first().describe('Available Quantity value')).toBeVisible({ timeout: 5000 });

    // Assert: Options section is present with 1 option
    await expect(page.getByRole('heading', { name: /Options.*\(1\)/ }).describe('Options heading with count')).toBeVisible({ timeout: 5000 });

    // Assert: Option name "Premium Red" is visible
    await expect(page.getByText('Premium Red').describe('Option name Premium Red')).toBeVisible({ timeout: 5000 });

    // Assert: Contact Selection Enabled is visible on the detail page
    await expect(page.getByText('Contact Selection Enabled').describe('Contact Selection Enabled label')).toBeVisible({ timeout: 5000 });
  });
});
