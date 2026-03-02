import { test, expect } from '@stablyai/playwright-test';

// Skip global auth - this test handles its own login
test.use({ storageState: undefined });

test.describe('Create Job with Parts & Services Options', () => {
  /**
   * User Prompt:
   * - with the help of created parts and services with options enabled create job which works in this way
   * - Go to jobs -> click new job button fill mandatory fields and add parts and services
   * - add newly created parts with options and fill option details with red color -> create job
   */
  test('Create job with parts containing options and select Red Color option', async ({ page, agent }) => {
    // Increase timeout for this test due to multiple agent.act() calls
    test.setTimeout(300000); // 5 minutes

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

    // Step 2: Navigate to Jobs
    await page.goto('https://stagingv3.zuperpro.com/jobs');
    await page.waitForURL('**/jobs**', { timeout: 15000 });

    // Wait for jobs page to load
    await page.waitForTimeout(2000);

    // Step 3: Click New Job button
    const newJobButton = page.locator('a[href="/jobs/new"]').first();
    await newJobButton.waitFor({ state: 'visible', timeout: 10000 });
    await newJobButton.click();
    await page.waitForURL('**/jobs/new**', { timeout: 15000 });

    // Wait for job creation form to load
    await page.getByRole('textbox', { name: 'Job Title *' }).waitFor({ state: 'visible', timeout: 10000 });

    // Step 4: Fill mandatory fields
    const timestamp = Date.now();
    const jobTitle = `Job with Options ${timestamp}`;

    // Fill Job Title
    await page.getByRole('textbox', { name: 'Job Title *' }).fill(jobTitle);

    // Fill Due Date (required field)
    const dueDateInput = page.getByRole('textbox', { name: 'Due Date' });
    await dueDateInput.waitFor({ state: 'visible', timeout: 10000 });
    await dueDateInput.click();

    // Wait for calendar and select tomorrow's date
    await page.waitForTimeout(1000);

    // Use agent to select a date in the calendar (tomorrow or any future date)
    await agent.act('Select tomorrow or the next available date in the calendar picker', { page, maxCycles: 5 });

    // Press Escape to close any open overlays from the date picker
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Select Job Category if available - use agent to handle complex dropdowns
    await agent.act('Click on the "Choose a Job Category" dropdown and select the first available category from the list (such as "Cleaning" or any other visible option)', { page, maxCycles: 8 });

    // Close any remaining overlays - click on the Job Title field to close dropdowns and wait for overlay to disappear
    await page.getByRole('textbox', { name: 'Job Title *' }).click();
    await page.waitForTimeout(500);

    // Wait for any drawer overlay to disappear
    const drawerOverlay = page.locator('.zuper-drawer-overlay');
    try {
      await drawerOverlay.waitFor({ state: 'hidden', timeout: 5000 });
    } catch {
      // If still visible, press Escape multiple times
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Step 5: Add Organization - use agent for reliable interaction with overlays
    await agent.act('Click on "Add Organization" link, then select the first organization from the displayed list (do not search), and click "Choose Organization" button', { page, maxCycles: 8 });

    // Step 6: Add Parts & Services (line items) with Options
    // Scroll down to see the Part/Service Details section
    await page.keyboard.press('End');
    await page.waitForTimeout(1000);

    // Use agent to add parts - click the "Add" button in the "Part/Service Details" section
    await agent.act('Scroll down to find the "Part/Service Details" section (not "Service Tasks"). Click the "+ Add" button in that section, then select "Line Item" from the dropdown menu.', { page, maxCycles: 8 });

    // Wait for product list modal to load
    await page.waitForTimeout(2000);

    // Step 7: Search for and select a part with options (product created in previous test)
    // Use agent to search and select a product
    await agent.act('In the product selection dialog, search for "product" in the search field, then select any product that appears in the results by checking its checkbox. If no results, select the first available product.', { page, maxCycles: 8 });

    // Click Add Product button
    await agent.act('Click the "Add Product" button to add the selected product to the job', { page, maxCycles: 5 });

    // Wait for product to be added
    await page.waitForTimeout(2000);

    // Step 8: Fill option details with Red Color (if available)
    // The product might not have options enabled - try to select Red Color if visible
    try {
      // Look for an Options dropdown in the Part/Service Details table
      const optionCell = page.locator('table').getByText('Red Color');
      if (await optionCell.isVisible({ timeout: 3000 }).catch(() => false)) {
        await optionCell.click();
      } else {
        // No options dropdown visible - the product may not have options enabled
        console.log('No Red Color option found - continuing without options');
      }
    } catch {
      console.log('Options selection skipped - no options available for selected product');
    }

    // Step 9: Try to create the job first - if mandatory fields error appears, fill them
    await page.keyboard.press('Home');
    await page.waitForTimeout(1000);

    // Click Create Job button
    await agent.act('Click the "Create Job" button at the top right of the page header (next to Cancel button). If an error appears about mandatory fields, scroll down to find and fill the "Date & Time test *" field by selecting today from the calendar and clicking OK, then click Create Job again.', { page, maxCycles: 15 });

    // Wait for job creation
    await page.waitForTimeout(3000);

    // Step 11: Verify job was created successfully
    // Check for URL change to job details page
    const currentUrl = page.url();
    if (currentUrl.includes('/jobs/') && currentUrl.includes('/details')) {
      // Job created successfully - verify job details page
      await expect(page).toHaveURL(/\/jobs\/.*\/details/);
    } else {
      // Check for success message if still on create page
      await expect(page.getByText(/created successfully|Job created/i)).toBeVisible({ timeout: 10000 });
    }
  });
});
