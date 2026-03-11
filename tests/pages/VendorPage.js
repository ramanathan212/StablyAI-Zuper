import { LoginPage } from './LoginPage.js';
import { testData } from '../test-data.js';

export class VendorPage {
  constructor(page) {
    this.page = page;
    this.cancelTimezoneButton = page.getByRole('button', { name: 'Cancel' });
    // Purchasing icon in left sidebar (shopping cart icon)
    this.purchasingMenu = page.locator('a[href*="/purchasing"], a[href*="/vendors"]').first();
    this.vendorsLink = page.getByRole('link', { name: 'Vendors' });
    this.newVendorButton = page.getByRole('link', { name: ' New Vendor' });
    this.vendorNameInput = page.getByRole('textbox', { name: 'Vendor Name *' });
    this.vendorContactNameInput = page.getByRole('textbox', { name: 'Vendor Contact Name *' });
    this.vendorEmailInput = page.getByRole('textbox', { name: 'Vendor Email *' });
    this.vendorWorkNumberInput = page.getByRole('textbox', { name: 'Vendor Work Number *' });
    this.leadTimeInput = page.getByRole('spinbutton', { name: 'Lead Time' });
    this.addProductsLink = page.locator('a').filter({ hasText: /^Add$/ });
    this.nextButton = page.getByRole('button', { name: 'Next', exact: true });
    this.addItemButton = page.getByRole('button', { name: 'Add Item' });
    this.addBillingAddressLink = page.getByLabel('Billing Address').locator('a').filter({ hasText: 'Add Billing Address' });
    this.addressInput = page.getByRole('searchbox', { name: 'Search Address' });
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.addBankDetailsLink = page.locator('a').filter({ hasText: /^Add Bank Details$/ });
    this.accountNameInput = page.getByRole('textbox', { name: 'Name on Account *' });
    this.accountNumberInput = page.getByRole('textbox', { name: 'Account Number *' });
    this.bankNameInput = page.getByRole('textbox', { name: 'Bank Name *' });
    this.branchIdentifierInput = page.getByRole('textbox', { name: 'Branch Identifier *' });
    this.remarksInput = page.getByRole('textbox', { name: 'Remarks' });
    this.addBankButton = page.getByRole('button', { name: 'Add Bank' });
    this.saveVendorLink = page.locator('a').filter({ hasText: 'Save Vendor' });
    this.createVendorButton = page.getByRole('button', { name: 'Create Vendor' });
  }

  // Auto-heal: detect if redirected to login and re-authenticate
  async _reLoginIfNeeded() {
    const url = this.page.url();
    if (url.includes('/login')) {
      console.log('⚠️  Session expired — auto-healing: re-logging in...');
      const loginPage = new LoginPage(this.page);
      await loginPage.login(testData.login.companyName, testData.login.email, testData.login.password);
      await loginPage.dismissOnboarding();
      console.log('✓ Re-login successful');
      return true;
    }
    return false;
  }

  async navigateToVendors() {
    await this.page.goto('/vendors');
    await this.page.waitForLoadState('domcontentloaded');

    // Auto-heal: if redirected to login, re-authenticate and retry
    if (await this._reLoginIfNeeded()) {
      await this.page.goto('/vendors');
      await this.page.waitForLoadState('domcontentloaded');
    }

    // Check if timezone cancel button exists and click it if visible
    try {
      const isVisible = await this.cancelTimezoneButton.isVisible({ timeout: 5000 });
      if (isVisible) {
        await this.cancelTimezoneButton.click();
        console.log('✓ Timezone dialog dismissed');
        await this.page.waitForTimeout(1000);
      }
    } catch (error) {
      console.log('No timezone dialog to dismiss, continuing...');
    }

    await this.page.waitForLoadState('networkidle');
  }

  async clickNewVendor() {
    // Auto-heal: if session expired before clicking New Vendor, re-login and re-navigate
    if (await this._reLoginIfNeeded()) {
      await this.navigateToVendors();
    }
    await this.newVendorButton.click();
  }

  async fillVendorBasicInfo(vendorData) {
    await this.vendorNameInput.click();
    await this.vendorNameInput.fill(vendorData.name);
    await this.vendorContactNameInput.click();
    await this.vendorContactNameInput.fill(vendorData.contactName);
    await this.vendorEmailInput.click();
    await this.vendorEmailInput.fill(vendorData.email);
    await this.vendorWorkNumberInput.click();
    await this.vendorWorkNumberInput.fill(vendorData.workNumber);
    await this.leadTimeInput.click();
    await this.leadTimeInput.fill(vendorData.leadTime);
  }

