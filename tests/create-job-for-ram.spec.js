import { test, expect } from '@stablyai/playwright-test';
import { LoginPage } from './pages/LoginPage.js';

const STAGING_URL = 'https://stagingv3.zuperpro.com';

test.describe('Job Creation for Ram', () => {
  /**
   * User Prompt:
   * - url - https://stagingv3.zuperpro.com/
   *   company name - sofyaizuper
   *   user name - ramanathan.m@zuper.co
   *   password - Test@123
   *   create a job and assert the mandatory fields
   *   job title - job for ram + timestamp
   *
   * [Clarifications:]
   * - username corrected: ramanathan.m@zuper.co (not ramanthan)
   */
  test('Create a job with mandatory fields and verify', async ({ page }) => {
    const loginPage = new LoginPage(page, STAGING_URL);
    const timestamp = Date.now();
    const jobTitle = `job for ram ${timestamp}`;

    // Step 1: Login to the application
    await test.step('Login to application', async () => {
      await loginPage.login('sofyaizuper', 'ramanathan.m@zuper.co', 'Test@123');
      await loginPage.dismissOnboarding();

      // Dismiss timezone dialog if it appears
      const cancelButton = page.getByRole('button', { name: 'Cancel' }).describe('Timezone dialog Cancel button');
      try {
        await cancelButton.waitFor({ state: 'visible', timeout: 10000 });
        await cancelButton.click();
      } catch {
        // No timezone dialog, continue
      }
    });

    // Step 2: Navigate to Jobs page
    await test.step('Navigate to Jobs page', async () => {
      await page.goto(`${STAGING_URL}/jobs`);
      const newJobLink = page.getByRole('link', { name: 'New Job' }).describe('New Job link');
      await newJobLink.waitFor({ state: 'visible', timeout: 30000 });
    });

    // Step 3: Click New Job
    await test.step('Click New Job button', async () => {
      const newJobLink = page.getByRole('link', { name: 'New Job' }).describe('New Job link');
      await newJobLink.click();
      const jobTitleInput = page.getByRole('textbox', { name: 'Job Title *' }).describe('Job Title input');
      await jobTitleInput.waitFor({ state: 'visible', timeout: 15000 });
    });

    // Step 4: Fill Job Title (mandatory)
    await test.step('Fill Job Title', async () => {
      const jobTitleInput = page.getByRole('textbox', { name: 'Job Title *' }).describe('Job Title input');
      await jobTitleInput.click();
      await jobTitleInput.fill(jobTitle);
    });

    // Step 5: Select Job Category (mandatory)
    await test.step('Select Job Category - Cleaning', async () => {
      const categoryDropdown = page.getByText('Choose a Job Category', { exact: true }).describe('Job Category dropdown');
      await categoryDropdown.scrollIntoViewIfNeeded();
      await categoryDropdown.click();
      const cleaningOption = page.getByRole('option', { name: 'Cleaning' }).describe('Cleaning option');
      await cleaningOption.waitFor({ state: 'visible', timeout: 5000 });
      await cleaningOption.click();
    });

    // Step 6: Set Due Date (mandatory - due date or scheduled date required)
    await test.step('Set Due Date', async () => {
      const dueDateInput = page.getByRole('textbox', { name: 'Due Date' }).describe('Due Date input');
      await dueDateInput.scrollIntoViewIfNeeded();
      await dueDateInput.click();

      // Calculate a future date (7 days from now)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      const dateButtonName = `${monthNames[futureDate.getMonth()]} ${futureDate.getDate()},`;

      // If the date is in the next month, click "Next month" first
      const today = new Date();
      if (futureDate.getMonth() !== today.getMonth()) {
        const nextMonthButton = page.getByRole('button', { name: 'Next month' }).describe('Next month button');
        await nextMonthButton.click();
      }

      const dateButton = page.getByRole('button', { name: dateButtonName }).describe('Due date selection button');
      await dateButton.waitFor({ state: 'visible', timeout: 5000 });
      await dateButton.click();
    });

    // Step 7: Add Service Address (mandatory)
    await test.step('Add Service Address', async () => {
      const addServiceAddress = page.getByText('Add Service Address', { exact: true }).describe('Add Service Address link');
      await addServiceAddress.scrollIntoViewIfNeeded();
      await addServiceAddress.click();

      // Search for address
      const searchAddressInput = page.getByRole('searchbox', { name: 'Search Address' }).describe('Search Address input');
      await searchAddressInput.waitFor({ state: 'visible', timeout: 10000 });
      await searchAddressInput.fill('Chennai');

      // Wait for and select address result
      const chennaiOption = page.getByRole('button', { name: 'Chennai, Tamil Nadu, India', exact: true }).describe('Chennai address option');
      await chennaiOption.waitFor({ state: 'visible', timeout: 10000 });
      await chennaiOption.click();

      // Click Add to save the service address
      const addButton = page.getByRole('button', { name: 'Add' }).describe('Add service address button');
      await addButton.waitFor({ state: 'visible', timeout: 5000 });
      await addButton.click();

      // Verify address was added
      await expect(page.getByText('Chennai, Tamil Nadu, India, Chennai, Tamil Nadu').describe('Service address text')).toBeVisible({ timeout: 10000 });
    });

    // Step 8: Add Organization (mandatory - contact or organization required)
    await test.step('Add Organization - KT Organization', async () => {
      const addOrgLink = page.getByText('Add Organization', { exact: true }).describe('Add Organization link');
      await addOrgLink.scrollIntoViewIfNeeded();
      await addOrgLink.click();

      // Wait for organization chooser modal
      const orgSearchInput = page.getByRole('textbox', { name: 'Search Organizations ...' }).describe('Organization search input');
      await orgSearchInput.waitFor({ state: 'visible', timeout: 10000 });

      // Select KT Organization
      const ktOrgRadio = page.getByRole('radio', { name: 'KT Organization' }).describe('KT Organization radio');
      await ktOrgRadio.waitFor({ state: 'visible', timeout: 10000 });
      await ktOrgRadio.check();

      // Click Choose Organization
      const chooseOrgButton = page.getByRole('button', { name: 'Choose Organization' }).describe('Choose Organization button');
      await chooseOrgButton.click();

      // Verify organization was added
      await expect(page.getByText('KT Organization').first().describe('Organization name')).toBeVisible({ timeout: 10000 });
    });

    // Step 9: Fill mandatory custom field - Date & Time test
    await test.step('Fill Date & Time test custom field', async () => {
      const dateTimeField = page.locator('[id="test_Date & Time test"]').describe('Date & Time test custom field');
      await dateTimeField.scrollIntoViewIfNeeded();
      await dateTimeField.click();

      // Accept the default date & time by clicking OK
      const okButton = page.getByRole('button', { name: 'OK' }).describe('OK button on datetime picker');
      await okButton.waitFor({ state: 'visible', timeout: 5000 });
      await okButton.click();
    });

    // Step 10: Create the Job
    await test.step('Create Job', async () => {
      // Click Create Job link at top
      const createJobLink = page.getByText('Create Job', { exact: true }).describe('Create Job link');
      await createJobLink.scrollIntoViewIfNeeded();
      await createJobLink.click();

      // Confirm in the dialog
      const createButton = page.getByRole('button', { name: 'Create' }).describe('Create confirmation button');
      await createButton.waitFor({ state: 'visible', timeout: 10000 });
      await createButton.click();

      // Wait for job details page to load
      await expect(page).toHaveURL(/\/jobs\/.*\/details/, { timeout: 30000 });
    });

    // Step 11: Assert mandatory fields on the job details page
    await test.step('Assert job created with mandatory fields', async () => {
      // Assert URL is on job details page
      await expect(page).toHaveURL(/\/jobs\/.*\/details/);

      // Assert job title is visible in the page title
      await expect(page).toHaveTitle(new RegExp(jobTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

      // Assert job title is displayed on the page
      await expect(page.getByText(jobTitle).first().describe('Job title on details page')).toBeVisible({ timeout: 10000 });

      // Assert status is New
      await expect(page.getByText('New', { exact: true }).first().describe('Job status')).toBeVisible();

      // Assert Job Category is Cleaning
      const categoryDef = page.locator('dt:has-text("Job Category") + dd').describe('Job Category value');
      await expect(categoryDef).toContainText('Cleaning');

      // Assert Due Date is set
      const dueDateDef = page.locator('dt:has-text("Due Date") + dd').describe('Due Date value');
      await expect(dueDateDef).not.toContainText('---');

      // Assert Organization is KT Organization
      await expect(page.getByRole('heading', { name: 'KT Organization' }).describe('Organization heading')).toBeVisible({ timeout: 10000 });
    });
  });
});
