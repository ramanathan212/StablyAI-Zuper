export class SettingsPage {
  constructor(page) {
    this.page = page;
    this.settingsLink = page.getByRole('link').filter({ hasText: 'Settings' });
    this.tryNowButton = page.getByRole('link', { name: 'Try Now' });
    this.searchInput = page.getByRole('complementary').getByRole('textbox', { name: 'Search' });
    this.clearSearchButton = page.locator('i').nth(2);
  }

  async navigateToSettings() {
    await this.page.goto('https://uat.zuperpro.com/dashboard');
    await this.page.waitForLoadState('networkidle');
    await this.settingsLink.click();
    await this.tryNowButton.click();
    await this.page.waitForLoadState('networkidle');
    console.log('✓ Navigated to Settings');
  }

  async searchSettings(searchTerm) {
    await this.searchInput.click();
    await this.searchInput.fill(searchTerm);
    await this.searchInput.press('Enter');
    await this.page.waitForTimeout(1000);
    console.log(`✓ Searched for: ${searchTerm}`);
  }

  async clearSearch() {
    await this.clearSearchButton.click();
    await this.page.waitForTimeout(500);
    console.log('✓ Search cleared');
  }

  async verifyJobSearchResults() {
    const { expect } = await import('@playwright/test');

    await expect(this.page.getByRole('link', { name: ' General Job Settings' })).toBeVisible();
    await expect(this.page.locator('span').filter({ hasText: 'Job Category Hub' }).first()).toBeVisible;
    await expect(this.page.getByRole('link', { name: ' Job Card Templates' })).toBeVisible();
    await expect(this.page.getByRole('link', { name: ' Job Notifications' })).toBeVisible();
    await expect(this.page.getByRole('link', { name: ' Job Costing & Expenses' })).toBeVisible();
    await expect(this.page.getByRole('link', { name: ' Non Job Event Categories' })).toBeVisible();

    console.log('✓ Job search results verified');
  }

  async verifyUsersSearchResults() {
    const { expect } = await import('@playwright/test');

    await expect(this.page.getByRole('link', { name: ' General Settings' })).toBeVisible();
    await expect(this.page.getByRole('link', { name: ' User Management' })).toBeVisible();
    await expect(this.page.getByRole('link', { name: ' Custom Roles' })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: ' Users & Teams' })).toBeVisible();

    console.log('✓ Users search results verified');
  }

  async verifyPurchasingSearchResults() {
    const { expect } = await import('@playwright/test');

    await expect(this.page.getByRole('heading', { name: ' Modules' })).toBeVisible();
    await expect(this.page.getByRole('link', { name: ' Parts & Services' })).toBeVisible();
    await expect(this.page.getByRole('link', { name: 'ﰖ Purchasing' })).toBeVisible();

    console.log('✓ Purchasing search results verified');
  }

  async clickPurchasingLink() {
    await this.page.getByRole('link', { name: 'ﰖ Purchasing' }).click();
    await this.page.waitForLoadState('networkidle');
    console.log('✓ Clicked Purchasing link');
  }

  async verifyPurchasingDetailsPage() {
    const { expect } = await import('@playwright/test');

    await expect(this.page.locator('div').filter({ hasText: /^Purchasing$/ })).toBeVisible();
    await expect(this.page.getByText('General SettingsManage')).toBeVisible();
    await expect(this.page.getByText('Vendor Custom FieldsManage')).toBeVisible();
    await expect(this.page.getByText('Material Request Custom FieldsManage custom fields for Material Request')).toBeVisible();
    await expect(this.page.getByText('Purchase Order Custom FieldsManage custom fields for Purchase Order')).toBeVisible();
    await expect(this.page.getByText('Purchase Order TemplatesManage Purchase Order Templates')).toBeVisible();

    console.log('✓ Purchasing details page verified');
  }

  async verifyProjectSearchResults() {
    const { expect } = await import('@playwright/test');

    await expect(this.page.getByRole('heading', { name: ' Projects' })).toBeVisible();
    await expect(this.page.getByRole('link', { name: ' Project General Settings' })).toBeVisible();
    await expect(this.page.getByRole('link', { name: ' Project Category' })).toBeVisible();

    console.log('✓ Project search results verified');
  }

  async verifyPartsSearchResults() {
    const { expect } = await import('@playwright/test');

    await expect(this.page.getByRole('heading', { name: ' Parts & Services' })).toBeVisible();
    await expect(this.page.getByRole('link', { name: ' Parts & Services General' })).toBeVisible();

    console.log('✓ Parts search results verified');
  }

  async clickPartsServicesLink() {
    await this.page.getByRole('link', { name: ' Parts & Services General' }).click();
    await this.page.waitForLoadState('networkidle');
    console.log('✓ Clicked Parts & Services General link');
  }

  async verifyPartsServicesDetailsPage() {
    const { expect } = await import('@playwright/test');

    await expect(this.page.getByText('Parts & Services Settings')).toBeVisible();
    await expect(this.page.getByTitle('Parts & Services General')).toBeVisible();

    console.log('✓ Parts & Services details page verified');
  }

  async verifyImportSearchResults() {
    const { expect } = await import('@playwright/test');

    await expect(this.page.getByRole('heading', { name: ' Data Administration' })).toBeVisible();
    await expect(this.page.getByRole('link', { name: ' Data Import' })).toBeVisible();

    console.log('✓ Import search results verified');
  }

  async verifyRequestSearchResults() {
    const { expect } = await import('@playwright/test');

    await expect(this.page.getByRole('heading', { name: ' Requests' })).toBeVisible();
    await expect(this.page.getByRole('link', { name: ' Request Status' })).toBeVisible();

    console.log('✓ Request search results verified');
  }

  async navigateBackToWorkspace() {
    await this.page.locator('a').filter({ hasText: 'Back to Workspace' }).click();
    await this.page.waitForLoadState('networkidle');

    const { expect } = await import('@playwright/test');
    await expect(this.page.getByRole('navigation').getByText('Dashboard')).toBeVisible();

    console.log('✓ Navigated back to workspace');
  }
}
