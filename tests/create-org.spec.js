import { test, expect } from '@playwright/test';

// Test Configuration
const CONFIG = {
  baseUrl: 'https://uat.zuperpro.com/login',
  credentials: {
    companyName: 'zuper-pro',
    email: 'vignesh.s@zuper.co',
    password: 'Vicky@123'
  },
  organization: {
    name: 'UAT Validation',
    email: 'uatvalidation@gmail.com',
    address: 'turya',
    customFields: {
      singleLineText: 'single',
      multiLineText: 'mutliple'
    },
    date: 'November 29,'
  }
};

test.describe('Organization Management', () => {
  test('Create new organization with complete details', async ({ page }) => {
    // Step 1: Login to application
    await loginToApplication(page);

    // Step 2: Navigate to Organizations
    await navigateToOrganizations(page);

    // Step 3: Create new organization
    await createNewOrganization(page);

    // Step 4: Fill organization details
    await fillOrganizationBasicInfo(page);
    await fillOrganizationAddress(page);
    await fillCustomFields(page);
    await selectDateTime(page);
    await selectOptions(page);
    await handleModalDialogs(page);

    // Step 5: Save organization
    await saveOrganization(page);

    // Step 6: Verify organization created successfully
    await verifyOrganizationCreated(page);
  });
});

// Helper Functions

async function loginToApplication(page) {
  await page.goto(CONFIG.baseUrl);

  // Enter company name
  await page.getByRole('textbox', { name: 'Company Name' }).click();
  await page.getByRole('textbox', { name: 'Company Name' }).fill(CONFIG.credentials.companyName);
  await page.getByRole('button', { name: 'Continue' }).click();

  // Enter credentials
  await page.getByRole('textbox', { name: 'Email address' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill(CONFIG.credentials.email);
  await page.getByRole('textbox', { name: 'Password Forgot password?' }).click();
  await page.getByRole('textbox', { name: 'Password Forgot password?' }).fill(CONFIG.credentials.password);

  // Login
  await page.getByRole('button', { name: 'Login', exact: true }).click();
}

async function navigateToOrganizations(page) {
  // Open navigation menu
  await page.locator('.mat-mdc-tooltip-trigger.zuper-vertical-navigation-item.zuper-vertical-navigation-item-active > .mat-icon > svg').click();
  await page.getByRole('link', { name: 'Organizations' }).click();

  // Dismiss notification if present
  await page.getByRole('button', { name: 'No, thanks' }).click();
}

async function createNewOrganization(page) {
  await page.getByRole('link', { name: ' New Organization' }).click();
}

async function fillOrganizationBasicInfo(page) {
  // Organization name
  await page.getByRole('textbox', { name: 'Organization Name*' }).click();
  await page.getByRole('textbox', { name: 'Organization Name*' }).fill(CONFIG.organization.name);

  // Organization email
  await page.getByRole('textbox', { name: 'Organization Email*' }).click();
  await page.getByRole('textbox', { name: 'Organization Email*' }).fill(CONFIG.organization.email);
}

async function fillOrganizationAddress(page) {
  // Service address
  await page.getByText('Service AddressContact First').first().click();
  await page.getByRole('textbox', { name: 'Flat / House No, Street /' }).first().fill(CONFIG.organization.address);
  await page.getByText('Turyaa Chennai, Rajiv Gandhi').click();

  // Use same address for billing
  await page.getByRole('checkbox', { name: 'Same As Service Address' }).check();
}

async function fillCustomFields(page) {
  // Single line text
  await page.getByRole('textbox', { name: 'Single Line Text' }).click();
  await page.getByRole('textbox', { name: 'Single Line Text' }).fill(CONFIG.organization.customFields.singleLineText);

  // Multi line text
  await page.getByRole('textbox', { name: 'Multi Line Text' }).click();
  await page.getByRole('textbox', { name: 'Multi Line Text' }).fill(CONFIG.organization.customFields.multiLineText);
}

async function selectDateTime(page) {
  // Select date
  await page.getByRole('textbox', { name: 'Date' }).click();
  await page.getByRole('button', { name: CONFIG.organization.date }).click();

  // Select time
  await page.locator('#UAT_Time').click();
  await page.getByRole('button', { name: 'PM' }).click();
  await page.locator('.cdk-overlay-backdrop').click();
}

async function selectOptions(page) {
  await page.getByRole('checkbox', { name: 'option 1' }).check();
}

async function handleModalDialogs(page) {
  const uatFilter = page.locator('a').filter({ hasText: 'UAT Single Line Text Multi' });

  // Handle first dialog
  await uatFilter.click();
  await page.getByRole('button', { name: 'OK' }).click();

}

async function saveOrganization(page) {
  await page.locator('a').filter({ hasText: 'Save Organization' }).click();
  await page.getByRole('button', { name: 'Create' }).click();
}

async function verifyOrganizationCreated(page) {
  // Verify organization name is visible
  await expect(page.getByRole('paragraph').filter({ hasText: CONFIG.organization.name })).toBeVisible();

  // Verify organization status is active
  await expect(page.getByText('Active')).toBeVisible();
}
