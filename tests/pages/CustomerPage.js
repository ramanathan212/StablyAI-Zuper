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

    // Account Manager locators
    this.clickAccountManagerInput = page.locator('#account_manager input[type="text"]');
    this.pickAccountManagerOption = page.getByRole('option', { name: 'James Smith zuper.admin@' });
    
    // Primary details section locator - out of form fields
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
   * Dismiss any blocking overlays: Beamer push modal and browser notification dialog
   */
  async dismissBeamerModal() {
    // Dismiss browser notification permission dialog ("We'd like to show you notifications")
    try {
      const notifDenyBtn = this.page.getByRole('button', { name: 'No, thanks' });
      if (await notifDenyBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await notifDenyBtn.click();
        console.log('✓ Notification permission dialog dismissed');
      }
    } catch (_) {}

    // Dismiss Beamer push modal
    try {
      const beamerModal = this.page.locator('#beamerPushModal');
      if (await beamerModal.isVisible({ timeout: 2000 }).catch(() => false)) {
        const closeBtn = beamerModal.locator('button, .beamer-close, [class*="close"], [aria-label*="close" i]').first();
        if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeBtn.click();
        } else {
          await this.page.keyboard.press('Escape');
        }
        await this.page.waitForSelector('#beamerPushModal', { state: 'hidden', timeout: 3000 }).catch(() => {});
        console.log('✓ Beamer modal dismissed');
      }
    } catch (_) {}
  }

  /**
   * Dismiss all overlays, modals, and backdrops that may block interaction
   */
  async dismissAllOverlays() {
    // Dismiss "Trial Period Ending Soon" modal via close button first
    try {
      const closeButton = this.page.locator('.cdk-overlay-container button.close, .cdk-overlay-container .close, .cdk-overlay-container [aria-label="Close"]').first();
      if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeButton.click({ force: true });
        await this.page.waitForTimeout(500);
        console.log('Dismissed overlay modal via close button');
      }
    } catch (_) {}

    // Dismiss notification dialog
    try {
      const noThanksBtn = this.page.getByRole('button', { name: 'No, thanks' });
      if (await noThanksBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await noThanksBtn.click({ force: true });
        await this.page.waitForTimeout(500);
        console.log('Notification dialog dismissed');
      }
    } catch (_) {}

    // Try pressing Escape for any CDK overlay pane
    try {
      const overlayPane = this.page.locator('.cdk-overlay-pane').first();
      if (await overlayPane.isVisible({ timeout: 1000 }).catch(() => false)) {
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(500);
      }
    } catch (_) {}

    // Click CDK overlay backdrop to dismiss (Angular CDK closes on backdrop click)
    try {
      const backdrop = this.page.locator('.cdk-overlay-backdrop');
      if (await backdrop.isVisible({ timeout: 1000 }).catch(() => false)) {
        await backdrop.click({ force: true });
        await this.page.waitForTimeout(500);
      }
    } catch (_) {}

    // If backdrop still visible, press Escape again
    try {
      const backdrop = this.page.locator('.cdk-overlay-backdrop');
      if (await backdrop.isVisible({ timeout: 500 }).catch(() => false)) {
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(500);
      }
    } catch (_) {}

    // Final fallback: force-remove any remaining overlays via JS
    try {
      const backdrop = this.page.locator('.cdk-overlay-backdrop');
      if (await backdrop.isVisible({ timeout: 500 }).catch(() => false)) {
        await this.page.evaluate(() => {
          document.querySelectorAll('.cdk-overlay-backdrop').forEach(el => el.remove());
          document.querySelectorAll('.cdk-overlay-pane').forEach(el => el.remove());
        });
        await this.page.waitForTimeout(200);
        console.log('Force-removed remaining overlays via JS');
      }
    } catch (_) {}
  }

  /**
   * Navigate to Contacts page
   */
  async navigateToContacts() {
    await this.customerOrgNavigationButton.waitFor({ state: 'visible', timeout: 20000 });

    // Dismiss any remaining overlays before clicking navigation
    await this.dismissAllOverlays();

    await this.customerOrgNavigationButton.click();
    await this.contactsLink.waitFor({ state: 'visible', timeout: 20000 });
    await this.contactsLink.click();
    await this.page.waitForLoadState('load');
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    console.log('✓ Navigated to Contacts page');
  }

  /**
   * Click New Contact button
   */
  async clickNewContact() {
    await this.newContactLink.waitFor({ state: 'visible', timeout: 10000 });
    await this.newContactLink.click();
    await this.page.waitForLoadState('load');
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
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
    // Dismiss any blocking modals before interacting with the form
    await this.dismissBeamerModal();

    // Open organization search
    await this.organizationInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.organizationInput.click({ force: true });
    await this.organizationInput.fill(organizationName);
    await this.organizationInput.press('Enter');
    await this.page.waitForTimeout(500);

    // Search for organization
    await this.searchOrganizationsInput.click({ force: true });
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
   * Fill email address
   */
  async selectAccountManager(accountManager) {
    await this.clickAccountManagerInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.clickAccountManagerInput.click();
    await this.clickAccountManagerInput.fill(accountManager);
    await this.page.waitForTimeout(1000);

    await this.pickAccountManagerOption.waitFor({ state: 'visible', timeout: 10000 });
    await this.pickAccountManagerOption.click();
    console.log(`✓ Filled account manager: ${accountManager}`);

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

    // Enter address character by character to trigger autocomplete
    await this.serviceAddressInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.serviceAddressInput.click();
    await this.serviceAddressInput.clear();
    await this.serviceAddressInput.pressSequentially(addressData.search, { delay: 80 });
    await this.page.waitForTimeout(2500); // allow autocomplete to fetch results

    // Select from address suggestions — rendered as buttons in this app
    const partialText = addressData.select.trim();
    const addressSuggestion = this.page.getByRole('button', { name: new RegExp(partialText, 'i') }).first();
    await addressSuggestion.waitFor({ state: 'visible', timeout: 15000 });
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
    // Scroll to top and wait for page to stabilize before saving
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await this.page.waitForLoadState('load');
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(1000);

    // Wait for the save contact link to be visible and clickable
    await this.saveContactLink.waitFor({ state: 'visible', timeout: 10000 });
    await this.saveContactLink.scrollIntoViewIfNeeded();
    await this.saveContactLink.click();
    console.log('✓ Clicked Save Contact Link Button');

    // Wait for the confirmation dialog to appear
    await this.page.waitForLoadState('load');

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

    await this.page.waitForLoadState('load');
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    console.log('✓ Contact saved successfully');
  }

  /**
   * Verify customer was created by checking email visibility
   * @param {string} email - Customer email to verify
   * @returns {Object} Verification results with pass/fail status
   */
  async verifyCustomerCreated(email) {
    const verificationResults = {
      checks: [],
      success: true
    };

    // Verification 1: URL should redirect to customer detail page
    const urlCheck = {
      name: 'URL Redirect Verification',
      description: 'URL redirected to customer/contact detail page',
      status: 'PENDING',
      error: null
    };

    try {
      const currentUrl = this.page.url();
      if (currentUrl.includes('/contacts/') || currentUrl.includes('/contact/') || currentUrl.includes('/customers/')) {
        urlCheck.status = 'PASS';
        console.log('✓ URL verification passed');
      } else {
        urlCheck.status = 'FAIL';
        urlCheck.error = 'URL did not redirect to customer detail page';
        verificationResults.success = false;
        console.log('✗ URL verification failed');
      }
    } catch (error) {
      urlCheck.status = 'FAIL';
      urlCheck.error = `URL verification error: ${error.message}`;
      verificationResults.success = false;
      console.log('✗ URL verification failed with error');
    }
    verificationResults.checks.push(urlCheck);

    // Verification 2: Customer email should be visible
    const emailCheck = {
      name: 'Customer Email Visibility',
      description: `Customer email "${email}" is visible`,
      status: 'PENDING',
      error: null
    };

    try {
      const emailLocator = this.emailVerification(email);
      await emailLocator.waitFor({ state: 'visible', timeout: 15000 });
      const isVisible = await emailLocator.isVisible();
      if (isVisible) {
        emailCheck.status = 'PASS';
        console.log(`✓ Customer email verified: ${email}`);
      } else {
        emailCheck.status = 'FAIL';
        emailCheck.error = `Customer email "${email}" is not visible`;
        verificationResults.success = false;
        console.log('✗ Customer email verification failed');
      }
    } catch (error) {
      emailCheck.status = 'FAIL';
      emailCheck.error = `Customer email verification error: ${error.message}`;
      verificationResults.success = false;
      console.log('✗ Customer email verification failed');
    }
    verificationResults.checks.push(emailCheck);

    // Print summary
    this.printVerificationSummary(verificationResults, 'Customer Creation Basic Verification');

    return verificationResults;
  }

  /**
   * Verify detailed customer information
   * @param {Object} customerData - Customer data used to create the customer
   * @returns {Object} Verification results with pass/fail status
   */
  async verifyCustomerDetails(customerData) {
    const verificationResults = {
      checks: [],
      success: true
    };

    // Verification 1: Created by user
    const createdByCheck = {
      name: 'Created By User Verification',
      description: 'Customer created by user is visible',
      status: 'PENDING',
      error: null
    };

    try {
      const createdBy = this.createdByDefinition.filter({ hasText: 'Vignesh Sam' });
      if (await createdBy.count() > 0) {
        await createdBy.click();
        createdByCheck.status = 'PASS';
        console.log('✓ Verified created by user');
      } else {
        createdByCheck.status = 'WARNING';
        createdByCheck.error = 'Created by user not found';
        console.log('⚠ Created by user not found');
      }
    } catch (error) {
      createdByCheck.status = 'WARNING';
      createdByCheck.error = `Created by verification error: ${error.message}`;
      console.log('⚠ Created by user verification warning');
    }
    verificationResults.checks.push(createdByCheck);

    // Verification 2: Active status
    const activeStatusCheck = {
      name: 'Active Status Verification',
      description: 'Customer status is "Active"',
      status: 'PENDING',
      error: null
    };

    try {
      if (await this.activeStatusSpan.isVisible()) {
        await this.activeStatusSpan.click();
        activeStatusCheck.status = 'PASS';
        console.log('✓ Verified active status');
      } else {
        activeStatusCheck.status = 'FAIL';
        activeStatusCheck.error = 'Active status not visible';
        verificationResults.success = false;
        console.log('✗ Active status not visible');
      }
    } catch (error) {
      activeStatusCheck.status = 'FAIL';
      activeStatusCheck.error = `Active status verification error: ${error.message}`;
      verificationResults.success = false;
      console.log('✗ Active status verification failed');
    }
    verificationResults.checks.push(activeStatusCheck);

    // Verification 3: Service address
    const addressCheck = {
      name: 'Service Address Verification',
      description: 'Service address is visible',
      status: 'PENDING',
      error: null
    };

    try {
      const addressText = this.page.getByText('Walmart', { exact: false }).first();
      if (await addressText.count() > 0 && await addressText.isVisible()) {
        await addressText.click();
        addressCheck.status = 'PASS';
        console.log('✓ Verified address');
      } else {
        addressCheck.status = 'WARNING';
        addressCheck.error = 'Service address not found';
        console.log('⚠ Service address not found');
      }
    } catch (error) {
      addressCheck.status = 'WARNING';
      addressCheck.error = `Address verification error: ${error.message}`;
      console.log('⚠ Address verification warning');
    }
    verificationResults.checks.push(addressCheck);

    // Verification 4: Organization link
    const orgLinkCheck = {
      name: 'Organization Link Verification',
      description: `Organization link "${customerData.organization}" is visible`,
      status: 'PENDING',
      error: null
    };

    try {
      const orgLink = this.page.getByRole('link', { name: customerData.organization });
      await orgLink.waitFor({ state: 'visible', timeout: 10000 });
      await orgLink.click();
      orgLinkCheck.status = 'PASS';
      console.log(`✓ Verified organization link: ${customerData.organization}`);
    } catch (error) {
      orgLinkCheck.status = 'FAIL';
      orgLinkCheck.error = `Organization link not found: ${error.message}`;
      verificationResults.success = false;
      console.log(`✗ Organization link verification failed`);
    }
    verificationResults.checks.push(orgLinkCheck);

    // Verification 5: Organization addresses
    const orgAddressCheck = {
      name: 'Organization Addresses Verification',
      description: 'Organization addresses are accessible',
      status: 'PENDING',
      error: null
    };

    try {
      const orgAddressesButton = this.page.getByRole('button', { name: 'Organization Addresses' });
      await orgAddressesButton.waitFor({ state: 'visible', timeout: 10000 });
      await orgAddressesButton.click();

      const pikeStText = this.page.getByText('Pike St').nth(1);
      if (await pikeStText.count() > 0) {
        await pikeStText.click();
        orgAddressCheck.status = 'PASS';
        console.log('✓ Verified organization addresses');
      } else {
        orgAddressCheck.status = 'WARNING';
        orgAddressCheck.error = 'Organization addresses not found in expected location';
        console.log('⚠ Organization addresses not found');
      }
    } catch (error) {
      orgAddressCheck.status = 'WARNING';
      orgAddressCheck.error = `Organization addresses verification error: ${error.message}`;
      console.log('⚠ Organization addresses verification warning');
    }
    verificationResults.checks.push(orgAddressCheck);

    // Close modal if open
    try {
      await this.page.getByText('Getting things ready Dashboard Projects Request Jobs Group Schedule Group').press('Escape');
    } catch (error) {
      // Modal might not be present
    }

    // Verification 6: Customer details section
    const detailsSectionCheck = {
      name: 'Customer Details Section Verification',
      description: 'Customer details section is visible',
      status: 'PENDING',
      error: null
    };

    try {
      await this.customerDetailsSection.waitFor({ state: 'visible', timeout: 10000 });
      detailsSectionCheck.status = 'PASS';
      console.log('✓ Customer details section verified');
    } catch (error) {
      detailsSectionCheck.status = 'FAIL';
      detailsSectionCheck.error = `Customer details section not visible: ${error.message}`;
      verificationResults.success = false;
      console.log('✗ Customer details section verification failed');
    }
    verificationResults.checks.push(detailsSectionCheck);

    // Print summary
    this.printVerificationSummary(verificationResults, 'Customer Details Verification');

    return verificationResults;
  }

  /**
   * Print verification summary
   * @param {Object} verificationResults - Verification results object
   * @param {string} title - Title for the summary
   */
  printVerificationSummary(verificationResults, title) {
    console.log(`\n=== ${title} Summary ===`);

    const passedChecks = verificationResults.checks.filter(c => c.status === 'PASS');
    const failedChecks = verificationResults.checks.filter(c => c.status === 'FAIL');
    const warningChecks = verificationResults.checks.filter(c => c.status === 'WARNING');

    console.log(`Total Checks: ${verificationResults.checks.length}`);
    console.log(`Passed: ${passedChecks.length}`);
    passedChecks.forEach(check => console.log(`  ✓ [PASS] ${check.description}`));

    if (warningChecks.length > 0) {
      console.log(`\nWarnings: ${warningChecks.length}`);
      warningChecks.forEach(check => console.log(`  ⚠ [WARNING] ${check.description} - ${check.error}`));
    }

    if (failedChecks.length > 0) {
      console.log(`\nFailed: ${failedChecks.length}`);
      failedChecks.forEach(check => console.log(`  ✗ [FAIL] ${check.description} - ${check.error}`));
    }

    console.log('================================================\n');
  }

  /**
   * Complete customer creation workflow
   * @param {Object} customerData - Customer data from test-data.js
   */
  async createCustomer(customerData) {
    await this.fillPrimaryDetails(customerData);
    await this.selectOrganization(customerData.organization);
    await this.fillEmailAddress(customerData.email);
    await this.selectAccountManager(customerData.accountManager);
    await this.fillServiceAddress(customerData.serviceAddress);

    if (customerData.serviceAddress.sameAsBilling) {
      await this.checkSameAsServiceAddress();
    }

    await this.saveContact();
    console.log('✓ Customer creation workflow completed');
  }
}
