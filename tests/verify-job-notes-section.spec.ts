import { test, expect } from '@stablyai/playwright-test';
import { LoginPage } from './pages/LoginPage.js';
import { JobPage } from './pages/JobPage.js';

test.describe('Job Notes Section Verification', () => {
  /**
   * User Prompt:
   * - Login to the application(https://uat.zuperpro.com/) using valid company name,email and password.
   *   Company name:zuper email:jeevitha.k@zuper.co password:abcd1234
   * - Verify dashboard loads successfully.
   * - Navigate to Job module.
   * - Select any existing job from the list.
   * - Open the job details page.
   * - Navigate to the "Notes" section.
   * - Verify the Notes section is visible and loaded.
   */
  test('should login, navigate to a job, and verify the Notes section is visible', async ({ page }) => {
    // --- Step 1: Login ---
    const loginPage = new LoginPage(page);
    await loginPage.login(
      process.env.company_name!,
      process.env.user_name!,
      process.env.password!
    );

    // --- Step 2: Verify dashboard loads successfully ---
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });

    // --- Step 3: Dismiss any popups after login ---
    await loginPage.dismissOnboarding();

    // --- Step 4: Navigate to Job module ---
    const jobPage = new JobPage(page);
    await jobPage.navigateToJobs();
    await expect(page).toHaveURL(/\/jobs/, { timeout: 15000 });

    // --- Step 5: Select the first existing job from the list ---
    // Wait for the jobs table to be visible
    const jobsTable = page.locator('table').first().describe('Jobs list table');
    await jobsTable.waitFor({ state: 'visible', timeout: 30000 });

    // Click the first job's work order number link in the table
    const firstJobLink = page.locator('table tbody tr').first()
      .locator('a[href*="/jobs/"]').first()
      .describe('First job link in the list');
    await firstJobLink.waitFor({ state: 'visible', timeout: 15000 });
    await firstJobLink.click();

    // --- Step 6: Verify job details page opened ---
    await expect(page).toHaveURL(/\/jobs\/.*\/details/, { timeout: 30000 });

    // --- Step 7: Navigate to the Notes section ---
    const notesTab = page.getByRole('button', { name: 'Notes' }).describe('Notes tab button');
    await notesTab.waitFor({ state: 'visible', timeout: 15000 });
    await notesTab.click();

    // --- Step 8: Verify the Notes section is visible and loaded ---
    // Verify the note editor placeholder is visible
    const noteEditorButton = page.getByRole('button', { name: 'Enter your notes here...' }).describe('Note editor placeholder');
    await expect(noteEditorButton).toBeVisible({ timeout: 15000 });

    // Verify the "All Notes" section heading is visible
    const allNotesHeading = page.getByText('All Notes').describe('All Notes section header');
    await expect(allNotesHeading).toBeVisible({ timeout: 10000 });
  });
});
