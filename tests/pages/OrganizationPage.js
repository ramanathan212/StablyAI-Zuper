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
    await this.newOrganizationButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.newOrganizationButton.click();
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

    // Date field
    if (customFields.date) {
      await this.dateInput.click();
      await this.page.waitForTimeout(1000);

      // Select date dynamically
      try {
        const todayButton = this.page.locator('button.mat-calendar-body-active, button.mat-calendar-body-today');
        await todayButton.first().waitFor({ state: 'visible', timeout: 5000 });
        await todayButton.first().click();
      } catch (error) {
        console.log('Selecting first available date...');
        const anyDate = this.page.locator('button.mat-calendar-body-cell:not(.mat-calendar-body-disabled)').first();
        await anyDate.click();
      }
    }

    // Time field
    if (customFields.time) {
      await this.timeInput.click();
      await this.page.waitForTimeout(500);
      await this.page.locator('.cdk-overlay-backdrop').click();
    }

    // Date & Time field
    if (customFields.dateTime) {
      await this.dateTimeInput.click();
      await this.page.waitForTimeout(1000);
      const dateTimeButton = this.page.getByRole('button', { name: /\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2} (AM|PM)/ }).first();
      await dateTimeButton.click();
      await this.page.getByRole('button', { name: 'OK' }).click();
    }

    // Radio option
    if (customFields.radioOption) {
      await this.page.getByRole('radio', { name: customFields.radioOption }).check();
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
}
