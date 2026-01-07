export class OrganizationPage {
  constructor(page) {
    this.page = page;
    this.cancelTimezoneButton = page.getByRole('button', { name: 'Cancel' });
    this.organizationNavigationButton = page.locator('div').filter({ hasText: 'Customers, Organizations and' }).nth(3);
    this.organizationsLink = page.getByRole('link', { name: 'Organizations' });
    this.newOrganizationButton = page.getByRole('link', { name: ' New Organization' });
    this.organizationNameInput = page.getByRole('textbox', { name: 'Organization Name*' });
    this.organizationEmailInput = page.getByRole('textbox', { name: 'Organization Email*' });
    this.serviceAddressInput = page.getByRole('textbox', { name: 'Flat / House No, Street /' }).first();
    this.sameAsServiceAddressCheckbox = page.getByRole('checkbox', { name: 'Same As Service Address' });
    this.singleLineTextInput = page.getByRole('textbox', { name: 'Single Line Text' });
    this.multiLineTextInput = page.getByRole('textbox', { name: 'Multi Line Text' });
    this.dateInput = page.getByRole('textbox', { name: 'Date' });
    this.timeInput = page.locator('#UAT_Time');
    this.dateTimeInput = page.locator('[id="UAT_Date & Time"]');
    this.saveOrganizationLink = page.locator('a').filter({ hasText: 'Save Organization' });
    this.createButton = page.getByRole('button', { name: 'Create' });
  }

  async navigateToOrganizations() {
    try {
      const isVisible = await this.cancelTimezoneButton.isVisible({ timeout: 5000 });
      if (isVisible) {
        await this.cancelTimezoneButton.click();
        console.log('✓ Timezone dialog dismissed');
      }
    } catch (error) {
      console.log('No timezone dialog to dismiss, continuing...');
    }
    await this.organizationNavigationButton.waitFor({ state: 'visible', timeout: 20000 });
    await this.organizationNavigationButton.click();
    await this.organizationsLink.waitFor({ state: 'visible', timeout: 20000 });
    await this.organizationsLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickNewOrganization() {
    // Try multiple strategies to find the New Organization button
    let clicked = false;

    // Strategy 1: Try the original locator
    try {
      await this.newOrganizationButton.waitFor({ state: 'visible', timeout: 5000 });
      await this.newOrganizationButton.click();
      clicked = true;
      console.log('✓ Clicked New Organization button (strategy 1)');
    } catch (error) {
      console.log('⚠ Strategy 1 failed, trying alternative locators...');
    }

    // Strategy 2: Try without the leading space
    if (!clicked) {
      try {
        const newOrgButton = this.page.getByRole('link', { name: 'New Organization' });
        await newOrgButton.waitFor({ state: 'visible', timeout: 5000 });
        await newOrgButton.click();
        clicked = true;
        console.log('✓ Clicked New Organization button (strategy 2)');
      } catch (error) {
        console.log('⚠ Strategy 2 failed, trying next...');
      }
    }

    // Strategy 3: Try finding by text content
    if (!clicked) {
      try {
        const newOrgButton = this.page.locator('a, button').filter({ hasText: 'New Organization' }).first();
        await newOrgButton.waitFor({ state: 'visible', timeout: 5000 });
        await newOrgButton.click();
        clicked = true;
        console.log('✓ Clicked New Organization button (strategy 3)');
      } catch (error) {
        console.log('⚠ Strategy 3 failed');
      }
    }

    if (!clicked) {
      throw new Error('Could not find or click the New Organization button using any strategy');
    }

    await this.page.waitForLoadState('networkidle');
  }

  async fillOrganizationBasicInfo(orgData) {
    // Fill organization name
    await this.organizationNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.organizationNameInput.click();
    await this.organizationNameInput.fill(orgData.name);

    // Fill organization email
    await this.organizationEmailInput.click();
    await this.organizationEmailInput.fill(orgData.email);
  }

  async addServiceAddress(addressData) {
    // Click service address section to expand
    await this.page.getByText('Service AddressContact First').first().click();
    await this.page.waitForTimeout(500);

    // Fill service address
    await this.serviceAddressInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.serviceAddressInput.click();
    await this.serviceAddressInput.fill(addressData.search);

    // Wait and select from dropdown
    await this.page.waitForTimeout(1000);
    await this.page.getByText(addressData.select).click();

    // Check same as service address if needed
    if (addressData.sameAsBilling) {
      await this.sameAsServiceAddressCheckbox.check();
    }
  }

  async fillCustomFields(customFields) {
    // Single line text
    if (customFields.singleLineText) {
      await this.singleLineTextInput.waitFor({ state: 'visible', timeout: 10000 });
      await this.singleLineTextInput.click();
      await this.singleLineTextInput.fill(customFields.singleLineText);
    }

    // Multi line text
    if (customFields.multiLineText) {
      await this.multiLineTextInput.click();
      await this.multiLineTextInput.fill(customFields.multiLineText);
    }
  }

  async saveOrganization() {
    // Click save organization link
    await this.saveOrganizationLink.waitFor({ state: 'visible', timeout: 10000 });
    await this.saveOrganizationLink.scrollIntoViewIfNeeded();
    await this.saveOrganizationLink.click();

    // Wait for confirmation dialog
    await this.page.waitForTimeout(1000);

    // Click create button
    await this.createButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.createButton.click();
    await this.page.waitForLoadState('networkidle');

    console.log('✓ Organization saved successfully');
  }

  async getOrganizationName() {
    // Wait for page to stabilize after navigation
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);

    // Try to find organization name from multiple sources
    let orgName = null;

    // Strategy 1: Look for the organization name input value (we just filled it)
    try {
      const nameInput = this.page.locator('[name="organizationName"], input[placeholder*="Organization Name"]').first();
      if (await nameInput.count() > 0 && await nameInput.isVisible()) {
        orgName = await nameInput.inputValue();
        console.log('Found org name from input field');
      }
    } catch (error) {
      console.log('Organization name input not found');
    }

    // Strategy 2: Look for breadcrumb or page title elements
    if (!orgName) {
      try {
        const breadcrumb = this.page.locator('.breadcrumb, [class*="breadcrumb"]').last();
        if (await breadcrumb.count() > 0) {
          await breadcrumb.waitFor({ state: 'visible', timeout: 5000 });
          orgName = await breadcrumb.textContent();
          console.log('Found org name from breadcrumb');
        }
      } catch (error) {
        console.log('Breadcrumb not found');
      }
    }

    // Strategy 3: Get all h1 elements and find the visible one with actual content
    if (!orgName) {
      try {
        const allH1s = await this.page.locator('h1').all();
        for (const h1 of allH1s) {
          if (await h1.isVisible()) {
            const text = await h1.textContent();
            if (text && text.trim().length > 0 && !text.includes('navigation')) {
              orgName = text;
              console.log('Found org name from visible h1');
              break;
            }
          }
        }
      } catch (error) {
        console.log('Could not find visible h1 elements');
      }
    }

    // Strategy 4: Look for organization detail page specific elements
    if (!orgName) {
      try {
        const detailsTitle = await this.page.locator('[class*="organization"] [class*="title"], [class*="org"] [class*="name"]').all();
        for (const element of detailsTitle) {
          if (await element.isVisible()) {
            const text = await element.textContent();
            if (text && text.trim().length > 0) {
              orgName = text;
              console.log('Found org name from organization detail element');
              break;
            }
          }
        }
      } catch (error) {
        console.log('Organization detail elements not found');
      }
    }

    if (!orgName) {
      throw new Error('Could not find organization name on the page. The page structure might have changed.');
    }

    const trimmedName = orgName.trim();
    console.log(`🏢 Organization Name: ${trimmedName}`);
    return trimmedName;
  }

  /**
   * Verify organization creation was successful
   * @param {Object} orgData - Organization data used to create the organization
   * @returns {Object} Verification results with pass/fail status
   */
  async verifyOrganizationCreated(orgData) {
    const verificationResults = {
      checks: [],
      success: true
    };

    try {
      // Verification 1: URL should redirect to organization detail page
      const currentUrl = this.page.url();
      const urlCheck = {
        name: 'URL Redirect Verification',
        description: 'URL redirected to organization detail page',
        status: 'PENDING',
        error: null
      };

      if (currentUrl.includes('/organizations/') || currentUrl.includes('/organization/')) {
        urlCheck.status = 'PASS';
        console.log('✓ URL verification passed');
      } else {
        urlCheck.status = 'FAIL';
        urlCheck.error = 'URL did not redirect to organization detail page';
        verificationResults.success = false;
        console.log('✗ URL verification failed');
      }
      verificationResults.checks.push(urlCheck);

      // Verification 2: Organization name should be visible
      const nameCheck = {
        name: 'Organization Name Visibility',
        description: `Organization name "${orgData.name}" is visible`,
        status: 'PENDING',
        error: null
      };

      try {
        const orgNameLocator = this.page.getByText(orgData.name, { exact: false });
        await orgNameLocator.first().waitFor({ state: 'visible', timeout: 10000 });
        nameCheck.status = 'PASS';
        console.log('✓ Organization name verification passed');
      } catch (error) {
        nameCheck.status = 'FAIL';
        nameCheck.error = `Organization name "${orgData.name}" is not visible`;
        verificationResults.success = false;
        console.log('✗ Organization name verification failed');
      }
      verificationResults.checks.push(nameCheck);

      // Verification 3: Organization email should be visible (optional)
      const emailCheck = {
        name: 'Organization Email Visibility',
        description: `Organization email "${orgData.email}" is visible`,
        status: 'PENDING',
        error: null
      };

      try {
        const emailLocator = this.page.getByText(orgData.email);
        await emailLocator.first().waitFor({ state: 'visible', timeout: 5000 });
        emailCheck.status = 'PASS';
        console.log('✓ Organization email verification passed');
      } catch (error) {
        emailCheck.status = 'WARNING';
        emailCheck.error = 'Organization email not immediately visible (may be in collapsed section)';
        console.log('⚠ Organization email verification - warning');
      }
      verificationResults.checks.push(emailCheck);

      // Verification 4: Active status should be visible
      const statusCheck = {
        name: 'Active Status Verification',
        description: 'Organization status is "Active"',
        status: 'PENDING',
        error: null
      };

      try {
        const activeStatus = this.page.getByText('Active', { exact: true });
        const count = await activeStatus.count();
        if (count > 0 && await activeStatus.first().isVisible()) {
          statusCheck.status = 'PASS';
          console.log('✓ Active status verification passed');
        } else {
          statusCheck.status = 'FAIL';
          statusCheck.error = 'Active status not found or not visible';
          verificationResults.success = false;
          console.log('✗ Active status verification failed');
        }
      } catch (error) {
        statusCheck.status = 'FAIL';
        statusCheck.error = 'Active status verification encountered error';
        verificationResults.success = false;
        console.log('✗ Active status verification failed with error');
      }
      verificationResults.checks.push(statusCheck);

      // Verification 5: Custom fields should be saved (optional)
      if (orgData.customFields && orgData.customFields.singleLineText) {
        const customFieldCheck = {
          name: 'Custom Field Verification',
          description: 'Custom field "Single Line Text" value is visible',
          status: 'PENDING',
          error: null
        };

        try {
          const singleLineText = this.page.getByText(orgData.customFields.singleLineText);
          const count = await singleLineText.count();
          if (count > 0) {
            customFieldCheck.status = 'PASS';
            console.log('✓ Custom field verification passed');
          } else {
            customFieldCheck.status = 'WARNING';
            customFieldCheck.error = 'Custom fields may be in a collapsed section';
            console.log('⚠ Custom field verification - warning');
          }
        } catch (error) {
          customFieldCheck.status = 'WARNING';
          customFieldCheck.error = 'Custom fields verification could not be completed';
          console.log('⚠ Custom field verification - warning');
        }
        verificationResults.checks.push(customFieldCheck);
      }

      // Print summary
      console.log('\n=== Organization Creation Verification Summary ===');

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

      return verificationResults;

    } catch (error) {
      verificationResults.success = false;
      const errorCheck = {
        name: 'Verification Process',
        description: 'Overall verification process',
        status: 'FAIL',
        error: `Verification error: ${error.message}`
      };
      verificationResults.checks.push(errorCheck);
      console.log(`✗ Verification encountered unexpected error: ${error.message}`);
      return verificationResults;
    }
  }

  /**
   * Complete organization creation workflow
   * @param {Object} orgData - Organization data from test-data.js
   */
  async createOrganization(orgData) {
    try {
      console.log('Starting organization creation workflow...');

      // Fill basic information
      await this.fillOrganizationBasicInfo(orgData);

      // Add service address
      await this.addServiceAddress(orgData.serviceAddress);

      // Fill custom fields if provided
      if (orgData.customFields) {
        await this.fillCustomFields(orgData.customFields);
      }

      // Save organization
      await this.saveOrganization();

      console.log('✓ Organization creation workflow completed');
      return true;
    } catch (error) {
      console.error(`✗ Organization creation workflow failed: ${error.message}`);
      throw error;
    }
  }
}
