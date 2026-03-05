import { test, expect } from '@stablyai/playwright-test';

test.describe('Create Job - QARaguStably', () => {
  /**
   * User Prompt:
   * - Log in 'https://stagingv3.zuperpro.com/"
   *   Company name: TestR
   *   username: ragupathy.s@zuper.co
   *   password: Test@1234
   *   after logged in cancel the pop ups in the Home Page
   *   Navigate to the Jobs module
   *   Create new job
   *   Fill all the mandetory fields
   *   Job Title - QARaguStably
   *
   * [Clarifications:]
   * - Mandatory field values: User recorded filling the form with Job Title "QARaguStably",
   *   Job Category "TestRCategory", Service Address "Namakkal, Tamil Nadu, India",
   *   Organization "Ava_Org", Due Date March 31
   */
  test('create a new job with mandatory fields', async ({ page }) => {
    test.setTimeout(180000);

    const baseURL = 'https://stagingv3.zuperpro.com';
    const jobTitle = 'QARaguStably';

    // Step 1: Login
    await test.step('Login to staging environment', async () => {
      await page.goto(`${baseURL}/login`);
      await page.getByRole('textbox', { name: 'Company Name' }).describe('Company name input').fill('TestR');
      await page.getByRole('button', { name: 'Continue' }).describe('Continue button').click();
      await page.getByRole('textbox', { name: 'Email address' }).describe('Email input').fill('ragupathy.s@zuper.co');
      await page.getByRole('textbox', { name: 'Password Forgot password?' }).describe('Password input').fill('Test@1234');
      await page.getByRole('button', { name: 'Login' }).describe('Login button').click();
      await page.waitForURL('**/dashboard**', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(3000);
    });

    // Step 2: Dismiss popups on home page
    await test.step('Dismiss popups on home page', async () => {
      for (let i = 0; i < 3; i++) {
        const cancelBtn = page.getByRole('button', { name: 'Cancel' });
        if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await cancelBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    });

    // Step 3: Navigate to Jobs module
    await test.step('Navigate to Jobs module', async () => {
      await page.goto(`${baseURL}/jobs`);
      await page.waitForURL('**/jobs**', { timeout: 15000 });
      await page.waitForTimeout(2000);
    });

    // Step 4: Click New Job
    await test.step('Click New Job', async () => {
      await page.getByRole('link', { name: /New Job/i }).describe('New Job button').click();
      await page.getByRole('textbox', { name: 'Job Title *' }).waitFor({ state: 'visible', timeout: 15000 });
    });

    // Step 5: Fill mandatory fields
    await test.step('Fill mandatory fields - Job Title and Job Category', async () => {
      // Dismiss sidebar overlay if visible
      const overlay = page.locator('.zuper-vertical-navigation-aside-overlay');
      if (await overlay.isVisible({ timeout: 2000 }).catch(() => false)) {
        await overlay.click();
        await page.waitForTimeout(500);
      }

      // Hide the Zuper Connect widget that intercepts pointer events
      await page.locator('#zuper-connect-frame').evaluate(el => el.style.display = 'none').catch(() => {});
      await page.locator('.cdk-overlay-container').evaluate(el => {
        const frames = el.querySelectorAll('iframe');
        frames.forEach(f => f.style.display = 'none');
      }).catch(() => {});

      // Fill Job Title
      await page.getByRole('textbox', { name: 'Job Title *' }).describe('Job title input').click();
      await page.getByRole('textbox', { name: 'Job Title *' }).fill(jobTitle);

      // Select Job Category - open the dropdown and select TestRCategory
      const jobCategoryDropdown = page.getByRole('combobox', { name: 'Choose a Job Category' }).describe('Job Category dropdown');
      await jobCategoryDropdown.scrollIntoViewIfNeeded();
      await jobCategoryDropdown.click();
      await page.getByText('TestRCategory', { exact: true }).describe('TestRCategory option').click();
      await page.waitForTimeout(500);
    });

    // Step 6: Add Service Address
    await test.step('Add Service Address', async () => {
      await page.locator('a').filter({ hasText: /^Add Service Address$/ }).describe('Add Service Address link').click();
      const searchBox = page.getByRole('searchbox', { name: 'Search Address' }).describe('Address search box');
      await searchBox.click();
      await searchBox.fill('Namakkal');
      await page.getByRole('button', { name: 'Namakkal, Tamil Nadu, India', exact: true }).describe('Namakkal address result').click();
      await page.getByRole('button', { name: 'Add' }).describe('Add address button').click();
      await page.waitForTimeout(1000);
    });

    // Step 7: Add Organization
    await test.step('Add Organization - Ava_Org', async () => {
      // Hide Zuper Connect widget again in case it reappeared
      await page.locator('#zuper-connect-frame').evaluate(el => el.style.display = 'none').catch(() => {});

      await page.locator('a').filter({ hasText: /^Add Organization$/ }).describe('Add Organization link').click({ force: true });
      await page.waitForTimeout(1000);
      await page.locator('a').filter({ hasText: 'Ava_Org ragupathy.s@zuper.co' }).describe('Ava_Org item').click({ force: true });
      await page.getByRole('radio', { name: 'Ava_Org' }).describe('Ava_Org radio button').click({ force: true });
      await page.getByRole('button', { name: 'Choose Organization' }).describe('Choose Organization button').click({ force: true });
      await page.waitForTimeout(1000);
    });

    // Step 8: Set Due Date
    await test.step('Set Due Date - March 31', async () => {
      await page.getByRole('textbox', { name: 'Due Date' }).describe('Due Date input').click();
      await page.getByRole('button', { name: 'March 31,' }).describe('March 31 date button').click();
      await page.waitForTimeout(500);
    });

    // Step 9: Create the Job
    await test.step('Create the Job', async () => {
      // Dismiss overlay if it appeared again
      const overlay = page.locator('.zuper-vertical-navigation-aside-overlay');
      if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
        await overlay.click();
        await page.waitForTimeout(500);
      }

      // Click Create Job button
      await page.locator('#undefined').filter({ hasText: 'Create Job' }).describe('Create Job button').click();
      await page.waitForTimeout(1000);

      // Confirm creation in dialog
      await page.getByRole('button', { name: 'Create' }).describe('Confirm Create button').click();

      // Wait for navigation to job details page
      await page.waitForURL('**/jobs/**/details**', { timeout: 30000 });
    });

    // Step 10: Verify job was created successfully
    await test.step('Verify job creation', async () => {
      await expect(page).toHaveURL(/\/jobs\/.*\/details/);
      // Verify job title is displayed on the details page
      await expect(page.getByText(jobTitle, { exact: true })).toBeVisible({ timeout: 10000 });

      // Verify job category
      await expect(page.getByRole('definition').filter({ hasText: 'TestRCategory' })).toBeVisible({ timeout: 10000 });

      // Verify organization
      await expect(page.getByRole('link', { name: 'Ava_Org' })).toBeVisible({ timeout: 10000 });
    });
  });
});
