import { test, expect } from '@stablyai/playwright-test';

test.describe('Organization and Customer Creation', () => {
  // Unique identifiers for test data
  const timestamp = Date.now();
  const orgName = `Test Org ${timestamp}`;
  const orgEmail = `testorg${timestamp}@test.com`;
  const customerFirstName = `Customer ${timestamp}`;
  const customerLastName = 'AutoTest';
  const customerEmail = `customer${timestamp}@test.com`;

  /**
   * Helper: Login to the application
   */
  async function login(page) {
    await page.goto('/signin');
    await page.getByRole('textbox', { name: 'Company Name' }).waitFor({ state: 'visible' });
    await page.getByRole('textbox', { name: 'Company Name' }).fill(process.env.company_name);
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByRole('textbox', { name: 'Email address' }).waitFor({ state: 'visible' });
    await page.getByRole('textbox', { name: 'Email address' }).fill(process.env.user_name);
    await page.getByRole('textbox', { name: 'Password Forgot password?' }).fill(process.env.password);
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    // Wait for dashboard to load
    await page.waitForURL('**/dashboard', { timeout: 60000 });

    // Dismiss timezone dialog if present
    try {
      const cancelButton = page.getByRole('button', { name: 'Cancel' });
      await cancelButton.waitFor({ state: 'visible', timeout: 5000 });
      await cancelButton.click();
    } catch {
      // No timezone dialog - continue
    }

    // Dismiss any onboarding modals
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  }

  /**
   * Helper: Navigate to Organizations page via sidebar
   */
  async function navigateToOrganizations(page) {
    const sidebarIcon = page.locator('#customer_organization_property mat-icon');
    await sidebarIcon.waitFor({ state: 'visible', timeout: 15000 });
    await sidebarIcon.click();

    const orgLink = page.getByRole('link', { name: 'Organizations' });
    await orgLink.waitFor({ state: 'visible', timeout: 10000 });
    await orgLink.click();

    await page.waitForURL('**/organizations', { timeout: 30000 });
  }

  /**
   * Helper: Navigate to Contacts page via sidebar
   */
  async function navigateToContacts(page) {
    const sidebarIcon = page.locator('#customer_organization_property mat-icon');
    await sidebarIcon.waitFor({ state: 'visible', timeout: 15000 });
    await sidebarIcon.click();

    const contactsLink = page.getByRole('link', { name: 'Contacts' });
    await contactsLink.waitFor({ state: 'visible', timeout: 10000 });
    await contactsLink.click();

    await page.waitForURL('**/customers', { timeout: 30000 });
  }

  /**
   * User Prompt:
   * - Go to - organization in the side menu bar -> Create new organization -> Fill mandatory fields and click save ensure organization is created
   */
  test('Create new organization with mandatory fields', async ({ page }) => {
    // Step 1: Login
    await login(page);

    // Step 2: Navigate to Organizations
    await navigateToOrganizations(page);

    // Step 3: Click New Organization
    const newOrgButton = page.getByRole('link', { name: 'New Organization' });
    await newOrgButton.waitFor({ state: 'visible', timeout: 10000 });
    await newOrgButton.click();
    await page.waitForURL('**/organizations/new', { timeout: 30000 });

    // Step 4: Fill mandatory fields - Organization Name
    const orgNameInput = page.getByRole('textbox', { name: 'Organization Name*' });
    await orgNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await orgNameInput.fill(orgName);

    // Fill Organization Email
    const orgEmailInput = page.getByRole('textbox', { name: 'Organization Email' });
    await orgEmailInput.fill(orgEmail);

    // Step 5: Fill Service Address (Street Address and City are mandatory)
    const streetAddressInput = page.getByRole('textbox', { name: 'Flat / House No, Street / Locality' }).first();
    await streetAddressInput.scrollIntoViewIfNeeded();
    await streetAddressInput.fill('123 Test Street');

    const cityInput = page.getByRole('textbox', { name: 'City' }).first();
    await cityInput.fill('Test City');

    // Check Same As Service Address for billing
    const sameAsServiceCheckbox = page.getByRole('checkbox', { name: 'Same As Service Address' });
    await sameAsServiceCheckbox.scrollIntoViewIfNeeded();
    await sameAsServiceCheckbox.check();

    // Step 6: Click Save Organization
    const saveOrgButton = page.locator('a, div, span').filter({ hasText: /^Save Organization$/ }).first();
    await saveOrgButton.scrollIntoViewIfNeeded();
    await saveOrgButton.click();

    // Step 7: Click Create button on confirmation dialog
    const createButton = page.getByRole('button', { name: 'Create' });
    await createButton.waitFor({ state: 'visible', timeout: 15000 });
    await createButton.click();

    // Step 8: Verify organization was created - should redirect to organization detail page
    await page.waitForURL(/\/organizations\/.*\/details/, { timeout: 30000 });

    // Verify the organization name is visible on the detail page
    const orgNameOnPage = page.getByText(orgName).first();
    await expect(orgNameOnPage).toBeVisible({ timeout: 15000 });

    // Verify the URL contains /organizations/ indicating successful creation
    expect(page.url()).toContain('/organizations/');
    expect(page.url()).toContain('/details');
  });

  /**
   * User Prompt:
   * - Go to - customers module in the side menu bar -> Create new customers -> Fill mandatory fields and click save ensure customer is created
   */
  test('Create new customer with mandatory fields', async ({ page }) => {
    // Step 1: Login
    await login(page);

    // Step 2: Navigate to Contacts
    await navigateToContacts(page);

    // Step 3: Click New Contact
    const newContactButton = page.getByRole('link', { name: 'New Contact' });
    await newContactButton.waitFor({ state: 'visible', timeout: 10000 });
    await newContactButton.click();

    // Wait for the new contact form to load
    await page.getByRole('textbox', { name: 'First Name *' }).waitFor({ state: 'visible', timeout: 15000 });

    // Step 4: Fill mandatory fields - First Name
    await page.getByRole('textbox', { name: 'First Name *' }).fill(customerFirstName);

    // Fill Last Name
    await page.getByRole('textbox', { name: 'Last Name', exact: true }).fill(customerLastName);

    // Fill Email (mandatory)
    const emailInput = page.getByRole('textbox', { name: 'Email *' });
    await emailInput.fill(customerEmail);

    // Click outside email to dismiss any tooltip
    await page.getByText('Primary Details').first().click();
    await page.waitForTimeout(500);

    // Step 5: Fill Service Address
    const serviceAddressSection = page.getByText('Service Address').first();
    await serviceAddressSection.scrollIntoViewIfNeeded();
    await serviceAddressSection.click();
    await page.waitForTimeout(500);

    const streetAddressInput = page.getByRole('textbox', { name: 'Flat / House No, Street / Locality' }).first();
    await streetAddressInput.waitFor({ state: 'visible', timeout: 10000 });
    await streetAddressInput.fill('456 Customer Avenue');

    const cityInput = page.getByRole('textbox', { name: 'City' }).first();
    await cityInput.fill('Customer City');

    // Step 6: Click Save Contact
    const saveContactButton = page.getByText('Save Contact', { exact: true });
    await saveContactButton.scrollIntoViewIfNeeded();
    await saveContactButton.click();

    // Step 7: Click Create button on confirmation dialog
    const createButton = page.locator('button').filter({ hasText: 'Create' }).first();
    await createButton.waitFor({ state: 'visible', timeout: 15000 });
    await createButton.click();

    // Step 8: Verify customer was created - should redirect to customer detail page
    await page.waitForURL(/\/contacts\/|\/customers\//, { timeout: 30000 });

    // Verify the URL indicates successful creation (redirected to detail page)
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/contacts\/|\/customers\//);

    // Verify customer email is visible on the detail page
    const emailOnPage = page.getByText(customerEmail).first();
    await expect(emailOnPage).toBeVisible({ timeout: 15000 });
  });
});
