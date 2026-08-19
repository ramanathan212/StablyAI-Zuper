import { test, expect } from '@stablyai/playwright-test';
import { LoginPage } from './pages/LoginPage.js';
import { testData } from './test-data.js';

test.describe('Job Notes Section Verification', () => {
  /**
   * User Prompt:
   * - Login to the application using valid username and password.
   * - Verify dashboard loads successfully.
   * - Navigate to Job module.
   * - Select any existing job from the list.
   * - Open the job details page.
   * - Navigate to the "Notes" section.
   * - Verify the Notes section is visible and loaded.
   */
  test('should navigate to an existing job and verify the Notes section is visible', async ({
    page,
  }) => {
    // ── Step 1: Login ──────────────────────────────────────────────────
    const loginPage = new LoginPage(page);
    await loginPage.login(
      testData.login.companyName,
      testData.login.email,
      testData.login.password
    );

    // ── Step 2: Verify dashboard loads successfully ────────────────────
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });

    // Dismiss timezone popup if present
    const cancelButton = page
      .getByRole('button', { name: 'Cancel' })
      .describe('Cancel timezone popup');
    await cancelButton
      .waitFor({ state: 'visible', timeout: 5000 })
      .catch(() => {});
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }

    // Dismiss notification permission dialog if present
    const noThanksButton = page
      .getByRole('button', { name: 'No, thanks' })
      .describe('Notification popup dismiss');
    await noThanksButton
      .waitFor({ state: 'visible', timeout: 5000 })
      .catch(() => {});
    if (await noThanksButton.isVisible()) {
      await noThanksButton.click();
    }

    // Dismiss "Introducing Agent Studio" promo modal if present
    const agentStudioButton = page
      .getByRole('button', { name: 'Maybe later' })
      .describe('Dismiss Agent Studio promo');
    await agentStudioButton
      .waitFor({ state: 'visible', timeout: 5000 })
      .catch(() => {});
    if (await agentStudioButton.isVisible()) {
      await agentStudioButton.click();
    }

    // Dismiss "Zuper Guide" onboarding overlay if present
    const zuperGuideCloseButton = page
      .getByRole('button', { name: 'Close' })
      .first()
      .describe('Dismiss Zuper Guide overlay');
    await zuperGuideCloseButton
      .waitFor({ state: 'visible', timeout: 5000 })
      .catch(() => {});
    if (await zuperGuideCloseButton.isVisible()) {
      await zuperGuideCloseButton.click();
    }

    // ── Step 3: Navigate to Job module ─────────────────────────────────
    const jobGroupIcon = page
      .locator('#job_group')
      .describe('Jobs group sidebar icon');
    await jobGroupIcon.waitFor({ state: 'visible', timeout: 15000 });
    await jobGroupIcon.click();

    const jobsLink = page
      .getByRole('link', { name: 'Jobs', exact: true })
      .describe('Jobs link in sidebar');
    await jobsLink.waitFor({ state: 'visible', timeout: 10000 });
    await jobsLink.click();

    await expect(page).toHaveURL(/\/jobs/, { timeout: 15000 });

    // ── Step 4: Select the first existing job from the list ────────────
    // Wait for the job list table to load
    const jobTable = page.locator('table').first().describe('Jobs list table');
    await jobTable.waitFor({ state: 'visible', timeout: 20000 });

    // Click the first job link in the table body (Work Order Number column)
    const firstJobLink = page
      .locator('table tbody tr')
      .first()
      .locator('a')
      .first()
      .describe('First job link in the list');
    await firstJobLink.waitFor({ state: 'visible', timeout: 15000 });
    await firstJobLink.click();

    // ── Step 5: Verify job details page loaded ─────────────────────────
    await expect(page).toHaveURL(/\/jobs\/.*\/details/, { timeout: 30000 });

    // ── Step 6: Navigate to the Notes section ──────────────────────────
    // The Notes tab text includes a count badge (e.g. "Notes 2"), use exact: false
    // and .first() to avoid matching "Enter your notes here..." button
    const notesTab = page
      .getByRole('button', { name: 'Notes' })
      .first()
      .describe('Notes tab button');
    await notesTab.waitFor({ state: 'visible', timeout: 15000 });
    await notesTab.click();

    // ── Step 7: Verify the Notes section is visible and loaded ─────────
    // Verify the note editor placeholder is visible (notes section loaded)
    const noteEditorButton = page
      .getByRole('button', { name: 'Enter your notes here...' })
      .describe('Note editor placeholder button');
    await expect(noteEditorButton).toBeVisible({ timeout: 15000 });

    // Verify the Notes section content is visible (either "All Notes" header or "No Notes Found" state)
    const allNotesHeader = page
      .getByText('All Notes')
      .describe('All Notes section header');
    const noNotesFound = page
      .getByRole('heading', { name: 'No Notes Found' })
      .describe('No Notes Found heading');
    const notesContentVisible = await Promise.race([
      allNotesHeader.waitFor({ state: 'visible', timeout: 10000 }).then(() => true),
      noNotesFound.waitFor({ state: 'visible', timeout: 10000 }).then(() => true),
    ]);
    expect(notesContentVisible).toBeTruthy();
  });
});
