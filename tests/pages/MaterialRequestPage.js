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
    this.saveAndSubmitButton = page.getByText('Save & Submit');
    this.markSubmittedButton = page.getByRole('button', { name: 'Mark as Submitted' });
    this.nextButton = page.getByRole('button', { name: 'Next' });
    this.createPOButton = page.getByRole('button', { name: 'Create Purchase Order' });
  }

  async navigateToMaterialRequests() {
    // Direct navigation to material requests page
    await this.page.goto('/material_requests');
    await this.page.waitForLoadState('networkidle');
  }

  async clickNewMaterialRequest() {
    await this.page.waitForLoadState('networkidle');
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
      await this.page.waitForLoadState('networkidle');
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

    await this.page.waitForLoadState('networkidle');
    console.log('✓ Successfully on New Material Request page');
  }

  async fillMRBasicInfo(mrData) {
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

    await searchInput.click();
    await searchInput.fill(jobSearch);
    await searchInput.press('Enter');

    // Wait for search results to load
    await this.page.waitForLoadState('networkidle');
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
      const checkbox = this.page.getByRole('checkbox', { name: `Product Image ${productName}` });
      await checkbox.waitFor({ state: 'visible', timeout: 35000 });
      await checkbox.scrollIntoViewIfNeeded();
      await checkbox.check();
    }
    await this.addButton.click();

    // Wait for the modal to close and page to stabilize
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(5000);
  }

  async saveAndSubmit() {
    // Wait for page to stabilize after adding products
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);

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
          break;
        }
      }
    } catch (error) {
      console.log('Save & Submit link not found, trying alternative approach...');
    }

    // Strategy 2: If link not found, try the button directly
    if (!saveButtonClicked) {
      try {
        await this.saveAndSubmitButtonClick.waitFor({ state: 'visible', timeout: 10000 });
        await this.saveAndSubmitButtonClick.scrollIntoViewIfNeeded();
        await this.saveAndSubmitButtonClick.click();
        saveButtonClicked = true;
        console.log('✓ Clicked Save & Submit button directly');
      } catch (error) {
        console.log('Direct button click failed');
      }
    }

    if (!saveButtonClicked) {
      throw new Error('Could not find Save & Submit button/link. Please check if the form is complete.');
    }

    // Wait for popup/dialog to appear
    await this.page.waitForTimeout(2000);

    // Step 2: Click the Save & Submit button in the popup/dialog
    try {
      await this.saveAndSubmitButtonClick.waitFor({ state: 'visible', timeout: 15000 });
      await this.saveAndSubmitButtonClick.scrollIntoViewIfNeeded();
      await this.saveAndSubmitButtonClick.click();
      console.log('✓ Material Request submitted successfully');
    } catch (error) {
      // Try alternative selectors for the confirmation button
      const confirmButton = this.page.locator('button:has-text("Save & Submit"), button:has-text("Submit"), button.btn-primary').last();
      if (await confirmButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await confirmButton.click();
        console.log('✓ Material Request submitted using alternative button');
      } else {
        throw new Error('Could not find confirmation button in dialog');
      }
    }

    await this.page.waitForLoadState('networkidle');
  }

  // async markAsSubmitted() {
  //   // Wait for Mark as Submitted button to be visible
  //   await this.markSubmittedButton.waitFor({ state: 'visible', timeout: 10000 });
  //   await this.markSubmittedButton.click();
  //   await this.page.waitForLoadState('networkidle');
  // }

  async createPOFromMR(vendorName) {
      // Wait for page to fully load before starting PO creation
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
    // Click the button to start PO creation
    await this.page.getByRole('button').nth(4).click();
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
    await this.page.waitForLoadState('networkidle');

    // Click Purchase Orders to view created PO
    await this.page.waitForTimeout(1000);
   }

  async openPurchaseOrder() {
    await this.page.getByRole('button', { name: 'Purchase Orders (1)' }).click();

    const page1Promise = this.page.waitForEvent('popup');
    await this.page.getByRole('link', { name: /^PO for/ }).click();
    const page1 = await page1Promise;
    await page1.waitForLoadState('networkidle');

    return page1;
  }

  async getMRNumber() {
    const titleElement = this.page.locator('h1, .mr-title');
    return await titleElement.textContent();
  }
}
