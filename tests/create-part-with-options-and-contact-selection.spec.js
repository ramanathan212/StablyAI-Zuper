import { test, expect } from '@stablyai/playwright-test';

// Skip global auth - this test handles its own login
test.use({ storageState: undefined });

test.describe('Create Part with Options and Contact Selection on Proposal', () => {
  /**
   * User Prompt:
   * - Create a automation test using url - https://stagingv3.zuperpro.com/dashboard Company name - sofyaizuper
   *   Username - ramanathan.m@zuper.co password - Test@123
   * - Go to Settings -> Parts & services -> General Settings -> enable toggle button for options.
   * - Go to Parts and service -> Create parts -> fill mandatory fields -> fill options details and turn on toggle button -> Enable Contact Selection on Proposal
   */
  test('Enable options toggle in settings then create part with options and contact selection on proposal', async ({ page }) => {
    // Step 1: Login to Staging V3 environment
    await test.step('Login to application', async () => {
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
      await page.waitForURL('**/dashboard', { timeout: 60000 });
    });

    // Step 2: Dismiss any popups after login
    await test.step('Dismiss popups after login', async () => {
      // Dismiss timezone dialog if present
      try {
        const cancelButton = page.getByRole('button', { name: 'Cancel' });
        await cancelButton.waitFor({ state: 'visible', timeout: 5000 });
        await cancelButton.click();
      } catch {
        // No timezone dialog
      }

      // Dismiss notification popup if present
      try {
        const noThanksButton = page.getByRole('button', { name: 'No, thanks' });
        await noThanksButton.waitFor({ state: 'visible', timeout: 3000 });
        await noThanksButton.click();
      } catch {
        // No notification popup
      }

      // Dismiss any remaining overlays
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    });

    // Step 3: Navigate to Settings -> Parts & Services -> General Settings and enable Options toggle
    await test.step('Enable Options toggle in Parts & Services General Settings', async () => {
      await page.goto('https://stagingv3.zuperpro.com/settings_new/products/configuration');
      
      // Wait for settings page to load
      const enableOptionsLabel = page.getByText('Enable Options?').describe('Enable Options label');
      await enableOptionsLabel.waitFor({ state: 'visible', timeout: 30000 });

      // Find the "Enable Options?" setting row container
      const enableOptionsRow = page.locator('div').filter({ has: page.getByText('Enable Options?', { exact: true }) }).last();

      // Check if toggle currently shows "No" and needs to be enabled
      const noToggle = enableOptionsRow.getByText('No', { exact: true });
      const isCurrentlyNo = await noToggle.isVisible({ timeout: 3000 }).catch(() => false);

      if (isCurrentlyNo) {
        // Click "No" to toggle it to "Yes"
        await noToggle.click();
        // Save settings
        await page.getByRole('button', { name: 'Save' }).click();
        // Wait for success message
        await expect(page.getByText('updated successfully')).toBeVisible({ timeout: 10000 });
      }

      // Verify the toggle shows "Yes"
      await expect(enableOptionsRow.getByText('Yes', { exact: true })).toBeVisible({ timeout: 5000 });
    });

    // Step 4: Navigate to Parts & Services -> New Part/Service
    await test.step('Navigate to New Part/Service form', async () => {
      await page.goto('https://stagingv3.zuperpro.com/products/new');
      
      // Wait for the form to load
      const partNameInput = page.getByRole('textbox', { name: 'Part Name *' }).describe('Part Name input');
      await partNameInput.waitFor({ state: 'visible', timeout: 30000 });
    });

    // Step 5: Fill mandatory fields
    const timestamp = Date.now();
    const partName = `TestPart_Options_${timestamp}`;
    const partNumber = `PN-OPT-${timestamp}`;

    await test.step('Fill mandatory part fields', async () => {
      // Fill Part Name
      await page.getByRole('textbox', { name: 'Part Name *' }).describe('Part Name input').fill(partName);

      // Fill Part Number
      await page.getByRole('textbox', { name: 'Prefix Part Number *' }).describe('Part Number input').fill(partNumber);

      // Select Category - Main Product
      // The category dropdown may show 'Select Category' or the untranslated key 'text.select_category'
      const categoryDropdown = page.getByText(/select.category|text\.select_category|Choose a category/i).first().describe('Category dropdown');
      await categoryDropdown.waitFor({ state: 'visible', timeout: 10000 });
      await categoryDropdown.click();
      await page.locator('div').filter({ hasText: /^Main Product$/ }).describe('Main Product option').click();

      // Fill Unit Selling Price
      await page.getByRole('spinbutton', { name: 'Unit Selling Price *' }).describe('Unit Selling Price input').fill('100');
    });

    // Step 6: Add option details and turn on toggle
    await test.step('Add option details and enable toggle', async () => {
      // Click "Add" in the Option section
      const optionAddButton = page.locator('#mat-expansion-panel-header-2 a').filter({ hasText: 'Add' }).describe('Option Add button');
      await optionAddButton.waitFor({ state: 'visible', timeout: 10000 });
      await optionAddButton.click();

      // Fill option name
      const optionNameInput = page.getByRole('textbox', { name: 'e.g., Charcoal' }).describe('Option name input');
      await optionNameInput.waitFor({ state: 'visible', timeout: 5000 });
      await optionNameInput.fill('Red Color');
    });

    // Step 7: Enable Contact Selection on Proposal toggle
    await test.step('Enable Contact Selection on Proposal', async () => {
      // Click the toggle label for "Enable Contact Selection on Proposal"
      const contactSelectionToggle = page.getByText('Enable Contact Selection on Proposal').locator('..').locator('..').locator('label.inline-flex').describe('Enable Contact Selection on Proposal toggle');
      await contactSelectionToggle.click();
    });

    // Step 8: Fill Location Availability fields
    await test.step('Fill Location Availability details', async () => {
      await page.getByPlaceholder('Enter Available Qty').describe('Available Qty input').fill('100');
      await page.getByPlaceholder('Enter Minimum Qty').describe('Minimum Qty input').fill('10');
    });

    // Step 9: Save Part / Service
    await test.step('Save Part / Service', async () => {
      await page.locator('a').filter({ hasText: 'Save Part / Service' }).describe('Save Part / Service button').click();

      // Confirm creation in dialog
      const createButton = page.getByRole('button', { name: 'Create' }).describe('Create confirmation button');
      await createButton.waitFor({ state: 'visible', timeout: 10000 });
      await createButton.click();
    });

    // Step 10: Verify part was created successfully
    await test.step('Verify part created successfully', async () => {
      // Verify redirected to product details page
      await expect(page).toHaveURL(/\/products\/.*\/details/, { timeout: 30000 });

      // Verify page title contains the part name
      await expect(page).toHaveTitle(new RegExp(partNumber));

      // Verify success toast message
      await expect(page.getByText('New Product Created Successfully').describe('Success message')).toBeVisible({ timeout: 10000 });

      // Verify Options section shows the option with Contact Selection Enabled
      await expect(page.getByText('Contact Selection Enabled').describe('Contact Selection Enabled indicator')).toBeVisible({ timeout: 10000 });

      // Verify option name is displayed
      await expect(page.getByText('Red Color').describe('Option name in details')).toBeVisible();

      // Verify category is Main Product
      await expect(page.getByText('Main Product').describe('Category value')).toBeVisible();
    });
  });
});
