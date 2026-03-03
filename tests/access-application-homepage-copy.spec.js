import { test as base, expect } from '@stablyai/playwright-test';

const test = base;

/**
 * User Prompt:
 * - Make a new test for accessing the application homepage, logging in, creating a new customer,
 *   and navigating to create a new job. Try to select a job category in the 'Job Category' dropdown.
 * - Create a new job
 */
test('[Stably team testing] Access application homepage - Copy', async ({ page, context, agent }, testInfo) => {
  var VARS = {};

  await test.step("Go to https://uat.zuperpro.com and login", async () => {
    await page.goto('https://uat.zuperpro.com');

    // Wait for the login page to fully load
    await page.getByText("Company Name").first().waitFor({ state: 'visible' });

    // Enter company name
    await page.getByRole('textbox', { name: 'Company Name' }).describe('Company Name textbox').fill('Zuper-pro');
    await page.getByRole('button', { name: 'Continue' }).describe('Continue button').click();

    // Enter credentials
    await page.getByRole('textbox', { name: 'Email address' }).describe('Email address textbox').fill('vignesh.s@zuper.co');
    await page.getByRole('textbox', { name: 'Password Forgot password?' }).describe('Password textbox').fill('Vicky@123');
    await page.getByRole('button', { name: 'Login', exact: true }).describe('Login button').click();

    // Dismiss notification dialog if present
    try {
      await page.getByRole('button', { name: 'No, thanks' }).describe('No thanks button').click({ timeout: 5000 });
    } catch {
      // Notification dialog may not appear
    }

    // Dismiss timezone dialog if present
    try {
      await page.getByRole('button', { name: 'Cancel' }).describe('Cancel button').click({ timeout: 5000 });
    } catch {
      // Timezone dialog may not appear
    }
  });

  await test.step("Navigate to Jobs and create New Job", async () => {
    // Click on Jobs menu in sidebar
    await page.locator('#job_group mat-icon').describe('Jobs menu icon').click();

    // Click on Jobs link
    await page.getByRole('link', { name: 'Jobs', exact: true }).describe('Jobs link').click();

    // Click New Job button
    await page.getByRole('link', { name: ' New Job' }).describe('New Job link').click();

    // Verify we're on the New Job page
    await expect(page).toHaveURL(/.*\/jobs\/new/);
  });

  await test.step("Select a Job Category from the dropdown", async () => {
    // Wait for the form to be fully loaded
    await page.getByRole('combobox', { name: 'Choose a Job Category' }).describe('Job Category dropdown').waitFor({ state: 'visible' });

    // Open the Job Category dropdown by clicking on the combobox
    await page.getByRole('combobox', { name: 'Choose a Job Category' }).describe('Job Category dropdown').click();

    // Wait for dropdown options to appear and select "Fixes"
    await page.getByRole('option', { name: 'Fixes' }).describe('Fixes option').click();

    // Verify the Job Category was selected by checking the combobox now shows "Fixes"
    await expect(page.getByRole('combobox', { name: 'Fixes' })).toBeVisible();
  });

  await test.step("Fill in job details and create the job", async () => {
    // Generate unique job title with timestamp
    const jobTitle = `Test Job Created by Stably ${Date.now()}`;

    // Enter job title
    await page.getByRole('textbox', { name: 'Job Title *' }).describe('Job Title textbox').fill(jobTitle);

    // Click on Due Date to open date picker
    await page.getByRole('textbox', { name: 'Due Date' }).describe('Due Date textbox').click();

    // Select tomorrow's date (next available day button)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayOfMonth = tomorrow.getDate();
    await page.getByRole('button', { name: new RegExp(`${dayOfMonth},`) }).describe('Date picker day button').click();

    // Add service address
    await page.locator('a').filter({ hasText: /^Add Service Address$/ }).describe('Add Service Address link').click();

    // Search for a service address
    await page.getByRole('searchbox', { name: 'Search Address' }).describe('Search Address searchbox').fill('123 Main Street, Seattle, WA');
    await page.keyboard.press('Enter');

    // Wait for address suggestions and add it
    await page.getByRole('button', { name: 'Add' }).describe('Add button').click();

    // Add a contact to satisfy the mandatory requirement
    await page.locator('a').filter({ hasText: /^Add Contact$/ }).describe('Add Contact link').click();

    // Select the first contact from the list
    await page.getByRole('radio', { name: 'oct' }).describe('Contact radio button').click();

    // Confirm the contact selection
    await page.getByRole('button', { name: 'Choose Contact' }).describe('Choose Contact button').click();

    // Fill in the required Text Input field (custom field)
    await page.getByRole('textbox', { name: 'Text Input *' }).describe('Text Input required field').fill('Test Input Value');

    // Click Create Job button
    await page.locator('a').filter({ hasText: 'Create Job' }).describe('Create Job button').click();

    // Confirm the job creation in the dialog
    await page.getByRole('button', { name: 'Create' }).describe('Create confirmation button').click();

    // Verify job was created successfully by checking the URL contains the job ID
    await expect(page).toHaveURL(/.*\/jobs\/[a-f0-9-]+\/details/);

    // Verify the success message or job title is visible on the details page
    await expect(page.getByText(jobTitle)).toBeVisible();
  });
});
