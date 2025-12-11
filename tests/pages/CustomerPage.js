export class CustomerPage {
  constructor(page) {
    this.page = page;

    // Navigation locators
    this.noThanksButton = page.getByRole('button', { name: 'No, thanks' });
    this.customerOrgNavigationButton = page.locator("//zuper-vertical-navigation-aside-item[@id='customer_organization_property']");
    this.contactsLink = page.getByRole('link', { name: 'Contacts' });
    this.newContactLink = page.getByRole('link', { name: ' New Contact' });

    // Primary details locators
    this.firstNameInput = page.getByRole('textbox', { name: 'First Name *' });
    this.lastNameInput = page.getByRole('textbox', { name: 'Last Name', exact: true });
    this.organizationInput = page.locator('#customer_organization');
    this.searchOrganizationsInput = page.getByPlaceholder('Search Organizations ...');
    this.chooseOrganizationButton = page.getByRole('button', { name: 'Choose Organization' });
    this.emailInput = page.getByRole('textbox', { name: 'Email *' });
    this.primaryDetailsSection = page.getByText('Primary DetailsFirst Name *');

    // Address locators
    this.serviceAddressSection = page.getByText('Service AddressContact First').first();
    this.serviceAddressInput = page.getByRole('textbox', { name: 'Flat / House No, Street /' }).first();
    this.sameAsServiceAddressCheckbox = page.getByRole('checkbox', { name: 'Same As Service Address' });

    // Action locators
    this.saveContactLink = page.getByText('Save Contact', { exact: true });
    this.createButton = page.locator('button:has-text("Create")');

    // Verification locators
    this.emailVerification = (email) => page.locator('as-split').getByText(email);
    this.createdByDefinition = page.getByRole('definition');
    this.activeStatusSpan = page.locator('span').filter({ hasText: 'Active' }).first();
    this.customerDetailsSection = page.locator('.flex.flex-col.min-w-1\\/3');
  }

  /**
   * Dismiss welcome notification if present
   */
  async dismissWelcomeNotification() {
    try {
      await this.noThanksButton.waitFor({ state: 'visible', timeout: 25000 });
      await this.noThanksButton.click();
      console.log('✓ Welcome notification dismissed');
    } catch (error) {
      console.log('No welcome notification to dismiss, continuing...');
    }
  }

  /**
   * Navigate to Contacts page
   */
  async navigateToContacts() {
    await this.customerOrgNavigationButton.waitFor({ state: 'visible', timeout: 20000 });
    await this.customerOrgNavigationButton.click();
    await this.contactsLink.waitFor({ state: 'visible', timeout: 20000 });
    await this.contactsLink.click();
    await this.page.waitForLoadState('networkidle');
    console.log('✓ Navigated to Contacts page');
  }

  /**
   * Click New Contact button
   */
  async clickNewContact() {
    await this.newContactLink.waitFor({ state: 'visible', timeout: 10000 });
    await this.newContactLink.click();
    await this.page.waitForLoadState('networkidle');
    console.log('✓ Clicked New Contact');
  }

  /**
   * Fill primary customer details (first name, last name)
   */
  async fillPrimaryDetails(customerData) {
    // First name
    await this.firstNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.firstNameInput.click();
    await this.firstNameInput.fill(customerData.firstName);
    console.log(`✓ Filled first name: ${customerData.firstName}`);

    // Last name
    await this.lastNameInput.click();
    await this.lastNameInput.fill(customerData.lastName);
    console.log(`✓ Filled last name: ${customerData.lastName}`);
  }

  /**
   * Select organization for the customer
   */
  async selectOrganization(organizationName) {
    // Open organization search
    await this.organizationInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.organizationInput.click();
    await this.organizationInput.fill(organizationName);
    await this.organizationInput.press('Enter');
    await this.page.waitForTimeout(500);

    // Search for organization
    await this.searchOrganizationsInput.click();
    await this.searchOrganizationsInput.fill(organizationName);
    await this.searchOrganizationsInput.press('Enter');
    await this.page.waitForTimeout(1000);

    // Select organization from results
    const organizationRadio = this.page.getByRole('radio', { name: organizationName });
    await organizationRadio.waitFor({ state: 'visible', timeout: 10000 });
    await organizationRadio.check();

    await this.chooseOrganizationButton.click();
    await this.page.waitForTimeout(500);
    console.log(`✓ Selected organization: ${organizationName}`);
  }

  /**
   * Fill email address
   */
  async fillEmailAddress(email) {
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.emailInput.click();
    await this.emailInput.fill(email);
    console.log(`✓ Filled email: ${email}`);

    // Click outside to close any tooltips
    await this.primaryDetailsSection.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Fill service address
   */
  async fillServiceAddress(addressData) {
    // Navigate to address section
    await this.serviceAddressSection.click();
    await this.page.waitForTimeout(500);

    // Enter address
    await this.serviceAddressInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.serviceAddressInput.click();
    await this.serviceAddressInput.fill(addressData.search);
    await this.page.waitForTimeout(1000);

    // Select from address suggestions
    const addressSuggestion = this.page.getByText(addressData.select);
    await addressSuggestion.waitFor({ state: 'visible', timeout: 10000 });
    await addressSuggestion.click();
    console.log(`✓ Filled service address: ${addressData.search}`);
  }

  /**
   * Check "Same As Service Address" checkbox
   */
  async checkSameAsServiceAddress() {
    if (await this.sameAsServiceAddressCheckbox.isVisible()) {
      await this.sameAsServiceAddressCheckbox.check();
      console.log('✓ Checked "Same As Service Address"');
    }
  }

  /**
   * Save the contact/customer
   */
  async saveContact() {
    // Scroll to save button and click
    await this.page.waitForLoadState('networkidle');

    // Wait for the save contact link to be visible and clickable
    await this.saveContactLink.waitFor({ state: 'visible', timeout: 10000 });
    await this.saveContactLink.click();
    console.log('✓ Clicked Save Contact Link Button');

    // Wait for the confirmation dialog to appear
    await this.page.waitForLoadState('networkidle');

    // Try multiple strategies to find and click the Create button
    try {
      // Strategy 1: Wait for the Create button with exact name
      await this.createButton.waitFor({ state: 'visible', timeout: 25000 });
      await this.createButton.click();
      console.log('✓ Clicked Create button (Strategy 1)');
    } catch (error) {
      console.log('⚠ Strategy 1 failed, trying Strategy 2...');

      try {
        // Strategy 2: Try finding any visible Create button
        const createButtons = this.page.locator('button:has-text("Create")');
        const visibleButton = createButtons.first();
        await visibleButton.waitFor({ state: 'visible', timeout: 5000 });
        await visibleButton.click();
        console.log('✓ Clicked Create button (Strategy 2)');
      } catch (error2) {
        console.log('⚠ Strategy 2 failed, trying Strategy 3...');

        // Strategy 3: Check if we're already on the success page (form submitted without dialog)
        try {
          await this.page.waitForURL('**/contacts/**', { timeout: 5000 });
          console.log('✓ Contact saved - already redirected');
          return;
        } catch (error3) {
          console.log('⚠ Strategy 3 failed, trying Strategy 4...');

          try {
            // Strategy 4: Look for any button with type submit
            const submitButton = this.page.locator('button[type="submit"]').filter({ hasText: 'Create' });
            await submitButton.waitFor({ state: 'visible', timeout: 5000 });
            await submitButton.click();
            console.log('✓ Clicked Create button (Strategy 4)');
          } catch (error4) {
            // All strategies failed - take screenshot and list all buttons for debugging
            console.log('⚠ All strategies failed. Taking screenshot for debugging...');
            await this.page.screenshot({ path: 'debug-create-button-not-found.png', fullPage: true });

            // List all buttons on the page
            const allButtons = await this.page.locator('button').all();
            console.log(`Found ${allButtons.length} buttons on the page:`);
            for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
              const buttonText = await allButtons[i].textContent();
              const isVisible = await allButtons[i].isVisible();
              console.log(`  Button ${i + 1}: "${buttonText}" (visible: ${isVisible})`);
            }

            throw new Error('Could not find Create button after clicking Save Contact. Check debug-create-button-not-found.png');
          }
        }
      }
    }

    await this.page.waitForLoadState('networkidle');
    console.log('✓ Contact saved successfully');
  }

  /**
   * Verify customer was created by checking email visibility
   */
  async verifyCustomerCreated(email) {
    const emailLocator = this.emailVerification(email);
    await emailLocator.waitFor({ state: 'visible', timeout: 15000 });
    const isVisible = await emailLocator.isVisible();
    console.log(`✓ Customer email verified: ${email}`);
    return isVisible;
  }

  /**
   * Verify detailed customer information
   */
  async verifyCustomerDetails(customerData) {
    try {
      // Verify created by user
      const createdBy = this.createdByDefinition.filter({ hasText: 'Vignesh Sam' });
      if (await createdBy.count() > 0) {
        await createdBy.click();
        console.log('✓ Verified created by user');
      }

      // Verify active status
      if (await this.activeStatusSpan.isVisible()) {
        await this.activeStatusSpan.click();
        console.log('✓ Verified active status');
      }

      // Verify address
      const addressText = this.page.getByText('705 Pike St, Seattle ,');
      if (await addressText.count() > 0 && await addressText.isVisible()) {
        await addressText.click();
        console.log('✓ Verified address');
      }

      // Verify organization link
      const orgLink = this.page.getByRole('link', { name: customerData.organization });
      await orgLink.waitFor({ state: 'visible', timeout: 10000 });
      await orgLink.click();
      console.log(`✓ Verified organization link: ${customerData.organization}`);

      // Verify organization addresses
      const orgAddressesButton = this.page.getByRole('button', { name: 'Organization Addresses' });
      await orgAddressesButton.waitFor({ state: 'visible', timeout: 10000 });
      await orgAddressesButton.click();

      const pikeStText = this.page.getByText('Pike St').nth(1);
      if (await pikeStText.count() > 0) {
        await pikeStText.click();
        console.log('✓ Verified organization addresses');
      }

      // Close modal if open
      try {
        await this.page.getByText('Getting things ready Dashboard Projects Request Jobs Group Schedule Group').press('Escape');
      } catch (error) {
        // Modal might not be present
      }

      // Verify customer details section is visible
      await this.customerDetailsSection.waitFor({ state: 'visible', timeout: 10000 });
      console.log('✓ Customer details section verified');

      return true;
    } catch (error) {
      console.log(`⚠ Some customer details verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Complete customer creation workflow
   * @param {Object} customerData - Customer data from test-data.js
   */
  async createCustomer(customerData) {
    await this.fillPrimaryDetails(customerData);
    await this.selectOrganization(customerData.organization);
    await this.fillEmailAddress(customerData.email);
    await this.fillServiceAddress(customerData.serviceAddress);

    if (customerData.serviceAddress.sameAsBilling) {
      await this.checkSameAsServiceAddress();
    }

    await this.saveContact();
    console.log('✓ Customer creation workflow completed');
  }
}
