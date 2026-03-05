import { test, expect } from '@stablyai/playwright-test';
import { LoginPage } from './pages/LoginPage.js';

test.describe('Create Job with Stably AI Title', () => {
  /**
   * User Prompt:
   * - Log in 'https://stagingv3.zuperpro.com/' Company name: TestR, username: ragupathy.s@zuper.co, password: Test@1234
   * - after logged in cancel the pop ups in the Home Page
   * - Navigate to the Jobs module
   * - Create new job
   * - Fill all the mandatory fields
   * - Job Title - QARaguStablyAI
   */
  test('should create a new job with title QARaguStablyAI', async ({ page }) => {
    // Step 1: Login
    const loginPage = new LoginPage(page, 'https://stagingv3.zuperpro.com');
    await loginPage.login('TestR', 'ragupathy.s@zuper.co', 'Test@1234');

    // Step 2: Dismiss popups on Home Page (timezone popup)
    const cancelButton = page.getByRole('button', { name: 'Cancel' }).describe('Cancel timezone popup');
    await cancelButton.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }

    // Step 3: Navigate to Jobs module via sidebar
    const jobGroupIcon = page.locator('#job_group').describe('Jobs group sidebar icon');
    await jobGroupIcon.waitFor({ state: 'visible', timeout: 15000 });
    await jobGroupIcon.click();

    const jobsLink = page.getByRole('link', { name: 'Jobs' }).describe('Jobs link in sidebar');
    await jobsLink.waitFor({ state: 'visible', timeout: 10000 });
    await jobsLink.click();

    // Verify Jobs page loaded
    await expect(page).toHaveURL(/\/jobs/, { timeout: 15000 });

    // Step 4: Click New Job
    const newJobLink = page.getByRole('link', { name: ' New Job' }).describe('New Job button');
    await newJobLink.waitFor({ state: 'visible', timeout: 10000 });
    await newJobLink.click();

    // Verify New Job form loaded
    await expect(page).toHaveURL(/\/jobs\/new/, { timeout: 15000 });

    // Step 5: Fill mandatory fields

    // 5a: Job Title
    const jobTitleInput = page.getByRole('textbox', { name: 'Job Title *' }).describe('Job Title input');
    await jobTitleInput.waitFor({ state: 'visible', timeout: 10000 });
    await jobTitleInput.fill('QARaguStablyAI');

    // 5b: Job Category
    const categoryDropdown = page.getByText('Choose a Job Category', { exact: true }).describe('Job Category dropdown');
    await categoryDropdown.scrollIntoViewIfNeeded();
    await categoryDropdown.click();

    const categoryOption = page.getByRole('option', { name: 'TestRCategory' }).describe('TestRCategory option');
    await categoryOption.waitFor({ state: 'visible', timeout: 10000 });
    await categoryOption.click();

    // 5c: Due Date (pick a future date)
    const dueDateInput = page.getByRole('textbox', { name: 'Due Date' }).describe('Due Date input');
    await dueDateInput.scrollIntoViewIfNeeded();
    await dueDateInput.click();

    // Calculate tomorrow's date dynamically for the date picker
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const dueDateLabel = `${monthNames[tomorrow.getMonth()]} ${tomorrow.getDate()},`;

    const dateButton = page.getByRole('button', { name: dueDateLabel }).describe('Tomorrow date button');
    await dateButton.waitFor({ state: 'visible', timeout: 10000 });
    await dateButton.click();

    // 5d: Add Organization (mandatory - Customer or Organization required)
    const addOrgLink = page.locator('a').filter({ hasText: /^Add Organization$/ }).describe('Add Organization link');
    await addOrgLink.scrollIntoViewIfNeeded();
    await addOrgLink.click();

    const orgRadio = page.getByRole('radio', { name: 'TestROrg' }).describe('TestROrg radio button');
    await orgRadio.waitFor({ state: 'visible', timeout: 10000 });
    await orgRadio.click();

    const chooseOrgButton = page.getByRole('button', { name: 'Choose Organization' }).describe('Choose Organization button');
    await chooseOrgButton.waitFor({ state: 'visible', timeout: 10000 });
    await chooseOrgButton.click();

    // Step 6: Create Job
    const createJobLink = page.locator('a').filter({ hasText: 'Create Job' }).describe('Create Job button');
    await createJobLink.scrollIntoViewIfNeeded();
    await createJobLink.click();

    // Confirm job creation in the dialog
    const createConfirmButton = page.getByRole('button', { name: 'Create' }).describe('Create confirmation button');
    await createConfirmButton.waitFor({ state: 'visible', timeout: 10000 });
    await createConfirmButton.click();

    // Step 7: Verify job created successfully
    await expect(page).toHaveURL(/\/jobs\/.*\/details/, { timeout: 30000 });
    
    const jobTitle = page.locator('p').filter({ hasText: 'QARaguStablyAI' }).first().describe('Job title on details page');
    await expect(jobTitle).toBeVisible({ timeout: 15000 });

    const jobCategory = page.getByRole('definition').filter({ hasText: 'TestRCategory' }).describe('Job category definition');
    await expect(jobCategory).toBeVisible();

    const orgName = page.getByRole('heading', { name: 'TestROrg' }).describe('Organization name on job details');
    await expect(orgName).toBeVisible();
  });
});
