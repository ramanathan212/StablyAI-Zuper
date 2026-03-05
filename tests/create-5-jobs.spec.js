import { test, expect } from '@stablyai/playwright-test';

test.describe('Create 5 Jobs with Mandatory Fields', () => {
  /**
   * User Prompt:
   * - Log in "https://web.zuperpro.com/"
   *   Company Name- ZuperQA, username - qa@zuper.co, password- Test@1234
   * - Cancel the Pop up in the home page
   * - Go to the jobs module
   * - Create 5 jobs with mandatory fields
   *   Job names : QA-Job1, QA-Job2, QA-Job3, QA-Job4, QA-Job5
   */
  test('should create 5 jobs with mandatory fields', async ({ page, agent }) => {
    test.setTimeout(600000); // 10 minutes for creating 5 jobs

    // Step 1: Login
    await test.step('Login to Zuper', async () => {
      await page.goto('https://web.zuperpro.com/login');
      await page.getByRole('textbox', { name: 'Company Name' }).waitFor({ state: 'visible' });
      await page.getByRole('textbox', { name: 'Company Name' }).fill('ZuperQA');
      await page.getByRole('button', { name: 'Continue' }).click();

      const emailField = page.getByRole('textbox', { name: 'Email address' });
      await emailField.waitFor({ state: 'visible' });
      await emailField.fill('qa@zuper.co');

      const passwordField = page.getByRole('textbox', { name: 'Password Forgot password?' });
      await passwordField.waitFor({ state: 'visible' });
      await passwordField.fill('Test@1234');

      await page.getByRole('button', { name: 'Login' }).click();
      await page.waitForURL(/dashboard/, { timeout: 60000 });
    });

    // Step 2: Dismiss popups
    await test.step('Dismiss popups on homepage', async () => {
      await page.waitForTimeout(3000);

      // Dismiss timezone dialog
      const timezoneHeading = page.getByRole('heading', { name: 'Your timezone has changed' });
      if (await timezoneHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.getByRole('button', { name: 'Cancel' }).click();
        await timezoneHeading.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      }

      // Dismiss notification dialog
      const noThanksButton = page.getByRole('button', { name: 'No, thanks' });
      if (await noThanksButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await noThanksButton.click();
        await page.waitForTimeout(500);
      }

      // Dismiss release notes / overlays
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    });

    // Step 3: Create 5 jobs
    const jobNames = ['QA-Job1', 'QA-Job2', 'QA-Job3', 'QA-Job4', 'QA-Job5'];

    for (const jobName of jobNames) {
      await test.step(`Create job: ${jobName}`, async () => {
        // Navigate to Jobs > New Job
        await page.goto('https://web.zuperpro.com/jobs/new');
        await page.getByText('Getting things ready').first().waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
        await page.getByRole('textbox', { name: 'Job Title *' }).waitFor({ state: 'visible', timeout: 30000 });

        // Fill Job Title
        await page.getByRole('textbox', { name: 'Job Title *' }).fill(jobName);

        // Select Job Category - "Cleaning" is available
        await page.locator('text=Choose a Job Category').click();
        await page.waitForTimeout(1000);
        await page.getByText('Cleaning', { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });
        await page.getByText('Cleaning', { exact: true }).first().click();
        await page.waitForTimeout(500);

        // Set Due Date
        await page.getByRole('textbox', { name: 'Due Date' }).click();
        await page.waitForTimeout(1000);
        // Click a future date in the calendar
        const today = new Date();
        const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const dueDateLabel = `${monthNames[futureDate.getMonth()]} ${futureDate.getDate()},`;
        const dateButton = page.getByRole('button', { name: dueDateLabel });
        if (await dateButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await dateButton.click();
        } else {
          await agent.act('Click on any available future date in the calendar date picker', { page, maxCycles: 5 });
        }
        await page.waitForTimeout(500);
        // Close calendar by clicking on the job title
        await page.getByRole('textbox', { name: 'Job Title *' }).click();
        await page.waitForTimeout(500);

        // Add Service Address - opens a modal dialog with map and form
        await page.getByText('Add Service Address').scrollIntoViewIfNeeded();
        await page.getByText('Add Service Address').click();
        await page.waitForTimeout(2000);

        // Use agent to handle the Service Address modal (it has overlay issues with Angular CDK)
        await agent.act('In the Service Address modal that is open, type "New York" in the "Search Address" search box, wait for suggestions to appear, then click the first suggestion "New York, NY, USA". After that, scroll down and click the blue "Add" button at the bottom of the modal to save the address.', { page, maxCycles: 12 });
        await page.waitForTimeout(2000);

        // Handle mandatory custom field "Date & Time test *" if visible
        const dateTimeTestField = page.getByRole('textbox', { name: /Date & Time test/ });
        if (await dateTimeTestField.isVisible({ timeout: 3000 }).catch(() => false)) {
          await dateTimeTestField.scrollIntoViewIfNeeded();
          await dateTimeTestField.click();
          await page.waitForTimeout(500);
          await agent.act('In the date-time picker that just opened, select today\'s date and any available time, then close the picker', { page, maxCycles: 8 });
          await page.waitForTimeout(500);
        }

        // Scroll to top and click Create Job
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);

        // Click Create Job link in the header
        await page.locator('text=Create Job').first().click({ force: true });
        await page.waitForTimeout(1500);

        // Click the Create button in the confirmation dialog
        const createButton = page.locator('button:has-text("Create")');
        await createButton.waitFor({ state: 'visible', timeout: 10000 });
        await createButton.click();

        // Verify job created - wait for job details page
        await expect(page).toHaveURL(/\/jobs\/.*\/details/, { timeout: 30000 });

        // Verify the job title is visible on the details page
        await expect(page.getByText(jobName)).toBeVisible({ timeout: 10000 });
      });
    }
  });
});
