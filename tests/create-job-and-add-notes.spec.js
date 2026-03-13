import { test, expect } from '@stablyai/playwright-test';
import { LoginPage } from './pages/LoginPage.js';

test.describe('Create Job and Add Notes', () => {
  /**
   * User Prompt:
   * - Create a new job and add a new notes
   *
   * Clarifications:
   * - Job fields: Mandatory fields only (Job Title, Job Category, Due Date, Organization)
   * - Note type: Simple text note
   */
  test('should create a new job and add a text note', async ({ page }) => {
    // Step 1: Login to staging environment
    const baseURL = process.env.staging_env;
    const loginPage = new LoginPage(page, baseURL);
    await loginPage.login(
      process.env.company_name,
      process.env.user_name,
      process.env.password
    );

    // Step 2: Dismiss timezone popup if it appears
    const cancelButton = page.getByRole('button', { name: 'Cancel' }).describe('Cancel timezone popup');
    await cancelButton.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }

    // Step 3: Navigate to Jobs module via sidebar
    const jobGroupIcon = page.locator('#job_group').describe('Jobs group sidebar icon');
    await jobGroupIcon.waitFor({ state: 'visible', timeout: 15000 });
    await jobGroupIcon.click();

    const jobsLink = page.getByRole('link', { name: 'Jobs', exact: true }).describe('Jobs link in sidebar');
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

    // 5a: Job Title - use timestamp for uniqueness
    const jobTitle = `Stably Test Job ${Date.now()}`;
    const jobTitleInput = page.getByRole('textbox', { name: 'Job Title *' }).describe('Job Title input');
    await jobTitleInput.waitFor({ state: 'visible', timeout: 10000 });
    await jobTitleInput.fill(jobTitle);

    // 5b: Job Category - select Installation
    const categoryDropdown = page.getByText('Choose a Job Category', { exact: true }).describe('Job Category dropdown');
    await categoryDropdown.scrollIntoViewIfNeeded();
    await categoryDropdown.click();

    const categoryOption = page.getByRole('option', { name: 'Installation' }).describe('Installation option');
    await categoryOption.waitFor({ state: 'visible', timeout: 10000 });
    await categoryOption.click();

    // 5c: Due Date - pick tomorrow's date
    const dueDateInput = page.getByRole('textbox', { name: 'Due Date' }).describe('Due Date input');
    await dueDateInput.scrollIntoViewIfNeeded();
    await dueDateInput.click();

    // Calculate tomorrow's date dynamically for the date picker
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const dueDateLabel = `${monthNames[tomorrow.getMonth()]} ${tomorrow.getDate()},`;

    const dateButton = page.getByRole('button', { name: dueDateLabel }).describe('Tomorrow date button');
    await dateButton.waitFor({ state: 'visible', timeout: 10000 });
    await dateButton.click();

    // 5d: Add Organization
    const addOrgLink = page.locator('a').filter({ hasText: /^Add Organization$/ }).describe('Add Organization link');
    await addOrgLink.scrollIntoViewIfNeeded();
    await addOrgLink.click();

    const orgRadio = page.getByRole('radio', { name: 'KT Organization' }).describe('KT Organization radio button');
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

    // Verify job title is visible on details page
    const jobTitleOnPage = page.locator('p').filter({ hasText: jobTitle }).first().describe('Job title on details page');
    await expect(jobTitleOnPage).toBeVisible({ timeout: 15000 });

    // Verify job category
    const jobCategory = page.getByRole('definition').filter({ hasText: 'Installation' }).describe('Job category definition');
    await expect(jobCategory).toBeVisible();

    // Verify organization
    const orgHeading = page.getByRole('heading', { name: 'KT Organization' }).describe('Organization name on job details');
    await expect(orgHeading).toBeVisible();

    // Step 8: Navigate to Notes tab
    const notesTab = page.getByRole('button', { name: 'Notes' }).describe('Notes tab');
    await notesTab.waitFor({ state: 'visible', timeout: 10000 });
    await notesTab.click();

    // Verify Notes section is visible with no notes initially
    await expect(page.getByText('No Notes Found')).toBeVisible({ timeout: 10000 });

    // Step 9: Add a new note
    const noteText = 'This is a test note added by Stably automation';
    const enterNoteButton = page.getByRole('button', { name: 'Enter your notes here...' }).describe('Enter note button');
    await enterNoteButton.waitFor({ state: 'visible', timeout: 10000 });
    await enterNoteButton.click();

    // Type the note text in the editor
    const noteEditor = page.locator('.ce-paragraph').describe('Note text editor');
    await noteEditor.waitFor({ state: 'visible', timeout: 10000 });
    await noteEditor.click();
    await noteEditor.fill(noteText);

    // Click Post Note button
    const postNoteButton = page.getByRole('button', { name: 'Post Note' }).describe('Post Note button');
    await postNoteButton.waitFor({ state: 'visible', timeout: 10000 });
    await postNoteButton.click();

    // Step 10: Verify note was added successfully
    // Verify the note text is visible in the notes list
    await expect(page.getByText(noteText)).toBeVisible({ timeout: 15000 });

    // Verify "No Notes Found" is no longer visible
    await expect(page.getByText('No Notes Found')).not.toBeVisible();
  });
});
