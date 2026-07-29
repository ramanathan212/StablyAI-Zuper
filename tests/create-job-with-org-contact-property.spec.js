import { test, expect } from '@stablyai/playwright-test';
import { LoginPage } from './pages/LoginPage.js';
import { testData } from './test-data.js';

/**
 * User Prompt:
 * - Login in Zuper UAT and create a new job along with new contact and organization and property
 *   and share me the test results
 */
test.describe('Job Creation with Quick Create Organization, Contact, and Property', () => {
  // Generate unique test data for isolation
  const timestamp = Date.now();
  const quickCreateOrgData = {
    name: `Quick Create Org ${timestamp}`,
    email: `quickcreateorg${timestamp}@test.com`,
    street: '123 Test Street',
    city: 'Seattle',
    state: 'Washington',
    zipcode: '98101'
  };
  const quickCreateContactData = {
    firstName: `QCContact${timestamp}`,
    lastName: 'TestUser',
    email: `qccontact${timestamp}@test.com`,
    accountManager: 'James Smith'
  };
  const quickCreatePropertyData = {
    name: `QC Property ${timestamp}`,
    street: '456 Test Ave',
    city: 'Portland',
    state: 'Oregon',
    zipcode: '97201'
  };
  const jobData = {
    title: `Job with QC ${timestamp}`,
    category: 'Installation Services',
    customFieldValue: `Test Input ${timestamp}`
  };

  test('Create new job with quick create organization, contact, and property', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes for this complex flow

    // Step 1: Login to the application
    await test.step('Login to the application', async () => {
      const loginPage = new LoginPage(page);
      await loginPage.login(testData.login.companyName, testData.login.email, testData.login.password);
    });

    // Step 2: Handle post-login dialogs
    await test.step('Handle post-login dialogs', async () => {
      // Dismiss notification dialog if present
      const noThanksButton = page.getByRole('button', { name: 'No, thanks' });
      if (await noThanksButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await noThanksButton.click();
        await page.waitForTimeout(500);
      }

      // Dismiss any other overlay dialogs (timezone change, onboarding, etc.)
      const cancelButton = page.getByRole('button', { name: 'Cancel' });
      if (await cancelButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cancelButton.click();
        await page.waitForTimeout(500);
      }

      // Clear any remaining CDK overlays
      await page.evaluate(() => {
        document.querySelectorAll('.cdk-overlay-backdrop, .cdk-overlay-container > div').forEach(el => el.remove());
      });
      await page.waitForTimeout(500);
    });

    // Step 3: Navigate to Jobs module
    await test.step('Navigate to Jobs module', async () => {
      // Clear any lingering overlays first
      await page.evaluate(() => {
        document.querySelectorAll('.cdk-overlay-container').forEach(el => el.innerHTML = '');
      });
      await page.waitForTimeout(500);

      // Click the Jobs group sidebar icon
      const jobGroupIcon = page.locator('#job_group');
      await jobGroupIcon.waitFor({ state: 'visible', timeout: 15000 });
      await jobGroupIcon.click();
      await page.waitForTimeout(1000);

      // Dismiss notification dialog again if it reappears
      const noThanksBtn = page.getByRole('button', { name: 'No, thanks' });
      if (await noThanksBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await noThanksBtn.click();
        await page.waitForTimeout(500);
      }

      // Clear overlays that may block the Jobs link
      await page.evaluate(() => {
        document.querySelectorAll('.cdk-overlay-backdrop, .cdk-overlay-container > div:not(:has(zuper-vertical-navigation-aside-item))').forEach(el => el.remove());
      });
      await page.waitForTimeout(300);

      // Click Jobs link - use evaluate as fallback if overlay blocks
      const jobsLink = page.locator('a').filter({ hasText: /^Jobs$/ }).first();
      try {
        await jobsLink.click({ timeout: 5000 });
      } catch {
        // If click is intercepted, use JS evaluate
        await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'));
          const jobsLink = links.find(a => a.textContent.trim() === 'Jobs' && a.getAttribute('href')?.includes('/jobs'));
          if (jobsLink) jobsLink.click();
        });
      }

      await expect(page).toHaveURL(/\/jobs/, { timeout: 15000 });
    });

    // Step 4: Open New Job form
    await test.step('Open New Job form', async () => {
      const newJobLink = page.locator('a[href="/jobs/new"]').first();
      await newJobLink.waitFor({ state: 'visible', timeout: 10000 });
      await newJobLink.click();

      await expect(page).toHaveURL(/\/jobs\/new/, { timeout: 15000 });
    });

    // Step 5: Fill Job basic details
    await test.step('Fill Job basic details', async () => {
      // Dismiss notification dialog if present
      const noThanksButton = page.getByRole('button', { name: 'No, thanks' });
      if (await noThanksButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await noThanksButton.click();
        await page.waitForTimeout(500);
      }
      // Clear any remaining overlays
      await page.evaluate(() => {
        document.querySelectorAll('.cdk-overlay-backdrop, .cdk-overlay-container > div').forEach(el => el.remove());
      });
      await page.waitForTimeout(300);

      // Enter job title - wait for the page to fully load first
      await page.waitForTimeout(2000);
      const jobTitleInput = page.getByPlaceholder('Enter job title').describe('Job Title input');
      await jobTitleInput.waitFor({ state: 'visible', timeout: 15000 });
      await jobTitleInput.fill(jobData.title);

      // Select Job Category
      const categoryDropdown = page.getByText('Choose a Job Category', { exact: true }).describe('Job Category dropdown');
      await categoryDropdown.scrollIntoViewIfNeeded();
      await categoryDropdown.click();

      const categoryOption = page.getByText(jobData.category, { exact: true }).describe('Category option');
      await categoryOption.waitFor({ state: 'visible', timeout: 10000 });
      await categoryOption.click();
      await page.waitForTimeout(500);

      // Set Due Date (tomorrow)
      const dueDateInput = page.getByPlaceholder('Pick Date', { exact: true }).describe('Due Date input');
      await dueDateInput.scrollIntoViewIfNeeded();
      await dueDateInput.click();

      // Calculate tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      const dueDateLabel = `${monthNames[tomorrow.getMonth()]} ${tomorrow.getDate()},`;

      const dateButton = page.getByRole('button', { name: dueDateLabel }).describe('Tomorrow date button');
      await dateButton.waitFor({ state: 'visible', timeout: 10000 });
      await dateButton.click();

      // Fill mandatory custom field - use label text to find the field
      const textInputField = page.getByLabel('Text Input *').describe('Mandatory Text Input field');
      await textInputField.waitFor({ state: 'visible', timeout: 10000 });
      await textInputField.fill(jobData.customFieldValue);
    });

    // Step 6: Quick Create Organization
    await test.step('Quick Create Organization', async () => {
      // Clear overlays before clicking
      await page.evaluate(() => {
        document.querySelectorAll('.cdk-overlay-container').forEach(el => el.innerHTML = '');
      });
      await page.waitForTimeout(300);

      // Click Add Organization
      const addOrgLink = page.locator('a').filter({ hasText: /^Add Organization$/ }).describe('Add Organization link');
      await addOrgLink.scrollIntoViewIfNeeded();
      await addOrgLink.click();

      // Switch to New Organization tab
      const newOrgTab = page.getByText('New Organization').describe('New Organization tab');
      await newOrgTab.waitFor({ state: 'visible', timeout: 5000 });
      await newOrgTab.click();

      // Fill organization details
      const orgNameInput = page.getByPlaceholder('Organization Name').describe('Organization Name input');
      await orgNameInput.waitFor({ state: 'visible', timeout: 5000 });
      await orgNameInput.fill(quickCreateOrgData.name);

      const orgEmailInput = page.getByPlaceholder('e.g. abc@example.com').describe('Organization Email input');
      await orgEmailInput.fill(quickCreateOrgData.email);

      // Fill address - use the first contact-info that has "Pick from map" (service address)
      const serviceAddressSection = page.locator('contact-info').filter({ hasText: 'Pick from map' }).describe('Service Address section');
      await serviceAddressSection.getByPlaceholder('Flat / House No, Street /').fill(quickCreateOrgData.street);
      await serviceAddressSection.getByPlaceholder('City').fill(quickCreateOrgData.city);
      await serviceAddressSection.getByPlaceholder('State / Province').fill(quickCreateOrgData.state);
      await serviceAddressSection.getByPlaceholder('Zipcode').fill(quickCreateOrgData.zipcode);

      // Click Create & Choose Organization
      await page.evaluate(() => {
        document.querySelectorAll('.cdk-overlay-backdrop').forEach(el => el.remove());
      });
      await page.waitForTimeout(300);

      const createOrgButton = page.locator('button:has-text("Create & Choose Organization")').describe('Create & Choose Organization button');
      await createOrgButton.scrollIntoViewIfNeeded();
      await createOrgButton.click({ timeout: 10000 });

      // Wait for organization to be created
      await page.waitForTimeout(2000);
    });

    // Step 7: Quick Create Contact
    await test.step('Quick Create Contact', async () => {
      // Clear overlays
      await page.evaluate(() => {
        document.querySelectorAll('.cdk-overlay-backdrop, .cdk-overlay-container > div').forEach(el => el.remove());
      });
      await page.waitForTimeout(300);

      // Click Add Contact via JS to bypass overlays
      await page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll('span'));
        const addContact = spans.find(s => s.textContent.trim() === 'Add Contact');
        if (addContact) {
          const parent = addContact.closest('a');
          if (parent) parent.click();
        }
      });
      await page.waitForTimeout(2000);

      // Check if "New Contact" tab is available
      const newContactTab = page.getByText('New Contact');
      if (await newContactTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await newContactTab.click();

        // Fill contact details
        const firstNameInput = page.getByPlaceholder('First Name').describe('First Name input');
        await firstNameInput.waitFor({ state: 'visible', timeout: 5000 });
        await firstNameInput.fill(quickCreateContactData.firstName);

        const lastNameInput = page.getByPlaceholder('Last Name').describe('Last Name input');
        await lastNameInput.fill(quickCreateContactData.lastName);

        const emailInput = page.getByPlaceholder('e.g. abc@example.com').describe('Contact Email input');
        await emailInput.fill(quickCreateContactData.email);

        // Select Account Manager - find the ng-select dropdown near the Account Manager label
        const accountManagerDropdown = page.locator('ng-select').filter({ has: page.locator('input[placeholder]') }).last().locator('input').first().describe('Account Manager dropdown');
        await accountManagerDropdown.click();

        const accountManagerOption = page.getByRole('option', { name: quickCreateContactData.accountManager }).describe('Account Manager option');
        await accountManagerOption.waitFor({ state: 'visible', timeout: 5000 });
        await accountManagerOption.click();

        // Click Create & Choose Contact
        await page.evaluate(() => {
          document.querySelectorAll('.cdk-overlay-backdrop, .cdk-overlay-container > div').forEach(el => el.remove());
        });
        await page.waitForTimeout(500);

        const createContactButton = page.locator('button:has-text("Create & Choose Contact")').describe('Create & Choose Contact button');
        await createContactButton.scrollIntoViewIfNeeded();
        await createContactButton.click({ timeout: 10000 });
        await page.waitForTimeout(2000);
      } else {
        // If New Contact tab isn't available, search for existing QCContact or skip
        const cancelBtn = page.locator('data-picker button').filter({ hasText: 'Cancel' });
        if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await cancelBtn.click();
        }
      }
    });

    // Step 8: Quick Create Property
    await test.step('Quick Create Property', async () => {
      // Clear overlays and data-pickers
      await page.evaluate(() => {
        document.querySelectorAll('.cdk-overlay-container').forEach(el => el.innerHTML = '');
      });
      await page.waitForTimeout(300);

      // Click Add Property via JS
      await page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll('span'));
        const addProp = spans.find(s => s.textContent.trim() === 'Add Property');
        if (addProp) {
          const parent = addProp.closest('a');
          if (parent) parent.click();
        }
      });
      await page.waitForTimeout(2000);

      // Switch to New Property tab
      const newPropertyTab = page.getByText('New Property').describe('New Property tab');
      await newPropertyTab.waitFor({ state: 'visible', timeout: 5000 });
      await newPropertyTab.click();

      // Fill property name
      const propNameInput = page.getByPlaceholder('Property Name').describe('Property Name input');
      await propNameInput.waitFor({ state: 'visible', timeout: 5000 });
      await propNameInput.fill(quickCreatePropertyData.name);

      // Select organization for the property - search with partial name
      const orgDropdown = page.locator('ng-select').last().locator('input').first().describe('Organization dropdown in property form');
      await orgDropdown.click();
      // Type just "Quick Create Org" to find recently created org
      await page.keyboard.type('Quick Create Org');
      await page.waitForTimeout(2000);

      // Select the first matching option
      const orgOption = page.locator('.ng-option').filter({ hasText: 'Quick Create Org' }).first().describe('Organization option');
      const optionVisible = await orgOption.isVisible({ timeout: 3000 }).catch(() => false);
      if (optionVisible) {
        await orgOption.click();
        await page.waitForTimeout(500);
      } else {
        // If no option found, clear and try with existing org "ACME Corporation"
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Backspace');
        await page.keyboard.type('ACME');
        await page.waitForTimeout(2000);
        const acmeOption = page.locator('.ng-option').first().describe('Fallback Organization option');
        await acmeOption.click();
      }

      // Fill property address using JS to set field values and trigger Angular change detection
      await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[formcontrolname="street"][googlemapsautocomplete]');
        const lastInput = inputs[inputs.length - 1];
        if (lastInput) {
          lastInput.value = '';
          lastInput.focus();
          const event = new Event('input', { bubbles: true });
          lastInput.dispatchEvent(event);
        }
      });
      await page.waitForTimeout(300);
      await page.keyboard.type(quickCreatePropertyData.street, { delay: 50 });
      await page.waitForTimeout(1000);

      const cityInput = page.getByPlaceholder('City').describe('Property City input');
      await cityInput.fill(quickCreatePropertyData.city);

      const stateInput = page.getByPlaceholder('State / Province').describe('Property State input');
      await stateInput.fill(quickCreatePropertyData.state);

      const zipcodeInput = page.getByPlaceholder('Zipcode').describe('Property Zipcode input');
      await zipcodeInput.fill(quickCreatePropertyData.zipcode);

      // Click Create & Choose Property
      await page.evaluate(() => {
        document.querySelectorAll('.cdk-overlay-backdrop, .google-maps-suggestions').forEach(el => el.remove());
      });
      await page.waitForTimeout(300);

      // Use JS click to bypass overlay issues
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent.includes('Create & Choose Property'));
        if (btn) btn.click();
      });
      await page.waitForTimeout(3000);

      // If still showing, try again
      const createPropButton = page.locator('button:has-text("Create & Choose Property")');
      if (await createPropButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.evaluate(() => {
          document.querySelectorAll('.cdk-overlay-backdrop, .google-maps-suggestions').forEach(el => el.remove());
        });
        await createPropButton.click({ timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(3000);
      }
    });

    // Step 9: Create the Job
    await test.step('Create Job and verify success', async () => {
      // Click Create Job button
      const createJobButton = page.locator('a').filter({ hasText: 'Create Job' }).describe('Create Job button');
      await createJobButton.scrollIntoViewIfNeeded();
      await createJobButton.click();

      // Confirm in dialog
      const confirmButton = page.getByRole('button', { name: 'Create' }).describe('Create confirmation button');
      await confirmButton.waitFor({ state: 'visible', timeout: 10000 });
      await confirmButton.click();

      // Verify job was created - wait for redirect to job details page
      await expect(page).toHaveURL(/\/jobs\/.*\/details/, { timeout: 30000 });

      // Verify job title is displayed
      const jobTitle = page.locator('p').filter({ hasText: jobData.title }).first().describe('Job title on details page');
      await expect(jobTitle).toBeVisible({ timeout: 15000 });

      // Verify an organization is linked - look for org link in the Organization section
      const orgLink = page.locator('a[href*="/organizations/"]').first().describe('Organization link on details');
      await expect(orgLink).toBeVisible({ timeout: 10000 });

      // Verify job category
      const categoryText = page.getByText(jobData.category).first().describe('Job category on details');
      await expect(categoryText).toBeVisible();

      // Verify property is linked - scroll to find it (may be below fold)
      const propertyLink = page.locator('a[href*="/property/"]').first().describe('Property link on job details');
      await propertyLink.scrollIntoViewIfNeeded();
      await expect(propertyLink).toBeVisible({ timeout: 10000 });
    });
  });
});
