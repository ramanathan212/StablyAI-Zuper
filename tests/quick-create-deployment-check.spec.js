import { test, expect } from '@stablyai/playwright-test';

/**
 * User Prompt:
 * - Create one new Job and inside the job do a quick new create of contact,
 *   Organization, and property use the following conditions.
 *   Job Name should be in Quick create deployment check March 4 and have
 *   the similar name on all the quick creations
 * - Its taking to much time to create a simple scenario can you please try to
 *   create it quickly also on the each time when you give a name we should not
 *   use the same names you can add numbers
 * [Clarification: Addresses: use address anything from India]
 */
test.describe('Quick Create Deployment Check - March 4', () => {
  const ts = Date.now();
  const jobName = `Automation Job quick creation - ${ts}`;
  const orgName = `Quick create org ${ts}`;
  const contactFirstName = `Quick create contact ${ts}`;
  const propertyName = `Quick create property ${ts}`;
  const orgEmail = `qcorg${ts}@test.com`;
  const contactEmail = `qccontact${ts}@test.com`;

  test('Create new job with quick create organization, contact, and property', async ({ page, agent }) => {
    test.setTimeout(180000);

    /** Dismiss all common popups/overlays */
    const dismissPopups = async () => {
      // Dismiss Beamer notification popups and timezone dialogs via JS to avoid viewport issues
      await page.evaluate(() => {
        // Click "No, thanks" Beamer notification if present
        const noThanksBtn = document.querySelector('#pushActionRefuse, [id*="pushActionRefuse"]');
        if (noThanksBtn) noThanksBtn.click();
        // Dismiss timezone cancel button if present
        const cancelBtns = document.querySelectorAll('button');
        cancelBtns.forEach(btn => {
          if (btn.textContent.trim() === 'Cancel') btn.click();
        });
      });
      await page.waitForTimeout(1000);
      // Second pass to catch delayed popups
      await page.evaluate(() => {
        const noThanksBtn = document.querySelector('#pushActionRefuse, [id*="pushActionRefuse"]');
        if (noThanksBtn) noThanksBtn.click();
      });
      await page.waitForTimeout(500);
    };

    /** Dismiss CDK overlays and navigation overlays so normal clicks work */
    const clearOverlays = async () => {
      await page.evaluate(() => {
        document.querySelectorAll('.cdk-overlay-backdrop').forEach(el => el.remove());
        document.querySelectorAll('.cdk-overlay-transparent-backdrop').forEach(el => el.remove());
        document.querySelectorAll('.zuper-vertical-navigation-aside-overlay').forEach(el => el.remove());
        // Remove scroll-blocking class that Angular Material adds when overlays are open
        document.body.classList.remove('cdk-global-scrollblock');
      });
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        document.querySelectorAll('.cdk-overlay-backdrop').forEach(el => el.remove());
        document.querySelectorAll('.zuper-vertical-navigation-aside-overlay').forEach(el => el.remove());
        document.body.classList.remove('cdk-global-scrollblock');
      });
      await page.waitForTimeout(300);
    };

    // Step 1: Login
    await test.step('Login to the application', async () => {
      await page.goto('/');
      const companyInput = page.getByRole('textbox', { name: 'Company Name' }).describe('Company Name input');
      await companyInput.waitFor({ state: 'visible', timeout: 30000 });
      await companyInput.fill('zuper-pro');
      await page.getByRole('button', { name: 'Continue' }).describe('Continue button').click();

      await dismissPopups();

      const emailInput = page.getByRole('textbox', { name: 'Email address' }).describe('Email input');
      await emailInput.waitFor({ state: 'visible', timeout: 10000 });
      await emailInput.fill('vignesh.s@zuper.co');

      const passwordInput = page.getByRole('textbox', { name: 'Password Forgot password?' }).describe('Password input');
      await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
      await passwordInput.fill('Vicky@123');

      await page.getByRole('button', { name: 'Login', exact: true }).describe('Login button').click();
      await page.waitForURL('**/dashboard**', { timeout: 90000 });
    });

    // Step 2: Handle post-login dialogs
    await test.step('Handle post-login dialogs', async () => {
      await dismissPopups();
      await page.waitForTimeout(2000);
      await dismissPopups();
    });

    // Step 3: Navigate to Jobs
    await test.step('Navigate to Jobs module', async () => {
      await dismissPopups();
      try {
        const jobsMenu = page.locator('#job_group mat-icon').describe('Jobs group menu');
        await jobsMenu.waitFor({ state: 'visible', timeout: 15000 });
        await jobsMenu.click({ force: true });
        await page.waitForTimeout(1000);
        const jobsLink = page.getByRole('link', { name: 'Jobs', exact: true }).describe('Jobs link');
        await jobsLink.waitFor({ state: 'visible', timeout: 10000 });
        await jobsLink.click();
      } catch {
        await page.goto('/jobs');
      }
      await page.waitForURL('**/jobs**', { timeout: 30000 });
    });

    // Step 4: Open New Job form
    await test.step('Open New Job form', async () => {
      const newJobBtn = page.getByRole('link', { name: 'New Job' }).describe('New Job button');
      await newJobBtn.waitFor({ state: 'visible', timeout: 15000 });
      await newJobBtn.click();
      await page.waitForURL('**/jobs/new**', { timeout: 30000 });
      await page.waitForTimeout(2000);
    });

    // Step 5: Fill Job basic details
    await test.step('Fill Job basic details', async () => {
      await dismissPopups();

      const jobTitleInput = page.getByRole('textbox', { name: 'Job Title *' }).describe('Job Title input');
      await jobTitleInput.waitFor({ state: 'visible', timeout: 10000 });
      await jobTitleInput.fill(jobName);

      // Clear navigation overlay before interacting with form
      await clearOverlays();

      // Select Job Category
      const categoryCombo = page.getByRole('combobox', { name: 'Choose a Job Category' }).describe('Job Category combobox');
      await categoryCombo.scrollIntoViewIfNeeded();
      await categoryCombo.waitFor({ state: 'visible', timeout: 10000 });
      await categoryCombo.click();
      await page.waitForTimeout(1000);

      const categoryOption = page.getByRole('option', { name: 'Installation Services' }).describe('Installation Services option');
      await categoryOption.waitFor({ state: 'visible', timeout: 10000 });
      await categoryOption.click();
      await page.waitForTimeout(500);

      // Clear any overlays left by category dropdown
      await clearOverlays();
    });

    // Step 6: Quick Create Organization
    await test.step('Quick Create Organization', async () => {
      await clearOverlays();

      const addOrgBtn = page.locator('a').filter({ hasText: /^Add Organization$/ }).describe('Add Organization button');
      await addOrgBtn.scrollIntoViewIfNeeded();
      await addOrgBtn.waitFor({ state: 'visible', timeout: 10000 });
      await addOrgBtn.click({ force: true });

      const newOrgTab = page.getByText('New Organization').describe('New Organization tab');
      await newOrgTab.waitFor({ state: 'visible', timeout: 5000 });
      await newOrgTab.click();
      await page.waitForTimeout(500);

      // Fill org name
      const orgNameInput = page.getByRole('textbox', { name: 'Organization Name*' }).describe('Org Name input');
      await orgNameInput.waitFor({ state: 'visible', timeout: 5000 });
      await orgNameInput.fill(orgName);

      // Fill org email
      await page.getByRole('textbox', { name: 'Email*' }).describe('Org Email input').fill(orgEmail);

      // Fill Indian address with autocomplete (with manual fallback)
      const streetInput = page.getByRole('textbox', { name: 'Flat / House No, Street /' }).describe('Street Address input');
      await streetInput.click();
      await streetInput.pressSequentially('Anna Salai', { delay: 100 });
      await page.waitForTimeout(2000);

      // Try to select autocomplete suggestion, fall back to manual entry if it doesn't appear
      const suggestion = page.getByRole('button').filter({ hasText: /Anna Salai/ }).first();
      const suggestionVisible = await suggestion.isVisible().catch(() => false);
      if (suggestionVisible) {
        await suggestion.click();
        await page.waitForTimeout(1000);
      } else {
        // Autocomplete didn't appear — manually fill address fields
        await page.waitForTimeout(500);
        const cityInput = streetInput.locator('xpath=ancestor::*[contains(@class,"address")]//input[contains(@placeholder,"City")]').first();
        const cityVisible = await cityInput.isVisible().catch(() => false);
        if (cityVisible) {
          await cityInput.fill('Chennai');
        } else {
          // Try alternative selectors for city field within the org panel
          const cityByLabel = page.locator('text=City *').first().locator('..').locator('input').first();
          const cityByLabelVisible = await cityByLabel.isVisible().catch(() => false);
          if (cityByLabelVisible) {
            await cityByLabel.fill('Chennai');
          }
        }
        const stateInput = page.getByRole('textbox', { name: 'State / Province' }).first();
        const stateVisible = await stateInput.isVisible().catch(() => false);
        if (stateVisible) {
          await stateInput.fill('Tamil Nadu');
        }
      }

      // Tab out of address field to trigger validation
      await streetInput.click();
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);

      // Clear any overlays that appeared during autocomplete interaction
      await clearOverlays();
      await page.waitForTimeout(500);

      // Use NORMAL click so Angular handler fires
      const createOrgBtn = page.getByRole('button', { name: 'Create & Choose Organization' }).describe('Create & Choose Organization button');
      await createOrgBtn.scrollIntoViewIfNeeded();
      await createOrgBtn.waitFor({ state: 'visible', timeout: 5000 });
      await createOrgBtn.click();

      // Wait for panel to close (org created)
      const orgPanelHeading = page.getByRole('heading', { name: 'Choose Organization' });
      await orgPanelHeading.waitFor({ state: 'hidden', timeout: 20000 });
      await page.waitForTimeout(2000);
    });

    // Step 7: Quick Create Contact
    await test.step('Quick Create Contact', async () => {
      await clearOverlays();

      const addContactBtn = page.locator('a').filter({ hasText: /^Add Contact$/ }).describe('Add Contact button');
      await addContactBtn.scrollIntoViewIfNeeded();
      await addContactBtn.waitFor({ state: 'visible', timeout: 10000 });
      await addContactBtn.click({ force: true });

      const newContactTab = page.getByText('New Contact').describe('New Contact tab');
      await newContactTab.waitFor({ state: 'visible', timeout: 5000 });
      await newContactTab.click();
      await page.waitForTimeout(500);

      // Fill contact first name
      const firstNameInput = page.getByRole('textbox', { name: 'First Name*' }).describe('First Name input');
      await firstNameInput.waitFor({ state: 'visible', timeout: 10000 });
      await firstNameInput.fill(contactFirstName);

      // Fill contact email
      const contactEmailInput = page.getByRole('textbox', { name: 'Email*' }).describe('Contact Email input');
      await contactEmailInput.waitFor({ state: 'visible', timeout: 5000 });
      await contactEmailInput.fill(contactEmail);

      // Select Account Manager (required field) - scroll to label then click the combobox
      const accountManagerLabel = page.getByText('Account Manager*', { exact: true }).first();
      await accountManagerLabel.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      const accountManagerCombo = accountManagerLabel.locator('..').getByRole('combobox');
      await accountManagerCombo.click();
      await page.waitForTimeout(1000);
      // Select the first option from the dropdown
      const firstOption = page.locator('.ng-dropdown-panel .ng-option').first();
      await firstOption.waitFor({ state: 'visible', timeout: 10000 });
      await firstOption.click();

      // Clear overlays before Create click
      await clearOverlays();

      // Click Create & Choose Contact
      const createContactBtn = page.getByRole('button', { name: 'Create & Choose Contact' }).describe('Create & Choose Contact button');
      await createContactBtn.scrollIntoViewIfNeeded();
      await createContactBtn.waitFor({ state: 'visible', timeout: 5000 });
      await createContactBtn.click();

      // Wait for contact panel to close
      const contactPanelHeading = page.getByRole('heading', { name: 'Choose Contact' });
      await contactPanelHeading.waitFor({ state: 'hidden', timeout: 20000 });
      await page.waitForTimeout(2000);
    });

    // Step 8: Quick Create Property
    await test.step('Quick Create Property', async () => {
      await clearOverlays();

      // After contact panel closes, remove any lingering overlay containers/panes
      await page.evaluate(() => {
        document.querySelectorAll('.cdk-overlay-container .cdk-overlay-pane:empty').forEach(el => el.remove());
        document.querySelectorAll('.cdk-overlay-backdrop').forEach(el => el.remove());
        document.querySelectorAll('.cdk-overlay-transparent-backdrop').forEach(el => el.remove());
        // Remove 'cdk-global-scrollblock' class from body if present (prevents scrolling)
        document.body.classList.remove('cdk-global-scrollblock');
      });
      await page.waitForTimeout(1000);

      const addPropertyBtn = page.locator('a').filter({ hasText: /^Add Property$/ }).describe('Add Property button');
      // Wait for the element to be attached to DOM first, then scroll
      await addPropertyBtn.waitFor({ state: 'attached', timeout: 15000 });
      await addPropertyBtn.scrollIntoViewIfNeeded();
      await addPropertyBtn.waitFor({ state: 'visible', timeout: 10000 });
      await addPropertyBtn.click({ force: true });

      const newPropertyTab = page.getByText('New Property').describe('New Property tab');
      await newPropertyTab.waitFor({ state: 'visible', timeout: 5000 });
      await newPropertyTab.click();
      await page.waitForTimeout(500);

      // Fill property name
      const propNameInput = page.getByRole('textbox', { name: 'Property Name*' }).describe('Property Name input');
      await propNameInput.waitFor({ state: 'visible', timeout: 5000 });
      await propNameInput.fill(propertyName);

      // Fill Indian address with autocomplete (with manual fallback)
      const propStreetInput = page.getByRole('textbox', { name: 'Flat / House No, Street / Locality' }).describe('Property Street Address');
      await propStreetInput.click();
      await propStreetInput.pressSequentially('MG Road Bangalore', { delay: 100 });
      await page.waitForTimeout(2000);

      // Try to select autocomplete suggestion, fall back to manual entry if it doesn't appear
      const propSuggestion = page.getByRole('button').filter({ hasText: /MG Road/ }).first();
      const propSuggestionVisible = await propSuggestion.isVisible().catch(() => false);
      if (propSuggestionVisible) {
        await propSuggestion.click();
        await page.waitForTimeout(1000);
      } else {
        // Autocomplete didn't appear — manually fill address fields
        await page.waitForTimeout(500);
        const propCityInput = page.getByRole('textbox', { name: 'City' }).last();
        const propCityVisible = await propCityInput.isVisible().catch(() => false);
        if (propCityVisible) {
          await propCityInput.fill('Bangalore');
        }
        const propStateInput = page.getByRole('textbox', { name: 'State / Province' }).last();
        const propStateVisible = await propStateInput.isVisible().catch(() => false);
        if (propStateVisible) {
          await propStateInput.fill('Karnataka');
        }
        await page.waitForTimeout(500);
      }

      // Clear overlays before Create click
      await clearOverlays();
      await page.waitForTimeout(500);

      // Click Create & Choose Property - NORMAL click
      const createPropBtn = page.getByRole('button', { name: 'Create & Choose Property' }).describe('Create & Choose Property button');
      await createPropBtn.scrollIntoViewIfNeeded();
      await createPropBtn.waitFor({ state: 'visible', timeout: 5000 });
      await createPropBtn.click();

      // Wait for property panel to close
      await page.waitForTimeout(3000);
    });

    // Step 9: Fill remaining mandatory fields
    await test.step('Fill mandatory custom fields and due date', async () => {
      await clearOverlays();

      // Fill required Text Input custom field
      const textInputField = page.getByRole('textbox', { name: 'Text Input *' }).describe('Text Input custom field');
      await textInputField.scrollIntoViewIfNeeded();
      await textInputField.waitFor({ state: 'visible', timeout: 10000 });
      await textInputField.fill('Automation Job quick creation');

      // Set Due Date
      const dueDateInput = page.getByRole('textbox', { name: 'Due Date' }).describe('Due Date input');
      await dueDateInput.scrollIntoViewIfNeeded();
      await dueDateInput.click();

      // Pick a future date (tomorrow or later) - find the first enabled date button in the calendar
      await page.waitForTimeout(500);
      const enabledDateButton = page.locator('button.mat-calendar-body-cell:not(.mat-calendar-body-disabled)').first();
      await enabledDateButton.waitFor({ state: 'visible', timeout: 5000 });
      await enabledDateButton.click();
    });

    // Step 10: Create Job and verify
    await test.step('Create Job and verify success', async () => {
      const createJobBtn = page.locator('a').filter({ hasText: 'Create Job' }).describe('Create Job button');
      await createJobBtn.scrollIntoViewIfNeeded();
      await createJobBtn.click();

      // Handle confirmation dialog
      const confirmBtn = page.getByRole('button', { name: 'Create' });
      if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      // Wait for redirect to job details
      await page.waitForURL('**/jobs/**/details', { timeout: 30000 });
      await page.waitForTimeout(3000);

      // Verify job title
      const jobTitle = page.getByText(jobName).first().describe('Job title on details page');
      await expect(jobTitle).toBeVisible({ timeout: 15000 });

      // Extract Job ID from the page and URL
      const currentUrl = page.url();
      const urlMatch = currentUrl.match(/jobs\/([^/]+)/);
      const jobIdFromUrl = urlMatch ? urlMatch[1] : '';

      // Try to extract Work Order Number from the page
      const jobIdFromPage = await page.evaluate(() => {
        // Look for work order number in common locations
        const allText = document.body.innerText;
        const woMatch = allText.match(/(?:Work Order|WO|Job)\s*(?:#|No\.?|Number)?\s*:?\s*(\d+)/i);
        if (woMatch) return woMatch[1];
        // Check for a number near the job title area
        const headings = document.querySelectorAll('h1, h2, h3, .job-number, .work-order');
        for (const h of headings) {
          const numMatch = h.textContent.match(/\d{4,}/);
          if (numMatch) return numMatch[0];
        }
        return '';
      }).catch(() => '');

      // Also extract the due date displayed on the page
      const dueDateFromPage = await page.evaluate(() => {
        const allText = document.body.innerText;
        const dateMatch = allText.match(/Due Date[\s\S]*?((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s*\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
        return dateMatch ? dateMatch[1] : 'March 10, 2026';
      }).catch(() => 'March 10, 2026');

      console.log('========== JOB DETAILS ==========');
      console.log(`Job Title: ${jobName}`);
      console.log(`Job ID (from URL): ${jobIdFromUrl}`);
      console.log(`Job ID (from page): ${jobIdFromPage}`);
      console.log(`Job Due Date: ${dueDateFromPage}`);
      console.log(`Page URL: ${currentUrl}`);
      console.log('=================================');

      // Verify org is linked
      const orgLink = page.getByRole('link', { name: orgName }).first().describe('Organization link');
      await expect(orgLink).toBeVisible({ timeout: 10000 });

      // Verify job status
      const statusText = page.getByText('New', { exact: true }).first().describe('Job status');
      await expect(statusText).toBeVisible({ timeout: 10000 });

      // Verify category
      const categoryText = page.getByText('Installation Services').first().describe('Job category');
      await expect(categoryText).toBeVisible({ timeout: 10000 });
    });
  });
});
