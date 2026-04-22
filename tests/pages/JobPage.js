import { dismissOverlays as dismissOverlaysHelper, forceRemoveOverlays, waitForOverlayToDisappear } from '../Helper/overlay-helper.js';

export class JobPage {
  constructor(page) {
    this.page = page;
    this.menuIcon = page.locator('#job_group:visible');
    this.jobsLink = page.getByRole('link', { name: 'Jobs', exact: true });
    this.newJobButton = page.locator('a[href="/jobs/new"]').first();
    this.searchInput = page.locator('z-view').getByRole('textbox', { name: 'Search' });
    this.moreActionsLink = page.locator('a').filter({ hasText: 'More Actions' });
    this.cloneJobMenuItem = page.getByRole('menuitem', { name: ' Clone Job' });
    this.assignUsersLink = page.locator('a').filter({ hasText: /^Assign Users$/ });
    this.usersTab = page.getByText('Users (12)');
    this.userSearchBox = page.getByRole('searchbox', { name: 'Search...' });
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.createJobLink = page.getByText('Create Job', { exact: true });

    // Job creation form elements
    this.jobTitleInput = page.getByRole('textbox', { name: 'Job Title *' });
    this.dueDateInput = page.getByRole('textbox', { name: 'Due Date' });
    this.addOrganizationLink = page.locator('a').filter({ hasText: /^Add Organization$/ });
    this.searchOrganizationsInput = page.getByRole('textbox', { name: 'Search Organizations' });
    this.chooseOrganizationButton = page.getByRole('button', { name: 'Choose Organization' });
    this.clickCategoryButton = page.getByText('Choose a Job Category', { exact: true });
    this.categoryOption = page.getByText('Installation Services', { exact: true });   
    this.customFieldTextInput = page.getByRole('textbox', { name: 'Text Input *' });
    this.createBtn = page.getByRole('button', { name: 'Create', exact: true });
    this.lineItemsButton = page.getByRole('button', { name: 'Line Items' });
  }

  async navigateToJobs() {
    // Check if already on jobs page
    const currentUrl = this.page.url();
    if (currentUrl.includes('/jobs') && !currentUrl.includes('/jobs/')) {
      console.log('Already on Jobs listing page, skipping navigation');
      return;
    }

    // Wait for page to stabilize (use timeout to avoid hanging on persistent connections)
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(1000);

    // Dismiss any blocking dialogs (timezone popup, trial modal, etc.)
    await dismissOverlaysHelper(this.page);
    await waitForOverlayToDisappear(this.page, 2000);

    // Try clicking the Jobs Group menu first
    try {
      await this.menuIcon.waitFor({ state: 'visible', timeout: 10000 });
      await this.menuIcon.click();
      await this.page.waitForTimeout(500);

      // Click the Jobs link
      await this.jobsLink.waitFor({ state: 'visible', timeout: 10000 });
      await this.jobsLink.click();
      await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      console.log('✓ Navigated to Jobs page via sidebar');
    } catch (error) {
      console.log('Sidebar navigation failed, trying direct URL...');
      // Fallback: Navigate directly to jobs URL
      await this.page.goto('/jobs');
      await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      console.log('✓ Navigated to Jobs page via URL');
    }
  }

  async searchJob(jobSearchText) {
    // Wait for page to fully load
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(1000);

    // Clear any existing search first
    try {
      const clearButton = this.page.locator('button[aria-label="Clear"]');
      if (await clearButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await clearButton.click();
        await this.page.waitForTimeout(500);
      }
    } catch (error) {
      // No clear button, continue
    }

    // Wait for and interact with search input
    await this.searchInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.searchInput.click();
    await this.searchInput.clear();
    await this.searchInput.fill(jobSearchText);
    await this.searchInput.press('Enter');
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(2000);
  }

