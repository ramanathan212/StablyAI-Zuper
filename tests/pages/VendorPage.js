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

  async navigateToVendors() {
    // Direct navigation to vendors page
    await this.page.goto('/vendors');
    await this.page.waitForLoadState('domcontentloaded');

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

    for (const product of products) {
      const checkbox = this.page.getByRole('checkbox', { name: new RegExp(`Product Image ${product.name}`) });
      await checkbox.check();
    }

    await this.nextButton.click();

    for (const product of products) {
      const region = this.page.getByRole('region', { name: new RegExp(`Product Image ${product.name}`) });
      const skuInput = region.getByPlaceholder('Eg:');
      await skuInput.click();
      await skuInput.fill(product.sku);
    }

    await this.addItemButton.click();
  }

  async addBillingAddress(addressData) {
    await this.addBillingAddressLink.click();
    await this.page.waitForTimeout(2000);

    // Try multiple strategies to interact with the address form
    let addressAdded = false;

    // Strategy 1: Try to use the search address field directly (visible in screenshot)
    try {
      const searchAddressInput = this.page.getByRole('textbox', { name: /search address/i });
      if (await searchAddressInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchAddressInput.click();
        await searchAddressInput.fill(addressData.search || 'turya');
        await this.page.waitForTimeout(2000);

        // Try to click on the first suggestion
        const firstSuggestion = this.page.locator('.pac-item, .address-suggestion').first();
        if (await firstSuggestion.isVisible({ timeout: 3000 }).catch(() => false)) {
          await firstSuggestion.click();
          addressAdded = true;
        }
      }
    } catch (error) {
      console.log('Search address input not found, trying map...');
    }

    // Strategy 2: Try clicking on the map if search didn't work
    if (!addressAdded) {
      try {
        // Try different map selectors
        const mapSelectors = [
          '.gm-style',
          'div[role="region"][aria-label*="Map"]',
          '.map-container',
          'canvas.gm-style',
          '.gm-style > div'
        ];

        for (const selector of mapSelectors) {
          const mapElement = this.page.locator(selector).first();
          if (await mapElement.isVisible({ timeout: 5000 }).catch(() => false)) {
            await mapElement.click({ position: { x: 100, y: 100 } });
            await this.page.waitForTimeout(2000);
            addressAdded = true;
            console.log(`✓ Clicked on map using selector: ${selector}`);
            break;
          }
        }
      } catch (error) {
        console.log('Map click failed:', error.message);
      }
    }

    // Strategy 3: Fill address fields manually if both above failed
    if (!addressAdded) {
      console.log('Trying to fill address fields manually...');
      try {
        // Fill street address
        const streetInput = this.page.getByRole('textbox', { name: /street|address/i }).first();
        if (await streetInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await streetInput.fill('123 Test Street');
        }

        // Click on Test St, Waconia, MN, USA address suggestion
        await this.page.getByText('Test St, Waconia, MN, USA').click();
    

        // Fill city
        const cityInput = this.page.getByRole('textbox', { name: /city/i }).first();
        if (await cityInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await cityInput.fill('Test City');
        }

        addressAdded = true;
      } catch (error) {
        console.log('Manual address fill failed:', error.message);
      }
    }

    // Wait a bit for form to update
    await this.page.waitForTimeout(2000);

    // Click Add button
    await this.addButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.addButton.click();

    // Wait for the add operation to complete and modal to close
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);

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

    // // Close attachment modal if it appears
    // const backdrop = this.page.locator('.cdk-overlay-backdrop');
    // if (await backdrop.isVisible({ timeout: 2000 }).catch(() => false)) {
    //   await backdrop.click();
    // }

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
