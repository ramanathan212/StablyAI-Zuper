import { test, expect } from '@stablyai/playwright-test';

test.describe('Jobs Module - Bulk Update Fields', () => {
  /**
   * User Prompt:
   * - Launch -> https://uat.zuperpro.com/login
   * - company name : zuper-pro
   * - username : ragupathy.s@zuper.co
   * - password : Test@1234
   * - After logged in cancel the pop ups in the Dashboard page
   * - Go to the Jobs module Click on the select all checkbox
   * - Click on the UpdateField button
   * - Select the field and provide the value
   * - Click on the update button
   * - Again click on the select all checkbox
   * - Click on the UpdateField button
   * - Select the field and provide the value
   * - Click on the update button.
   * - This will do untill all the fields from "update fields" list update
   * - Note: Update below mentioned fields
   * - Field name : Job Priotity , Value : Low
   * - Job Description , Value: QA Description
   */
  test('should bulk update Job Priority and Job Description for all jobs', async ({ page }) => {
    // Increase timeout for this long flow
    test.setTimeout(180000);

    // Step 1: Navigate to login page
    await page.goto('https://uat.zuperpro.com/login');

    // Step 2: Enter company name
    const companyNameInput = page.getByRole('textbox', { name: 'Company Name' });
    await companyNameInput.waitFor({ state: 'visible' });
    await companyNameInput.fill('zuper-pro');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 3: Enter email and password
    const emailInput = page.getByRole('textbox', { name: 'Email address' });
    await emailInput.waitFor({ state: 'visible' });
    await emailInput.fill('ragupathy.s@zuper.co');
    await page.getByRole('textbox', { name: 'Password Forgot password?' }).fill('Test@1234');
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    // Step 4: Wait for Dashboard to load
    await page.waitForURL('**/dashboard', { timeout: 60000 });
    await expect(page).toHaveTitle(/Dashboard/);

    // Step 5: Dismiss popups on the Dashboard
    // Handle timezone popup
    const cancelTimezoneBtn = page.getByRole('button', { name: 'Cancel' });
    try {
      await cancelTimezoneBtn.waitFor({ state: 'visible', timeout: 10000 });
      await cancelTimezoneBtn.click();
    } catch {
      // Timezone popup may not always appear
    }

    // Handle notifications popup
    const noThanksBtn = page.getByRole('button', { name: 'No, thanks' });
    try {
      await noThanksBtn.waitFor({ state: 'visible', timeout: 5000 });
      await noThanksBtn.click();
    } catch {
      // Notifications popup may not always appear
    }

    // Handle release notes popup (Beamer announcement bar close button)
    const releaseNotesClose = page.locator('.beamerAnnouncementBarClose > svg');
    try {
      await releaseNotesClose.waitFor({ state: 'visible', timeout: 5000 });
      await releaseNotesClose.click();
    } catch {
      // Release notes popup may not always appear
    }

    // Step 6: Navigate to Jobs module
    await page.goto('https://uat.zuperpro.com/jobs');
    await page.waitForURL('**/jobs');
    await expect(page).toHaveTitle(/Jobs/);

    // Wait for the jobs table to load
    const selectAllCheckbox = page.getByRole('checkbox', { name: 'Select all' });
    await selectAllCheckbox.waitFor({ state: 'visible', timeout: 30000 });

    // ===== UPDATE 1: Job Priority -> Low =====

    // Step 7: Click Select All checkbox
    await selectAllCheckbox.click();

    // Step 8: Click Update Field button
    const updateFieldBtn = page.getByRole('button', { name: 'Update Field' });
    await updateFieldBtn.waitFor({ state: 'visible' });
    await updateFieldBtn.click();

    // Step 9: Wait for the Update Field modal and select "Job Priority"
    const updateFieldHeading = page.getByRole('heading', { name: 'Update Field', level: 6 });
    await updateFieldHeading.waitFor({ state: 'visible', timeout: 15000 });

    // The field dropdown should already be expanded; select Job Priority
    const jobPriorityOption = page.getByRole('button', { name: 'Job Priority', exact: true });
    await jobPriorityOption.waitFor({ state: 'visible', timeout: 10000 });
    await jobPriorityOption.click();

    // Step 10: Select "Low" as the value
    const lowOption = page.getByRole('button', { name: 'Low', exact: true });
    await lowOption.waitFor({ state: 'visible', timeout: 10000 });
    await lowOption.click();

    // Step 11: Click the Update button in the modal
    const updateBtn = page.getByRole('button', { name: 'Update', exact: true });
    await updateBtn.click();

    // Step 12: Verify success message for Job Priority update
    const successMsg1 = page.getByText('Field updated in Jobs successfully');
    await expect(successMsg1).toBeVisible({ timeout: 30000 });

    // Wait for the success message to disappear before proceeding
    await successMsg1.waitFor({ state: 'hidden', timeout: 15000 });

    // ===== UPDATE 2: Job Description -> QA Description =====

    // Step 13: Click Select All checkbox again
    const selectAllCheckbox2 = page.getByRole('checkbox', { name: 'Select all' });
    await selectAllCheckbox2.waitFor({ state: 'visible', timeout: 15000 });
    await selectAllCheckbox2.click();

    // Step 14: Click Update Field button again
    const updateFieldBtn2 = page.getByRole('button', { name: 'Update Field' });
    await updateFieldBtn2.waitFor({ state: 'visible' });
    await updateFieldBtn2.click();

    // Step 15: Wait for the Update Field modal and select "Job Description"
    const updateFieldHeading2 = page.getByRole('heading', { name: 'Update Field', level: 6 });
    await updateFieldHeading2.waitFor({ state: 'visible', timeout: 15000 });

    const jobDescOption = page.getByRole('button', { name: 'Job Description', exact: true });
    await jobDescOption.waitFor({ state: 'visible', timeout: 10000 });
    await jobDescOption.click();

    // Step 16: Type "QA Description" in the Rich Text Editor
    const richTextFrame = page.locator('iframe[title="Rich Text Area"]').contentFrame();
    const richTextBody = richTextFrame.getByRole('paragraph');
    await richTextBody.waitFor({ state: 'visible', timeout: 10000 });
    await richTextBody.click();
    await page.keyboard.type('QA Description');

    // Step 17: Click the Update button in the modal
    const updateBtn2 = page.getByRole('button', { name: 'Update', exact: true });
    await updateBtn2.click();

    // Step 18: Verify success message for Job Description update
    const successMsg2 = page.getByText('Field updated in Jobs successfully');
    await expect(successMsg2).toBeVisible({ timeout: 30000 });
  });
});
