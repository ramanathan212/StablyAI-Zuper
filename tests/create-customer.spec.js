import { test, expect } from '@playwright/test';
import { testData } from './test-data.js';
import { CustomerPage } from './pages/CustomerPage.js';

test.describe('Customer Management', () => {
  test('Create new customer with complete details', async ({ page }) => {
    // Initialize CustomerPage
    const customerPage = new CustomerPage(page);

    // Authentication already handled by global-setup.js
    // Start directly from the main screen

    // Step 1: Navigate to Contacts
    // Notification is already dismissed in global-setup.js
    await page.goto('/');
    await customerPage.navigateToContacts();

    // Step 2: Create new contact
    await customerPage.clickNewContact();

    // Step 3: Fill and save customer using the page object
    await customerPage.createCustomer(testData.customer);

    // Step 4: Verify customer created successfully
    const emailVisible = await customerPage.verifyCustomerCreated(testData.customer.email);
    expect(emailVisible).toBeTruthy();

    // Step 5: Verify detailed customer information
    await customerPage.verifyCustomerDetails(testData.customer);

    // Step 6: Final assertion on customer details section
    await expect(customerPage.customerDetailsSection).toBeVisible();
  });
});