  async addProducts(products) {
    await this.addProductsLink.click();
    await this.page.waitForTimeout(1000);

    // Wait for the product table to be loaded
    await this.page.waitForSelector('input[type="checkbox"]', { timeout: 10000 });

    // Select products by checking checkboxes
    for (const product of products) {
      // Extract product code (e.g., "#T1 - 001 -" from the name)
      const productCode = product.name.trim();

      let found = false;

      // Strategy 1: Try to find the row containing the product code and click its checkbox
      try {
        // Find the row that contains the product code text
        const row = this.page.locator('tr').filter({ hasText: productCode });
        const checkbox = row.locator('input[type="checkbox"]').first();

        // Check if the row exists
        const count = await row.count();
        if (count > 0) {
          await checkbox.waitFor({ state: 'visible', timeout: 5000 });
          await checkbox.check();
          console.log(`✓ Selected product: ${product.name}`);
          found = true;
        }
      } catch (error) {
        console.log(`Strategy 1 failed for ${product.name}: ${error.message}`);
      }

      // Strategy 2: If not found, try searching all checkboxes
      if (!found) {
        const checkboxes = await this.page.getByRole('checkbox').all();

        for (const checkbox of checkboxes) {
          // Get the closest table row
          const row = checkbox.locator('xpath=ancestor::tr[1]');
          const rowText = await row.textContent().catch(() => '');

          // Check if the row contains the product code
          if (rowText.includes(productCode)) {
            await checkbox.waitFor({ state: 'visible', timeout: 10000 });
            await checkbox.check();
            console.log(`✓ Selected product: ${product.name}`);
            found = true;
            break;
          }
        }
      }

      if (!found) {
        // Debug: Log all available rows with product information
        console.log(`\nDEBUG: Could not find checkbox for product: ${product.name}`);
        console.log('Available products in table:');
        const rows = await this.page.locator('tr').all();
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const rowText = await rows[i].textContent().catch(() => 'N/A');
          console.log(`  [${i}] Row text: "${rowText.substring(0, 150)}..."`);
        }
        throw new Error(`Could not find checkbox for product: ${product.name}`);
      }

      await this.page.waitForTimeout(500);
    }

    await this.nextButton.click();
    await this.page.waitForTimeout(1000);

    // Fill SKU for each product using index-based approach
    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      // Get all SKU inputs and use the index
      const allSkuInputs = this.page.getByPlaceholder('Eg:');
      const skuInput = allSkuInputs.nth(i);

      await skuInput.waitFor({ state: 'visible', timeout: 10000 });
      await skuInput.click();
      await skuInput.fill(product.sku);
      console.log(`✓ Filled SKU for ${product.name}: ${product.sku}`);
    }

    await this.addItemButton.click();
    await this.page.waitForTimeout(1000);
    console.log('✓ Products added successfully');
  }

  async addBillingAddress() {
    await this.addBillingAddressLink.click();
    await this.page.waitForTimeout(2000);

    // Fill street address to trigger autocomplete
    const streetInput = this.page.getByRole('textbox', { name: /street|address/i }).first();
    await streetInput.waitFor({ state: 'visible', timeout: 10000 });
    await streetInput.click();
    await streetInput.fill('123 Test Street');
    await this.page.waitForTimeout(1000);

    // Click on the address suggestion
    const addressSuggestion = this.page.getByText('Test St, Waconia, MN, USA');
    await addressSuggestion.waitFor({ state: 'visible', timeout: 10000 });
    await addressSuggestion.click();
    await this.page.waitForTimeout(1000);

    // Click Add button
    await this.addButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.addButton.click();

    // Wait for the operation to complete
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
    console.log('✓ Billing address added');
  }

  async addBankDetails(bankData) {
    // Wait for Add Bank Details link to be visible before clicking
    await this.addBankDetailsLink.waitFor({ state: 'visible', timeout: 10000 });

    // Verify it's visible and scroll if needed
    const isVisible = await this.addBankDetailsLink.isVisible();
    if (isVisible) {
      await this.addBankDetailsLink.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(1000);
      await this.addBankDetailsLink.click();
    } else {
      throw new Error('Add Bank Details link is not visible');
    }

    await this.accountNameInput.fill(bankData.accountName);
    await this.accountNumberInput.click();
    await this.accountNumberInput.fill(bankData.accountNumber);
    await this.bankNameInput.click();
    await this.bankNameInput.fill(bankData.bankName);
    await this.branchIdentifierInput.click();
    await this.branchIdentifierInput.fill(bankData.branchIdentifier);
    await this.remarksInput.click();
    await this.remarksInput.fill(bankData.remarks);
    await this.addBankButton.click();
  }

  async saveVendor() {
    await this.saveVendorLink.click();
    await this.createVendorButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getSuccessMessage() {
    return this.page.locator('.success-message, .toast-success').textContent();
  }
}
