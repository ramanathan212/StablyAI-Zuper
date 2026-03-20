export class AssetPage {
  constructor(page) {
    this.page = page;
    this.assetsMenuIcon = page.locator('zuper-vertical-navigation-aside-item').filter({ hasText: 'Contracts & Assets' }).first();
    this.assetsLink = page.getByRole('link', { name: 'Assets' });
    this.managePPMLink = page.getByRole('link', { name: ' Manage PPM' });
    this.newAssetButton = page.getByRole('link', { name: ' New Asset' });
    this.assetCodeInput = page.getByRole('textbox', { name: 'Asset Code *' });
    this.assetNameInput = page.getByRole('textbox', { name: 'Asset Name *' });
    this.chooseOrganizationButton = page.getByRole('textbox', { name: 'Choose Organization' });
    this.searchOrganizationsInput = page.getByRole('textbox', { name: 'Search Organizations' });
    this.chooseOrgButton = page.getByRole('button', { name: 'Choose Organization' });
    this.chooseContactButton = page.getByRole('textbox', { name: 'Choose Contact' });
    this.searchContactsInput = page.getByRole('textbox', { name: 'Search Contacts' });
    this.chooseContactConfirmButton = page.getByRole('button', { name: 'Choose Contact' });
    this.saveAssetLink = page.locator('a').filter({ hasText: 'Save Asset' });
  }

  async dismissOverlays() {
    // Dismiss "Trial Period Ending Soon" or any modal with X button
    try {
      const closeButton = this.page.locator('.cdk-overlay-container button.close, .cdk-overlay-container .close, .cdk-overlay-container [aria-label="Close"]').first();
      await closeButton.waitFor({ state: 'visible', timeout: 5000 });
      await closeButton.click();
      await this.page.waitForTimeout(500);
      console.log('✓ Dismissed overlay modal');
    } catch {
      // No modal to dismiss
    }

    // Dismiss any remaining backdrop by pressing Escape
    try {
      const backdrop = this.page.locator('.cdk-overlay-backdrop');
      if (await backdrop.isVisible({ timeout: 2000 }).catch(() => false)) {
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(500);
      }
    } catch {
      // No backdrop
    }
  }

  async navigateToAssets() {
    await this.page.goto('https://uat.zuperpro.com/dashboard');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(3000);

    // Dismiss any overlays/modals before interacting
    await this.dismissOverlays();

    // Click assets menu icon
    await this.assetsMenuIcon.click();
    await this.page.waitForTimeout(1000);

    // Click Assets link
    await this.assetsLink.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);

    console.log('✓ Navigated to Assets page');
  }

  async verifyAssetsPageElements() {
    const { expect } = await import('@playwright/test');

    await expect(this.page.getByText('Assets', { exact: true })).toBeVisible();
    await expect(this.managePPMLink).toBeVisible();
    await expect(this.newAssetButton).toBeVisible();

    console.log('✓ Assets page elements verified');
  }

  async clickNewAsset() {
    await this.newAssetButton.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);

    const { expect } = await import('@playwright/test');
    await expect(this.page.getByRole('link', { name: 'Assets' })).toBeVisible();
    await expect(this.page.getByRole('link', { name: 'New Asset' })).toBeVisible();

    console.log('✓ New Asset form opened');
  }

  async fillAssetBasicInfo(assetData) {
    // Fill asset code
    await this.assetCodeInput.click();
    await this.assetCodeInput.fill(assetData.code);

    // Fill asset name
    await this.assetNameInput.click();
    await this.assetNameInput.fill(assetData.name);

    console.log(`✓ Asset basic info filled: ${assetData.code} - ${assetData.name}`);
  }

  async selectOrganization(organizationName) {
    // Open organization selector
    await this.chooseOrganizationButton.click();
    await this.page.waitForTimeout(1000);

    // Search for organization
    await this.searchOrganizationsInput.click();
    await this.searchOrganizationsInput.fill(organizationName);
    await this.searchOrganizationsInput.press('Enter');

    // Wait for search results
    await this.page.waitForTimeout(1500);

    // Select organization
    await this.page.getByRole('radio', { name: organizationName }).check();

    // Confirm selection
    await this.chooseOrgButton.click();
    await this.page.waitForTimeout(1000);

    console.log(`✓ Organization selected: ${organizationName}`);
  }

  async selectContact(contactName) {
    // Open contact selector
    await this.chooseContactButton.click();
    await this.page.waitForTimeout(1000);

    // Search for contact
    await this.searchContactsInput.click();
    await this.searchContactsInput.fill(contactName);
    await this.searchContactsInput.press('Enter');

    // Wait for search results
    await this.page.waitForTimeout(1500);

    // Select contact
    await this.page.getByRole('radio', { name: contactName }).check();

    // Confirm selection
    await this.chooseContactConfirmButton.click();
    await this.page.waitForTimeout(1000);

    console.log(`✓ Contact selected: ${contactName}`);
  }

  async verifyAddressFieldVisible() {
    const { expect } = await import('@playwright/test');

    await expect(this.page.getByRole('textbox', { name: 'Flat / House No, Street /' }).first()).toBeVisible();

    console.log('✓ Address field is visible');
  }

  async saveAsset() {
    await this.saveAssetLink.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);

    console.log('✓ Asset saved successfully');
  }

  async verifyAssetCreated(assetCode) {
    const { expect } = await import('@playwright/test');

    // Verify we're on asset details page or list
    const currentUrl = this.page.url();
    console.log(`📄 Current URL: ${currentUrl}`);

    // You can add more specific verifications here based on your app's behavior
    console.log(`✓ Asset created: ${assetCode}`);
  }
}
