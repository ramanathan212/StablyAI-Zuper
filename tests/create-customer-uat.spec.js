import { test, expect } from '@stablyai/playwright-test';
import { LoginPage } from './pages/LoginPage.js';
import { CustomerPage } from './pages/CustomerPage.js';
import { testData } from './test-data.js';

test.describe('Customer Creation - UAT', () => {
  /**
   * User Prompt:
   * - Create a new agent for Customer creation from the UAT
   */
  test('Create new customer with complete details on UAT', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const customerPage = new CustomerPage(page);
    const customerData = testData.customer;

    // Step 1: Login to UAT
    await test.step('Login to UAT', async () => {
      await loginPage.login(
        testData.login.companyName,
        testData.login.email,
        testData.login.password
      );
      await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });
    });

    // Step 2: Dismiss any popups
    await test.step('Dismiss popups if present', async () => {
      await page.waitForTimeout(2000);

      // Dismiss timezone dialog if it appears
      const timezoneDialog = page.getByRole('heading', { name: 'Your timezone has changed' }).describe('Timezone change dialog');
      if (await timezoneDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.getByRole('button', { name: 'Cancel' }).describe('Cancel timezone dialog').click();
        await timezoneDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      }

      // Dismiss welcome/onboarding notification
      await customerPage.dismissWelcomeNotification();
    });

    // Step 3: Navigate to Contacts
    await test.step('Navigate to Contacts page', async () => {
      await customerPage.navigateToContacts();
    });

    // Step 4: Click New Contact
    await test.step('Click New Contact', async () => {
      await customerPage.clickNewContact();
    });

    // Step 5: Fill primary details (name, org, email, account manager)
    await test.step('Fill primary details', async () => {
      await customerPage.fillPrimaryDetails(customerData);
      await customerPage.selectOrganization(customerData.organization);
      await customerPage.fillEmailAddress(customerData.email);
      await customerPage.selectAccountManager(customerData.accountManager);
    });

    // Step 6: Fill service address
    await test.step('Fill service address', async () => {
      // Scroll to and open service address section
      await customerPage.serviceAddressSection.click();
      await page.waitForTimeout(500);

      // Type address search text character by character to trigger autocomplete
      const streetAddressInput = customerPage.serviceAddressInput.describe('Street address input');
      await streetAddressInput.waitFor({ state: 'visible', timeout: 10000 });
      await streetAddressInput.click();
      await streetAddressInput.pressSequentially('walmart', { delay: 100 });
      await page.waitForTimeout(3000);

      // Select the first address suggestion from the Google Places autocomplete dropdown
      // The suggestions render as buttons outside the main form container
      const firstSuggestion = page.getByRole('button', { name: /Walmart/i }).first().describe('First address autocomplete suggestion');
      await firstSuggestion.waitFor({ state: 'visible', timeout: 15000 });
      await firstSuggestion.click();
      await page.waitForTimeout(1000);
    });

    // Step 7: Check Same As Service Address
    await test.step('Check Same As Service Address', async () => {
      const sameAsServiceCheckbox = page.getByRole('checkbox', { name: 'Same As Service Address' }).describe('Same As Service Address checkbox');
      await sameAsServiceCheckbox.check();
    });

    // Step 8: Save Contact
    await test.step('Save Contact', async () => {
      const saveContactLink = page.locator('a').filter({ hasText: 'Save Contact' }).describe('Save Contact button');
      await saveContactLink.waitFor({ state: 'visible', timeout: 10000 });
      await saveContactLink.click();

      // Wait for and click Create in the confirmation dialog
      const createButton = page.getByRole('button', { name: 'Create' }).describe('Create confirmation button');
      await createButton.waitFor({ state: 'visible', timeout: 25000 });
      await createButton.click();
    });

    // Step 9: Verify customer created - URL redirect
    await test.step('Verify customer creation - URL redirect', async () => {
      await expect(page).toHaveURL(/customers\/.*\/details/, { timeout: 15000 });
    });

    // Step 10: Verify customer email visible on detail page
    await test.step('Verify customer email is visible', async () => {
      const emailDefinition = page.getByRole('definition').filter({ hasText: customerData.email }).describe('Customer email in details');
      await expect(emailDefinition).toBeVisible({ timeout: 15000 });
    });

    // Step 11: Verify active status
    await test.step('Verify customer status is Active', async () => {
      const activeStatus = page.getByRole('definition').filter({ hasText: 'Active' }).describe('Active status badge');
      await expect(activeStatus).toBeVisible({ timeout: 10000 });
    });

    // Step 12: Verify organization link
    await test.step('Verify organization is linked', async () => {
      const orgLink = page.getByRole('link', { name: customerData.organization }).describe('Organization link');
      await expect(orgLink).toBeVisible({ timeout: 10000 });
    });

    // Step 13: Verify success toast message
    await test.step('Verify success notification', async () => {
      const successToast = page.getByText('Customer created successfully').describe('Success toast message');
      await expect(successToast).toBeVisible({ timeout: 10000 });
    });
  });
});
