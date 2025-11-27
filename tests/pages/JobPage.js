export class JobPage {
  constructor(page) {
    this.page = page;
    this.menuIcon = page.locator('.mat-mdc-tooltip-trigger > .mat-icon > svg > path:nth-child(2)').first();
    this.jobsLink = page.getByRole('link', { name: 'Jobs', exact: true });
    this.searchInput = page.locator('z-view').getByRole('textbox', { name: 'Search' });
    this.moreActionsLink = page.locator('a').filter({ hasText: 'More Actions' });
    this.cloneJobMenuItem = page.getByRole('menuitem', { name: ' Clone Job' });
    this.assignUsersLink = page.locator('a').filter({ hasText: /^Assign Users$/ });
    this.usersTab = page.getByText('Users (12)');
    this.userSearchBox = page.getByRole('searchbox', { name: 'Search...' });
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.createJobLink = page.locator('a').filter({ hasText: 'Create Job' });
    this.createButton = page.getByRole('button', { name: 'Create' });
  }

  async navigateToJobs() {
    // Check if already on jobs page
    const currentUrl = this.page.url();
    if (currentUrl.includes('/jobs') && !currentUrl.includes('/jobs/')) {
      console.log('Already on Jobs listing page, skipping navigation');
      return;
    }

    // Try clicking the sidebar navigation first
    try {
      await this.menuIcon.waitFor({ state: 'visible', timeout: 5000 });
      await this.menuIcon.click();

      // Use more specific selector for sidebar Jobs link
      const sidebarJobsLink = this.page.locator('#zuper-vertical-navigation-aside').getByRole('link', { name: 'Jobs', exact: true });
      await sidebarJobsLink.waitFor({ state: 'visible', timeout: 10000 });
      await sidebarJobsLink.click();
      await this.page.waitForLoadState('networkidle');
    } catch (error) {
      // Fallback: Use breadcrumb if sidebar fails
      console.log('Sidebar navigation failed, trying breadcrumb...');
      const breadcrumbJobsLink = this.page.getByLabel('Breadcrumb').getByRole('link', { name: 'Jobs' });
      if (await breadcrumbJobsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await breadcrumbJobsLink.click();
        await this.page.waitForLoadState('networkidle');
      } else {
        throw new Error('Could not navigate to Jobs page');
      }
    }
  }

  async searchJob(jobSearchText) {
    // Wait for page to fully load
    await this.page.waitForLoadState('networkidle');
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
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
  }

  async openJobByNumber(jobNumber) {
    const jobLink = this.page.getByRole('link', { name: jobNumber });
    await jobLink.waitFor({ state: 'visible', timeout: 10000 });
    await jobLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  async cloneJob() {
    await this.moreActionsLink.waitFor({ state: 'visible', timeout: 10000 });
    await this.moreActionsLink.click();
    await this.cloneJobMenuItem.waitFor({ state: 'visible', timeout: 10000 });
    await this.cloneJobMenuItem.click();
    await this.page.waitForLoadState('networkidle');
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
    await this.page.waitForLoadState('networkidle');
  }

  async createClonedJob() {
    await this.createJobLink.waitFor({ state: 'visible', timeout: 10000 });
    await this.createJobLink.click();

    await this.createButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.createButton.click();
    await this.page.waitForLoadState('networkidle');

    console.log('✓ Job cloned successfully');
  }
}