  async openJobByNumber(jobNumber) {
    const jobLink = this.page.getByRole('link', { name: jobNumber });
    await jobLink.waitFor({ state: 'visible', timeout: 10000 });
    await jobLink.click();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async cloneJob() {
    await this.moreActionsLink.waitFor({ state: 'visible', timeout: 10000 });
    await this.moreActionsLink.click();
    await this.cloneJobMenuItem.waitFor({ state: 'visible', timeout: 10000 });
    await this.cloneJobMenuItem.click();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async assignUser(userName) {
    await this.assignUsersLink.waitFor({ state: 'visible', timeout: 10000 });
    await this.assignUsersLink.click();

    await this.usersTab.waitFor({ state: 'visible', timeout: 10000 });
    await this.usersTab.click();

    await this.userSearchBox.waitFor({ state: 'visible', timeout: 10000 });
    await this.userSearchBox.click();
    await this.userSearchBox.fill(userName);
    await this.userSearchBox.press('Enter');

    // Wait for search results to load
    await this.page.waitForTimeout(2000);

    // Click on the first user selection icon (green checkmark/plus icon)
    // Using first() to select the first matching element after search
    const userSelection = this.page.locator('.text-xl.text-green-500').first();
    await userSelection.waitFor({ state: 'visible', timeout: 10000 });
    await userSelection.click();

    await this.saveButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.saveButton.click();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async createClonedJob() {
    await this.createJobLink.waitFor({ state: 'visible', timeout: 10000 });
    await this.createJobLink.click();

    await this.createButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.createButton.click();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    console.log('✓ Job cloned successfully');
  }

  async clickNewJob() {
    await this.newJobButton.waitFor({ state: 'visible', timeout: 10000 });

    // Dismiss any blocking dialogs (timezone popup, trial modal, etc.)
    await dismissOverlaysHelper(this.page);
    await waitForOverlayToDisappear(this.page, 2000);

    // Use Promise.all to wait for navigation and click simultaneously
    await Promise.all([
      this.page.waitForURL('**/jobs/new', { timeout: 30000 }),
      this.newJobButton.click(),
    ]);

    // Wait for the form to render
    await this.jobTitleInput.waitFor({ state: 'visible', timeout: 30000 });

    // Wait for network requests carrying category data to finish
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(2000);
  }

  async fillJobBasicInfo(jobData) {
    await this.jobTitleInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.jobTitleInput.click();
    await this.jobTitleInput.fill(jobData.title);
    await this.page.waitForTimeout(500);
    // Wait for any page-level loading spinners to disappear before opening the dropdown
    await this.page.locator('text=Loading').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

    // Open the Job Category dropdown
    await this.clickCategoryButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.clickCategoryButton.click();

    await this.categoryOption.waitFor({ state: 'visible', timeout: 20000 });
    await this.categoryOption.click();
    await this.page.waitForTimeout(500);

    // Handle due date
    if (jobData.dueDate) {
      await this.dueDateInput.click();
      await this.page.waitForTimeout(1000);

      // Click on the specified date button
      const dateButton = this.page.getByRole('button', { name: jobData.dueDate });
      await dateButton.waitFor({ state: 'visible', timeout: 5000 });
      await dateButton.click();

      // Click away to close calendar
      await this.jobTitleInput.click();
    }
  }

  async addOrganizationToJob(organizationName) {
    await this.addOrganizationLink.waitFor({ state: 'visible', timeout: 10000 });
    await this.addOrganizationLink.click();

    await this.searchOrganizationsInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.searchOrganizationsInput.click();
    await this.searchOrganizationsInput.fill(organizationName);
    await this.searchOrganizationsInput.press('Enter');

    // Wait for search results
    await this.page.waitForTimeout(2000);

    // Select the organization from radio buttons
    const orgRadio = this.page.getByRole('radio', { name: organizationName });
    await orgRadio.waitFor({ state: 'visible', timeout: 10000 });
    await orgRadio.check();

    await this.chooseOrganizationButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.chooseOrganizationButton.click();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async addLineItems(products) {
    // Scroll to Part/Service Details section and click Add button for line items
    const addLineItemLink = this.page.locator('#pricelist-ng-select a').filter({ hasText: /^Add$/ });
    await addLineItemLink.scrollIntoViewIfNeeded();
    await addLineItemLink.waitFor({ state: 'visible', timeout: 10000 });
    await addLineItemLink.click();

    // Select "Line Item" from menu
    const lineItemMenuItem = this.page.getByRole('menuitem', { name: 'Line Item', exact: true });
    await lineItemMenuItem.waitFor({ state: 'visible', timeout: 10000 });
    await lineItemMenuItem.click();

    // Wait for product list to load
    await this.page.waitForTimeout(2000);

    // Clear trade type filter so all products are visible (dialog auto-filters by job trade type)
    const tradeTypeFilter = this.page.locator('mat-dialog-container mat-select').nth(1);
    await tradeTypeFilter.click();
    await this.page.getByRole('option', { name: 'Any' }).click();
    await this.page.waitForTimeout(1000);

    // Select products
    for (const productName of products) {
      const checkbox = this.page.getByRole('checkbox', { name: productName });
      await checkbox.waitFor({ state: 'visible', timeout: 10000 });
      await checkbox.scrollIntoViewIfNeeded();
      await checkbox.check();
    }

    // Click Add Product button
    const addProductButton = this.page.getByRole('button', { name: 'Add Product' });
    await addProductButton.waitFor({ state: 'visible', timeout: 10000 });
    await addProductButton.click();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async fillCustomFields(customFieldValue) {
    // Fill custom field
    await this.customFieldTextInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.customFieldTextInput.click();
    await this.customFieldTextInput.fill(customFieldValue);
  }

  async createJob() {
    // Wait for page to stabilize before creating job
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(1500);

    // Multiple strategies to find and click the Create Job button (based on ChroPath analysis)
    const strategies = [
      // Strategy 1: getByText with exact match
      { locator: this.page.getByText('Create Job', { exact: true }), name: 'getByText exact' },
      // Strategy 2: getByText without exact
      { locator: this.page.getByText('Create Job'), name: 'getByText' },
      // Strategy 3: span:has-text
      { locator: this.page.locator('span:has-text("Create Job")'), name: 'span:has-text' },
      // Strategy 4: :text-is selector
      { locator: this.page.locator(':text-is("Create Job")'), name: ':text-is' },
      // Strategy 5: :text selector
      { locator: this.page.locator(':text("Create Job")'), name: ':text' },
      // Strategy 6: CSS selector from ChroPath
      { locator: this.page.locator('span.primary-font.text-base.mt-0\\.5.ml-2'), name: 'CSS class selector' }
    ];

    let clicked = false;

    for (const strategy of strategies) {
      try {
        const isVisible = await strategy.locator.isVisible({ timeout: 3000 }).catch(() => false);
        if (isVisible) {
          console.log(`✓ Found Create Job button using: ${strategy.name}`);
          await strategy.locator.scrollIntoViewIfNeeded();
          await strategy.locator.click();
          console.log(`✓ Clicked Create Job button using: ${strategy.name}`);
          clicked = true;
          break;
        }
      } catch (error) {
        console.log(`⚠️  Strategy "${strategy.name}" failed: ${error.message}`);
        continue;
      }
    }

    if (!clicked) {
      throw new Error('Failed to find and click Create Job button with all strategies');
    }

    await this.createBtn.scrollIntoViewIfNeeded();
    await this.createBtn.click();
    console.log('✓ Clicked Create button (text locator)');

    // Wait for page to load after creating job
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(2000);

    console.log('✓ Job created successfully');
  }

  async verifyJobDetails(expectedData) {
    const { expect } = await import('@playwright/test');

    // Verify URL
    await expect(this.page).toHaveURL(/\/jobs\/.*\/details/);

    // Verify job category
    if (expectedData.category) {
      await expect(this.page.getByRole('definition').filter({ hasText: expectedData.category })).toBeVisible();
    }

    // Verify assignee
    if (expectedData.assignee) {
      await expect(this.page.getByText(expectedData.assignee)).toBeVisible();
    }

    // Verify status
    if (expectedData.status) {
      await expect(this.page.getByText(expectedData.status, { exact: true })).toBeVisible();
    }

    // Verify organization
    if (expectedData.organization) {
      await expect(this.page.getByText(expectedData.organization, { exact: true }).first()).toBeVisible();
    }

    console.log('✓ Job details verified successfully');
  }

  async verifyLineItems(products) {
    const { expect } = await import('@playwright/test');

    // Click Line Items tab

    await this.lineItemsButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.lineItemsButton.click();

    // Verify each product
    for (const productName of products) {
      await expect(this.page.getByRole('link', { name: productName })).toBeVisible();
    }

    console.log('✓ Line items verified successfully');
  }

  async requestMaterialFromJob(products) {
    // Click Request button
    const requestLink = this.page.locator('a').filter({ hasText: /^Request$/ });
    await requestLink.waitFor({ state: 'visible', timeout: 10000 });
    await requestLink.click();

    // Select Material Request option
    const materialRequestMenuItem = this.page.getByRole('menuitem', { name: 'Material Request' });
    await materialRequestMenuItem.waitFor({ state: 'visible', timeout: 10000 });
    await materialRequestMenuItem.click();

    // Wait for product list to load
    await this.page.waitForTimeout(2000);

    // Select products
    for (const productName of products) {
      const checkbox = this.page.getByRole('checkbox', { name: productName });
      await checkbox.waitFor({ state: 'visible', timeout: 10000 });
      await checkbox.scrollIntoViewIfNeeded();
      await checkbox.check();
    }

    // Click Add button
    const addButton = this.page.getByRole('button', { name: 'Add' });
    await addButton.waitFor({ state: 'visible', timeout: 10000 });
    await addButton.click();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    console.log('✓ Material request initiated from job');
  }

  async updateJobStatus(newStatus, answerNo = false) {
    // Click Status History
    await this.page.getByText('Status History', { exact: true }).click();
    await this.page.waitForTimeout(1000);

    // Select new status
    const statusDropdown = this.page.locator('#job_status').getByRole('textbox');
    await statusDropdown.waitFor({ state: 'visible', timeout: 10000 });
    await statusDropdown.click();

    const statusOption = this.page.getByRole('option', { name: newStatus });
    await statusOption.waitFor({ state: 'visible', timeout: 10000 });
    await statusOption.click();

    // Handle any confirmation dialogs if needed
    await this.page.waitForTimeout(1000);

    // If there's a warning about closing dependencies, remove them
    const removeAllLink = this.page.locator('a').filter({ hasText: 'Remove All' });
    if (await removeAllLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await removeAllLink.click();
      const removeButton = this.page.getByRole('button', { name: 'Remove' });
      await removeButton.waitFor({ state: 'visible', timeout: 5000 });
      await removeButton.click();
      await this.page.waitForTimeout(1000);

      // Clear and select status again
      const clearAllButton = this.page.getByTitle('Clear all');
      await clearAllButton.click();
      await statusDropdown.click();
      await statusOption.click();
    }

    // Answer custom field questions if required (for completed status)
    if (answerNo) {
      await this.page.waitForTimeout(1000);
      const noRadioButtons = this.page.getByRole('radio', { name: 'No' });
      const count = await noRadioButtons.count();
      for (let i = 0; i < count; i++) {
        await noRadioButtons.nth(i).check();
      }
    }

    // Click Update button
    const updateButton = this.page.getByRole('button', { name: 'Update', exact: true });
    await updateButton.waitFor({ state: 'visible', timeout: 10000 });
    await updateButton.click();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    console.log(`✓ Job status updated to ${newStatus}`);
  }

  async getJobNumber() {
    const titleElement = this.page.locator('h1, .job-title');
    await titleElement.waitFor({ state: 'visible', timeout: 10000 });
    const jobNumber = await titleElement.textContent();
    console.log(`📋 Job Number: ${jobNumber}`);
    return jobNumber.trim();
  }
}
