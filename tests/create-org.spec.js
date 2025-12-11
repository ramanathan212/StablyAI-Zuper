import { test, expect } from '@playwright/test';
import { testData } from './test-data.js';
import { clickWithOverlayHandling, waitForPageReady } from './Helper/overlay-helper.js';

test.describe('Organization Management', () => {
  test('Create new organization with complete details', async ({ page }) => {
    // Authentication already handled by global-setup.js
    // Start directly from the main screen

    // Step 1: Navigate to Organizations
    await page.goto('/');
    await waitForPageReady(page);
    await navigateToOrganizations(page);

    // Step 2: Create new organization
    await createNewOrganization(page);

    // Step 3: Fill organization details
    await fillOrganizationBasicInfo(page);
    await fillOrganizationAddress(page);
    await fillCustomFields(page);
    await selectOptions(page);
    await handleModalDialogs(page);

    // Step 4: Save organization
    await saveOrganization(page);

    // Step 5: Refresh page and verify organization created successfully
    // await page.reload();
    // await page.waitForLoadState('networkidle');
    // await verifyOrganizationCreated(page);
  });
});

// Helper Functions

async function navigateToOrganizations(page) {
  // Notification is already dismissed in global-setup.js
  // Open navigation menu
  const navigationIcon = page.locator("//zuper-vertical-navigation-aside-item[@id='customer_organization_property']");
  await clickWithOverlayHandling(navigationIcon);

  // Click Organizations link
  const organizationsMenuItem = page.getByRole('link', { name: 'Organizations' });
  await clickWithOverlayHandling(organizationsMenuItem);
}

async function createNewOrganization(page) {
  await page.getByRole('link', { name: ' New Organization' }).click();
}

async function fillOrganizationBasicInfo(page) {
  // Organization name
  await page.getByRole('textbox', { name: 'Organization Name*' }).click();
  await page.getByRole('textbox', { name: 'Organization Name*' }).fill(testData.organization.name);

  // Organization email
  await page.getByRole('textbox', { name: 'Organization Email*' }).click();
  await page.getByRole('textbox', { name: 'Organization Email*' }).fill(testData.organization.email);
}

async function fillOrganizationAddress(page) {
  // Service address
  await page.getByText('Service AddressContact First').first().click();
  await page.getByRole('textbox', { name: 'Flat / House No, Street /' }).first().fill(testData.organization.serviceAddress.search);
  await page.getByText(testData.organization.serviceAddress.select).click();

  // Use same address for billing
  if (testData.organization.serviceAddress.sameAsBilling) {
    await page.getByRole('checkbox', { name: 'Same As Service Address' }).check();
  }
}

async function fillCustomFields(page) {
  // Single line text
  await page.getByRole('textbox', { name: 'Single Line Text' }).click();
  await page.getByRole('textbox', { name: 'Single Line Text' }).fill(testData.organization.customFields.singleLineText);

  // Multi line text
  await page.getByRole('textbox', { name: 'Multi Line Text' }).click();
  await page.getByRole('textbox', { name: 'Multi Line Text' }).fill(testData.organization.customFields.multiLineText);
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
  await expect(page.getByRole('paragraph').filter({ hasText: testData.organization.name })).toBeVisible();

  // Verify organization status is active
  await expect(page.getByText('Active')).toBeVisible();
}
