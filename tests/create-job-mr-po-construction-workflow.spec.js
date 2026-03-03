import { test, expect } from '@stablyai/playwright-test';

// Generate a dynamic due date (15 days from now) for the job
const getDynamicDueDate = () => {
  const today = new Date();
  const futureDate = new Date(today.getTime() + (15 * 24 * 60 * 60 * 1000));
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${monthNames[futureDate.getMonth()]} ${futureDate.getDate()},`;
};

test.describe('Job → Material Request → Purchase Order Construction Workflow', () => {
  /**
   * User Prompt:
   * - [Recorded browser actions: Login to staging, navigate to Jobs, create new job titled
   *   "job for construction - 03/03" with Installation trade type and March 18 due date,
   *   add KT Organization, add Elbows (#E333) and Shingles (#shingle747) as line items
   *   with "One plus" option for Elbows, create the job, go to Line Items tab,
   *   create Material Request from items, progress MR through Save as Draft → Mark as Submitted →
   *   Mark as Approved, create Purchase Order from approved MR, open PO in new tab,
   *   progress PO through Mark as Submitted → More Actions → Mark as Sent to Vendor,
   *   fill received quantity of 1 for both Shingles and Elbows products, click Update,
   *   then verify PO Items tab]
   */
  test('create job, material request, and purchase order for construction', async ({ page, context, agent }) => {
    test.setTimeout(300000); // 5 minutes for the full workflow

    const jobTitle = `job for construction - ${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}`;
    const dueDate = getDynamicDueDate();
    const baseURL = process.env.staging_env || 'https://stagingv3.zuperpro.com';

    // Step 1: Login to staging environment
    await test.step('Login to staging environment', async () => {
      await page.goto(`${baseURL}/login`);
      await page.getByRole('textbox', { name: 'Company Name' }).describe('Company name input').fill(process.env.company_name);
      await page.getByRole('button', { name: 'Continue' }).describe('Continue button').click();
      await page.getByRole('textbox', { name: 'Email address' }).describe('Email input').fill(process.env.user_name);
      await page.getByRole('textbox', { name: 'Password Forgot password?' }).describe('Password input').fill(process.env.password);
      await page.getByRole('button', { name: 'Login' }).describe('Login button').click();

      // Wait for login to complete
      await page.waitForURL('**/dashboard**', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(3000);

      // Dismiss any post-login dialogs (notification popup, timezone change dialog, etc.)
      for (let i = 0; i < 3; i++) {
        const cancelBtn = page.getByRole('button', { name: 'Cancel' });
        if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await cancelBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    });

    // Step 2: Navigate to Jobs and open new job form
    await test.step('Navigate to Jobs and open new job form', async () => {
      // Navigate directly to jobs page (sidebar may be collapsed)
      await page.goto(`${baseURL}/jobs`);
      await page.waitForURL('**/jobs**', { timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.getByRole('link', { name: /New Job/i }).describe('New Job button').click();
    });

    // Step 3: Fill job details - title, job category, due date
    await test.step('Fill job details - title, job category, due date', async () => {
      await page.getByRole('textbox', { name: 'Job Title *' }).describe('Job title input').fill(jobTitle);

      // Select Job Category: Installation and set due date
      await agent.act(`On the new job form, do these actions in order:
1. Scroll down to find the "Job Category" dropdown (shows "Choose a Job Category"), click it, search for "Installation" by typing in the search box, and select it.
2. Then scroll back up and click the "Due Date" field, and select the date "${dueDate}" from the calendar picker.`, { page, maxCycles: 15 });
    });

    // Step 4: Add KT Organization to the job
    await test.step('Add KT Organization to job', async () => {
      await page.locator('a').filter({ hasText: /^Add Organization$/ }).describe('Add Organization link').click();
      await page.locator('a').filter({ hasText: 'KT Organization sandeep@zuper' }).describe('KT Organization item').click();
      await page.getByRole('radio', { name: 'KT Organization' }).describe('KT Organization radio').click();
      await page.getByRole('button', { name: 'Choose Organization' }).describe('Choose Organization button').click();
    });

    // Step 5: Add Elbows and Shingles as line items
    await test.step('Add Elbows and Shingles as line items', async () => {
      // Open Add Line Item menu
      await page.locator('#pricelist-ng-select a').filter({ hasText: 'Add' }).describe('Add line item dropdown').click();
      await page.getByRole('menuitem', { name: 'Line Item', exact: true }).describe('Line Item option').click();

      // Wait for product search dialog to appear
      await page.getByRole('textbox', { name: 'Search Item' }).waitFor({ state: 'visible', timeout: 10000 });

      // Set filters: select "Any" for type, and clear the Trade Type filter (auto-set to HVAC from Job Category)
      await agent.act('In the "Choose Line Item" dialog, do the following: 1) Find the type filter dropdown (likely shows "Product"), click it, and select "Any". 2) Then find the Trade Type filter dropdown (likely shows "HVAC"), click it, and select the option that shows all trade types (like "All" or the first/blank option) to clear the HVAC filter.', { page, maxCycles: 8 });

      // Search and select Elbows product
      const searchInput = page.getByRole('textbox', { name: 'Search Item' }).describe('Product search input');
      await searchInput.click();
      await searchInput.fill('elbow');
      await searchInput.press('Enter');
      await page.waitForTimeout(2000);
      await page.getByRole('checkbox', { name: /E333.*Elbows/i }).describe('Elbows product checkbox').check();

      // Select product option "One plus" for Elbows
      await page.getByText('Select an option').describe('Product option dropdown').click();
      await page.locator('div').filter({ hasText: /^One plus$/ }).nth(2).describe('One plus option').click();

      // Clear search and search for Shingles
      await searchInput.click();
      await searchInput.fill('shingle');
      await searchInput.press('Enter');
      await page.waitForTimeout(2000);
      await page.getByRole('checkbox', { name: /shingle747/i }).describe('Shingles product checkbox').check();

      // Add selected products to the job
      await page.getByRole('button', { name: 'Add Product' }).describe('Add Product button').click();
    });

    // Step 6: Submit and create the job
    await test.step('Submit and create the job', async () => {
      // Click "Create Job" at the top-right of the form and then "Create" in the confirmation dialog
      await agent.act('Click the "Create Job" button at the top of the page (near the "Cancel" button), then if a confirmation dialog appears, click the "Create" button to confirm', { page, maxCycles: 5 });

      // Wait for job creation and navigation to job details
      await page.waitForURL('**/jobs/**/details**', { timeout: 30000 });
      await expect(page).toHaveURL(/\/jobs\/.*\/details/);
    });

    // Step 7: Create Material Request from job Line Items
    await test.step('Create Material Request from job line items', async () => {
      await page.getByRole('button', { name: 'Line Items' }).describe('Line Items tab').click();
      await page.waitForTimeout(1500);

      await page.locator('a').filter({ hasText: /^Request$/ }).describe('Request action dropdown').click();
      await page.getByRole('menuitem', { name: 'Material Request' }).describe('Material Request option').click();

      // Select items for MR
      await page.getByRole('row', { name: /Item Type Option Required/i }).getByRole('checkbox').describe('Select all items checkbox').check();
      await page.getByRole('button', { name: 'Add' }).describe('Add items to MR button').click();
    });

    // Step 8: Progress Material Request through statuses: Draft → Submitted → Approved
    await test.step('Progress MR: Draft → Submitted → Approved', async () => {
      // Save as Draft
      await page.locator('#undefined').waitFor({ state: 'visible', timeout: 15000 });
      await page.locator('#undefined').describe('MR status action trigger').click();
      await page.getByRole('button', { name: 'Save as Draft' }).describe('Save as Draft button').click();
      await page.waitForTimeout(3000);

      // Mark as Submitted
      await page.locator('#undefined').waitFor({ state: 'visible', timeout: 15000 });
      await page.locator('#undefined').describe('MR status action trigger').click();
      await page.getByRole('button', { name: 'Mark as Submitted' }).describe('Mark as Submitted button').click();
      await page.waitForTimeout(3000);

      // Mark as Approved
      await page.locator('#undefined').waitFor({ state: 'visible', timeout: 15000 });
      await page.locator('#undefined').describe('MR status action trigger').click();
      await page.getByRole('button', { name: 'Mark as Approved' }).describe('Mark as Approved button').click();
      await page.waitForTimeout(3000);
    });

    // Step 9: Create Purchase Order from the approved Material Request
    await test.step('Create Purchase Order from Material Request', async () => {
      await page.locator('#undefined').waitFor({ state: 'visible', timeout: 15000 });
      await page.locator('#undefined').describe('MR PO creation trigger').click();

      await page.getByRole('checkbox').first().describe('Select item for PO').check();
      await page.getByRole('button', { name: 'Next' }).describe('Next step button').click();
      await page.getByRole('button', { name: 'Create Purchase Order' }).describe('Create PO button').click();
      await page.waitForTimeout(3000);
    });

    // Step 10: Navigate to Purchase Orders tab and open PO in new tab
    let poPage;
    await test.step('Open Purchase Order in new tab', async () => {
      await page.getByRole('button', { name: /Purchase Orders \(\d+\)/i }).describe('Purchase Orders tab').click();
      await page.waitForTimeout(1500);

      // Click PO link - opens in new tab
      const poPagePromise = context.waitForEvent('page');
      await page.getByRole('link', { name: /PO for.*MR for Job/i }).describe('Purchase Order link').click();
      poPage = await poPagePromise;
      await poPage.waitForLoadState('load', { timeout: 30000 });
    });

    // Step 11: Progress PO: Submitted → Sent to Vendor
    await test.step('Progress PO: Submitted → Sent to Vendor', async () => {
      // Mark as Submitted
      await poPage.locator('#undefined').waitFor({ state: 'visible', timeout: 15000 });
      await poPage.locator('#undefined').describe('PO status action trigger').click();
      await poPage.getByRole('button', { name: 'Mark as Submitted' }).describe('Mark as Submitted button').click();
      await poPage.waitForTimeout(3000);

      // Mark as Sent to Vendor (via More Actions dropdown)
      await poPage.locator('a').filter({ hasText: 'More Actions' }).describe('More Actions menu').click();
      await poPage.getByRole('menuitem', { name: /Mark as Sent to Vendor/i }).describe('Sent to Vendor option').click();
      await poPage.getByRole('button', { name: 'Mark as Sent to Vendor' }).describe('Confirm Sent to Vendor').click();
      await poPage.waitForTimeout(3000);
    });

    // Step 12: Fill received quantities for both products
    await test.step('Fill received quantities for both products', async () => {
      await poPage.locator('#undefined').waitFor({ state: 'visible', timeout: 15000 });
      await poPage.locator('#undefined').describe('PO receive items trigger').click();
      await poPage.waitForTimeout(1500);

      // Fill Shingles received quantity
      const shingleQtyInput = poPage.getByRole('row', { name: /shingle747/i }).getByPlaceholder('Eg: 2', { exact: true }).describe('Shingles received qty');
      await shingleQtyInput.click();
      await shingleQtyInput.fill('1');

      // Fill Elbows received quantity
      const elbowQtyInput = poPage.getByRole('row', { name: /E333.*Elbows/i }).getByPlaceholder('Eg: 2', { exact: true }).describe('Elbows received qty');
      await elbowQtyInput.click();
      await elbowQtyInput.fill('1');

      // Update
      await poPage.getByRole('button', { name: 'Update' }).describe('Update quantities button').click();
      await poPage.waitForTimeout(2000);
    });

    // Step 13: Verify PO Items tab
    await test.step('Verify PO Items tab shows received quantities', async () => {
      await poPage.getByRole('button', { name: 'PO Items' }).describe('PO Items tab').click();
      await poPage.waitForTimeout(1500);

      // Verify PO Items tab is active and items are visible
      await expect(poPage.getByRole('button', { name: 'PO Items' })).toBeVisible();
      await expect(poPage.getByRole('cell', { name: '1' }).first()).toBeVisible({ timeout: 10000 });
    });
  });
});
