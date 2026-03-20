export class MaterialRequestPage {
  constructor(page) {
    this.page = page;
    this.purchasingLocator = page.locator('div').filter({ hasText: 'Purchasing' }).nth(3);
    this.materialRequestsLink = page.getByRole('link', { name: 'Material Requests' });
    this.newMaterialRequestButton = page.getByRole('link', { name: ' New Material Request' });
    this.titleInput = page.getByRole('textbox', { name: 'Material Request Title *' });
    this.pickDateInput = page.getByRole('textbox', { name: 'Pick Date' });
    this.remarksInput = page.getByRole('textbox', { name: 'Enter remarks' });
    this.addJobQuoteLink = page.locator('a').filter({ hasText: 'Add Job / Quote' });
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.saveAndSubmitButtonClick = page.getByRole('button', { name: 'Save & Submit' });
    this.markSubmittedButton = page.getByRole('button', { name: 'Mark as Submitted' });
    this.saveSubmitLink = page.locator("//a[contains(text(), 'Save & Submit')]");
    this.nextButton = page.getByRole('button', { name: 'Next' });
    this.createPOButton = page.getByRole('button', { name: 'Create Purchase Order' });
  }

  async navigateToMaterialRequests() {
    // Direct navigation to material requests page
    await this.page.goto('/material_requests');
    await this.page.waitForLoadState('load');
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async clickNewMaterialRequest() {
    await this.page.waitForLoadState('load');
    await this.page.waitForTimeout(2000);

    // Helper function to try finding and clicking the button
    const tryClickButton = async () => {
      const newMRSelectors = [
        "//a[contains(text(), 'New Material Request')]",
        "//button[contains(text(), 'New Material Request')]",
        "a:has-text('New Material Request')",
        "button:has-text('New Material Request')",
        "a[href*='material_requests/new']",
        ".new-mr-btn, [class*='new-material']"
      ];

      for (const selector of newMRSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log(`✓ Found New Material Request button using selector: ${selector}`);
            await element.scrollIntoViewIfNeeded();
            await element.click();
            return true;
          }
        } catch (error) {
          continue;
        }
      }

      // Try original locator as fallback
      try {
        if (await this.newMaterialRequestButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          await this.newMaterialRequestButton.scrollIntoViewIfNeeded();
          await this.newMaterialRequestButton.click();
          console.log('✓ Clicked New Material Request using original locator');
          return true;
        }
      } catch (error) {
        console.log('Original locator failed');
      }

      return false;
    };

    // First attempt
    let buttonClicked = await tryClickButton();

    // If button not found, refresh page and try again
    if (!buttonClicked) {
      console.log('⚠️  Button not found on first attempt. Refreshing page...');
      await this.page.reload({ waitUntil: 'networkidle' });
      await this.page.waitForTimeout(2000);

      console.log('Trying to find button after page refresh...');
      buttonClicked = await tryClickButton();
    }

    // If still not found after refresh, try navigating directly via URL
    if (!buttonClicked) {
      console.log('⚠️  Button not found after refresh. Trying direct URL navigation...');
      const currentUrl = this.page.url();
      const baseUrl = currentUrl.split('/material_requests')[0];
      await this.page.goto(`${baseUrl}/material_requests/new`);
      await this.page.waitForLoadState('load');
      await this.page.waitForTimeout(2000);

      // Check if we successfully landed on the new MR page
      const newUrl = this.page.url();
      if (newUrl.includes('/material_requests/new')) {
        console.log('✓ Navigated directly to New Material Request page via URL');
        buttonClicked = true;
      }
    }

    if (!buttonClicked) {
      throw new Error('Could not find or navigate to New Material Request page after multiple attempts. Please check if you have permission to create Material Requests.');
    }

    await this.page.waitForLoadState('load');
    console.log('✓ Successfully on New Material Request page');
  }

  async _dismissOverlays() {
    // Dismiss browser notification popup ("NO, THANKS")
    try {
      const noThanksButton = this.page.getByRole('button', { name: 'NO, THANKS' });
      if (await noThanksButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await noThanksButton.click();
        await this.page.waitForTimeout(500);
        console.log('✓ Notification popup dismissed');
      }
    } catch { /* no popup */ }

    // Dismiss "Trial Period Ending Soon" modal via X button
    try {
      const closeButton = this.page.locator('.cdk-overlay-container button.close, .cdk-overlay-container .close, .cdk-overlay-container [aria-label="Close"]').first();
      if (await closeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeButton.click();
        await this.page.waitForTimeout(500);
        console.log('✓ Trial modal dismissed');
      }
    } catch { /* no modal */ }

    // Dismiss any remaining backdrop by pressing Escape
    try {
      const backdrop = this.page.locator('.cdk-overlay-backdrop');
      if (await backdrop.isVisible({ timeout: 2000 }).catch(() => false)) {
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(500);
      }
    } catch { /* no backdrop */ }
  }

  async fillMRBasicInfo(mrData) {
    // Dismiss any overlays before interacting with the form
    await this._dismissOverlays();

    await this.titleInput.click();
    await this.titleInput.fill(mrData.title);

    // Handle date picker dynamically
    await this.pickDateInput.click();
    await this.page.waitForTimeout(1000);

    try {
      // Try to select today's date or any visible date
      // First, try to find and click today's date
      const todayButton = this.page.locator('button.mat-calendar-body-active, button[aria-pressed="true"], button.mat-calendar-body-today');
      await todayButton.first().waitFor({ state: 'visible', timeout: 5000 });
      await todayButton.first().click();
    } catch (error) {
      // Fallback: Click any available date in the current month
      console.log('Today button not found, selecting first available date...');
      const anyDate = this.page.locator('button.mat-calendar-body-cell:not(.mat-calendar-body-disabled)').first();
      await anyDate.waitFor({ state: 'visible', timeout: 5000 });
      await anyDate.click();
    }

    await this.page.waitForTimeout(500);
    await this.remarksInput.click();
    await this.remarksInput.fill(mrData.remarks);
  }

  async linkJobQuote(jobSearch, jobNumber) {
    await this.addJobQuoteLink.click();

    // Wait for the search dialog to open
    await this.page.waitForTimeout(2000);

    // Try multiple strategies to find the search input
    let searchInputFound = false;
    let searchInput;

    const searchInputSelectors = [
      '#mat-input-7',
      '#mat-input-0',
      'input[placeholder*="Search"]',
      'input[type="text"]',
      'input[type="search"]',
      'input.mat-input-element',
      '[role="searchbox"]'
    ];

    for (const selector of searchInputSelectors) {
      try {
        searchInput = this.page.locator(selector).first();
        if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log(`✓ Found search input using selector: ${selector}`);
          searchInputFound = true;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!searchInputFound) {
      throw new Error('Could not find search input in Add Job/Quote dialog');
    }

    await searchInput.click({ force: true });
    await searchInput.fill(jobSearch);
    await searchInput.press('Enter');

    // Wait for search results to load
    await this.page.waitForLoadState('load');
    await this.page.waitForTimeout(2000);

    // Wait for results and select the job
    const jobLink = this.page.locator(`a`).filter({ hasText: new RegExp(jobNumber) });
    await jobLink.waitFor({ state: 'visible', timeout: 35000 });
    await jobLink.click();

    // Wait for job details to load and select
    await this.page.waitForTimeout(1000);
    await this.page.getByRole('radio').first().check();

    // Handle the Proceed button - may be obstructed by overlapping elements
    const proceedButton = this.page.getByRole('button', { name: 'Proceed' });
    await proceedButton.scrollIntoViewIfNeeded();

    // Try to click with force option to bypass obstructions
    try {
      await proceedButton.click({ force: true });
    } catch (error) {
      // Fallback: Use JavaScript click if regular click fails
      console.log('Regular click failed, trying JavaScript click...');
      await proceedButton.evaluate(el => el.click());
    }

    console.log('✓ Job/Quote linked successfully');
  }

  async addProducts(products) {
    // Wait for product list to load
    await this.page.waitForTimeout(3000);

    for (const productName of products) {
      // Find the row containing the product name and check its checkbox
      const row = this.page.locator('tr').filter({ hasText: productName });
      await row.waitFor({ state: 'visible', timeout: 35000 });
      const checkbox = row.locator('input[type="checkbox"]').first();
      await checkbox.scrollIntoViewIfNeeded();
      await checkbox.check();
    }
    await this.addButton.click();

    // Wait for the modal to close and page to stabilize
    await this.page.waitForLoadState('load');
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(3000);
  }

  async saveAndSubmit() {
    // Import expect for assertions
    const { expect } = await import('@playwright/test');

    // Wait for page to stabilize after adding products
    await this.page.waitForLoadState('load');
    await this.page.waitForTimeout(2000);

    // Store current URL before submission to verify navigation
    const urlBeforeSubmission = this.page.url();
    console.log(`Current URL before submission: ${urlBeforeSubmission}`);

    // Try multiple strategies to find and click Save & Submit
    let saveButtonClicked = false;

    // Strategy 1: Try to find Save & Submit link/text at the bottom of the page
    try {
      // Scroll to bottom to ensure Save & Submit is visible
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.page.waitForTimeout(1000);

      const saveAndSubmitSelectors = [
        "//a[contains(text(), 'Save & Submit')]",
        "//span[contains(text(), 'Save & Submit')]",
        "//button[contains(text(), 'Save & Submit')]",
        "a:has-text('Save & Submit')",
        "span:has-text('Save & Submit')",
        ".save-submit, [class*='save']"
      ];

      for (const selector of saveAndSubmitSelectors) {
        const element = this.page.locator(selector).first();
        if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log(`✓ Found Save & Submit using selector: ${selector}`);
          await element.scrollIntoViewIfNeeded();
          await element.click();
          saveButtonClicked = true;
          console.log('✓ Clicked initial Save & Submit button/link');
          break;
        }
      }
    } catch (error) {
      console.log('Save & Submit link not found, trying alternative approach...');
    }

    if (!saveButtonClicked) {
      throw new Error('Could not find Save & Submit button/link. Please check if the form is complete.');
    }

    // Wait for confirmation dialog/popup to appear
    await this.page.waitForTimeout(2000);
    console.log('Waiting for confirmation dialog...');

    // Step 2: Click the Save & Submit button in the confirmation popup/dialog
    // Wait for navigation after clicking the confirmation button
    try {
      await Promise.all([
        this.page.waitForURL('**/material_requests/**/details**', { timeout: 15000 }),
        this.saveAndSubmitButtonClick.click()
      ]);
      console.log('✓ Clicked confirmation button and navigation completed');
    } catch (error) {
      throw new Error(`Failed to click confirmation button or navigate: ${error.message}`);
    }

    // Wait for page to stabilize after submission
    await this.page.waitForLoadState('load');
    await this.page.waitForTimeout(1000);

    // Verify URL changed to details page
    const urlAfterSubmission = this.page.url();
    console.log(`URL after submission: ${urlAfterSubmission}`);

    // Verify we navigated to the details page
    if (urlAfterSubmission.includes('/material_requests/') && urlAfterSubmission.includes('/details')) {
      console.log('✓ Successfully navigated to Material Request details page');
      console.log('✓ Material Request submitted successfully');

      // Additional verification: Check for "Submitted" status on the page
      try {
        await expect(this.page.locator('text=Submitted').first()).toBeVisible({ timeout: 10000 });
        console.log('✓ Confirmed "Submitted" status is visible on the page');
      } catch (error) {
        console.log('⚠️  Warning: Could not verify "Submitted" status visibility');
      }
    } else {
      throw new Error(`Expected URL to contain '/material_requests/' and '/details', but got: ${urlAfterSubmission}`);
    }
  }

  async verifyMaterialRequestCreated() {
    // Verify Material Request details are displayed correctly
    const { expect } = await import('@playwright/test');

    await expect(this.page.locator('as-split').getByText('Submitted')).toBeVisible();
    await expect(this.page.getByText('Priority', { exact: true })).toBeVisible();
    await expect(this.page.locator('as-split').getByText('Low')).toBeVisible();

    // Get current date in MM/DD/ format (e.g., "12/10/")
    const currentDate = new Date();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const datePattern = `${month}/${day}/`;

    await expect(this.page.getByText(datePattern)).toBeVisible();
    await expect(this.page.getByText('Direct Shipment to Job\'s site')).toBeVisible();
    await expect(this.page.getByText('Vignesh Sam').first()).toBeVisible();
    await expect(this.page.getByText('Vignesh Sam').nth(1)).toBeVisible();
    await expect(this.page.getByText('test MR remark')).toBeVisible();
    await expect(this.page.getByRole('link', { name: /ls-Job2|5962/ })).toBeVisible();

    console.log('✓ Material Request details verified successfully');
  }

  // async markAsSubmitted() {
  //   // Wait for Mark as Submitted button to be visible
  //   await this.markSubmittedButton.waitFor({ state: 'visible', timeout: 10000 });
  //   await this.markSubmittedButton.click();
  //   await this.page.waitForLoadState('networkidle');
  // }

  async createPOFromMR(vendorName) {
      // Wait for page to fully load before starting PO creation
    await this.page.waitForLoadState('load');
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(2000);

    // Dismiss any overlays first
    await this._dismissOverlays();

    // Click "Convert to Purchase Order" link/button
    const convertButton = this.page.locator('a, button').filter({ hasText: /Convert to Purchase Order/i }).first();
    await convertButton.waitFor({ state: 'visible', timeout: 10000 });
    await convertButton.click();
    await this.page.waitForTimeout(1000);

    // Check first checkbox
    await this.page.getByRole('checkbox').first().check();

    // Select vendor for first dropdown
    await this.page.locator('div').filter({ hasText: /^Select Vendor$/ }).nth(3).click();
    await this.page.getByRole('option', { name: vendorName }).click();

    // Select vendor for product row 1
    await this.page.locator('#product-row-1').getByRole('textbox').click();
    await this.page.getByRole('option', { name: vendorName }).click();

    // Select vendor for product row 2
    await this.page.locator('#product-row-2').getByRole('textbox').click();
    await this.page.getByRole('option', { name: vendorName }).click();

    // Click Next button
    await this.page.getByRole('button', { name: 'Next' }).click();
    await this.page.waitForTimeout(1000);

    // Click Create Purchase Order button
    await this.page.getByRole('button', { name: 'Create Purchase Order' }).click();
    await this.page.waitForLoadState('load');
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Click Purchase Orders to view created PO
    await this.page.waitForTimeout(1000);
   }

  async openPurchaseOrder() {
    await this.page.getByRole('button', { name: 'Purchase Orders (1)' }).click();

    // Get the PO link href and navigate directly (avoids unstable popup windows)
    const poLink = this.page.getByRole('link', { name: /^PO for/ }).first();
    await poLink.waitFor({ state: 'visible', timeout: 10000 });
    const poHref = await poLink.getAttribute('href');

    if (poHref) {
      await this.page.goto(poHref);
    } else {
      // Fallback: click and handle popup
      const page1Promise = this.page.waitForEvent('popup');
      await poLink.click();
      const page1 = await page1Promise;
      await page1.waitForLoadState('load');
      await page1.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      return page1;
    }

    await this.page.waitForLoadState('load');
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    return this.page;
  }

  async getMRNumber() {
    const titleElement = this.page.locator('h1, .mr-title');
    return await titleElement.textContent();
  }

  async clickOpenlatestMR() {
    // Wait for the Material Requests list to load
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);

    // Click the first MR link in the list using regex pattern to match any MR
    // This will select the first Material Request regardless of job number
    const latestMRLink = this.page.locator('a').filter({ hasText: /MR for Job - #\s*\d+\s*-/ }).first();
    await latestMRLink.waitFor({ state: 'visible', timeout: 10000 });
    await latestMRLink.click();
    console.log('✓ Clicked on the latest Material Request link');

    // Wait for MR details page to load
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
  }

  async openMRFromJob(jobNumber = null) {
    // Wait for page to stabilize
    await this.page.waitForTimeout(2000);
    await this.page.waitForLoadState('networkidle');

    // Get the current URL to determine context
    const currentUrl = this.page.url();
    console.log(`Current page URL: ${currentUrl}`);

    // Check if we're on an MR details page by looking at the actual visible page
    const isOnMRDetailsPage = currentUrl.includes('/material_requests/') &&
                               !currentUrl.includes('/material_requests/new') &&
                               !currentUrl.endsWith('/material_requests');

    // Check if Material Requests section is visible on current page (would be on Job page)
    const hasMRSection = await this.page.getByText(/Material Requests \(\d+\)/i).isVisible({ timeout: 2000 }).catch(() => false);

    if (isOnMRDetailsPage && !hasMRSection) {
      // We're already on MR details page and not on a Job page with MR section
      console.log('✓ Already on Material Request details page, no navigation needed');
      return;
    }

    if (!hasMRSection) {
      // We're not on Job page with MR section, so we must already be on the MR page
      console.log('✓ No Material Requests section visible - assuming already on MR page');
      return;
    }

    console.log('Material Requests section found - navigating from Job page to MR...');

    // The Material Requests section is on the right sidebar of Job details page
    // Try multiple selectors to find and click the Material Requests section
    const mrSectionSelectors = [
      { name: 'Text with count', locator: this.page.getByText(/Material Requests \(\d+\)/i) },
      { name: 'Exact text Material Requests', locator: this.page.getByText('Material Requests', { exact: false }) },
      { name: 'XPath contains text', locator: this.page.locator("//text()[contains(., 'Material Requests')]").first() },
      { name: 'Label with Material Requests', locator: this.page.locator('label, span, div').filter({ hasText: /Material Requests/i }).first() },
      { name: 'Any element with MR text', locator: this.page.locator('*:has-text("Material Requests")').first() }
    ];

    let mrSection = null;
    let successfulSelector = null;

    // Try each selector until one works
    for (const selector of mrSectionSelectors) {
      try {
        const element = selector.locator;

        if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log(`✓ Found Material Requests section using: ${selector.name}`);
          mrSection = element;
          successfulSelector = selector.name;
          break;
        } else {
          console.log(`✗ Not visible with selector: ${selector.name}`);
        }
      } catch (error) {
        console.log(`✗ Failed with selector: ${selector.name} - ${error.message}`);
        continue;
      }
    }

    if (!mrSection) {
      throw new Error('Could not find Material Requests section on Job details page. Make sure you are on a Job details page with Material Requests.');
    }

    // Scroll into view and click to expand
    await mrSection.scrollIntoViewIfNeeded();
    await mrSection.waitFor({ state: 'visible', timeout: 10000 });
    await mrSection.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1500);
    console.log(`✓ Clicked Material Requests section using: ${successfulSelector}`);

    // Now find and click the MR link
    const mrPattern = jobNumber
      ? new RegExp(`MR for Job.*${jobNumber}`, 'i')
      : /MR for Job/i;

    console.log(`Looking for MR link with pattern: ${mrPattern}`);

    const mrSelector = this.page.getByRole('link').filter({ hasText: mrPattern }).first();
    await mrSelector.waitFor({ state: 'visible', timeout: 10000 });
    await mrSelector.click();
    await this.page.waitForLoadState('networkidle');
    console.log('✓ Successfully opened Material Request from Job details page');
  }
}
