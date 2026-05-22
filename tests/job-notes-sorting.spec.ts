import { test, expect } from '@stablyai/playwright-test';
import { forceRemoveOverlays } from './Helper/overlay-helper.js';

test.describe('Job Notes - Sorting', () => {
  /**
   * User Prompt:
   * - Navigate to Notes section inside a job.
   * - Apply sorting (e.g., newest first).
   * - Verify notes are sorted in descending order of creation time.
   * - Apply sorting (e.g., oldest first).
   * - Verify notes are sorted in ascending order.
   */

  test('should sort notes by newest first (descending) and oldest first (ascending)', async ({
    page,
  }) => {
    // ── Authentication ───────────────────────────────────────────────────
    await page.goto('/login');
    const companyInput = page
      .getByRole('textbox', { name: 'Company Name' })
      .describe('Company name input');
    await companyInput.waitFor({ state: 'visible', timeout: 30000 });
    await companyInput.fill(process.env.companyName!);

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Continue'
      );
      if (btn) btn.click();
    });

    const emailInput = page
      .getByRole('textbox', { name: 'Email address' })
      .describe('Email input');
    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await emailInput.fill(process.env.email!);

    const passwordInput = page
      .getByRole('textbox', { name: 'Password Forgot password?' })
      .describe('Password input');
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.fill(process.env.password!);

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Login'
      );
      if (btn) btn.click();
    });

    await page.waitForURL('**/dashboard', { timeout: 45000 });

    // Dismiss timezone popup if present
    const tzCancelBtn = page.getByRole('button', { name: 'Cancel' });
    await tzCancelBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await tzCancelBtn.isVisible()) await tzCancelBtn.click();

    // Dismiss notification popup if present
    const notifBtn = page.getByRole('button', { name: 'No, thanks' });
    await notifBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await notifBtn.isVisible()) await notifBtn.click();

    // ── Navigate to an existing job ──────────────────────────────────────
    await page.goto('/jobs');
    await forceRemoveOverlays(page);

    const jobTable = page.locator('table').first().describe('Jobs list table');
    await jobTable.waitFor({ state: 'visible', timeout: 30000 });

    const firstJobLink = page
      .locator('table tbody tr')
      .first()
      .locator('a')
      .first()
      .describe('First job link');
    await firstJobLink.waitFor({ state: 'visible', timeout: 15000 });
    const jobHref = await firstJobLink.getAttribute('href');
    await page.goto(jobHref!);

    await expect(page).toHaveURL(/\/jobs\/.*\/details/, { timeout: 30000 });
    await forceRemoveOverlays(page);

    // ── Open the Notes section ───────────────────────────────────────────
    const notesTab = page
      .getByRole('button', { name: /^Notes/ })
      .first()
      .describe('Notes tab button');
    await notesTab.waitFor({ state: 'visible', timeout: 30000 });
    await notesTab.click();

    // Wait for notes area to load
    const allNotesHeader = page.getByText('All Notes').describe('All Notes section header');
    await expect(allNotesHeader).toBeVisible({ timeout: 15000 });

    // Ensure there are at least 2 notes to test sorting - create if needed
    const timestampLocator = page.locator('[data-testid="notes_timestamp"]');
    await timestampLocator.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    let noteCount = await timestampLocator.count();

    // If fewer than 2 notes exist, create notes until we have at least 2
    while (noteCount < 2) {
      const noteEditorButton = page
        .getByRole('button', { name: 'Enter your notes here...' })
        .describe('Note editor placeholder');
      await noteEditorButton.waitFor({ state: 'visible', timeout: 15000 });
      await noteEditorButton.click();

      const postNoteButton = page
        .getByRole('button', { name: 'Post Note' })
        .describe('Post Note button');
      await expect(postNoteButton).toBeVisible({ timeout: 10000 });

      const noteEditor = page.locator('.ce-paragraph').describe('Note text editor');
      await noteEditor.waitFor({ state: 'visible', timeout: 10000 });
      await noteEditor.click();
      await page.keyboard.type(`Sorting test note ${Date.now()}`);
      await postNoteButton.click();

      // Wait for note creation success
      const successToast = page
        .getByText('Note Created successfully')
        .describe('Note creation toast');
      await expect(successToast).toBeVisible({ timeout: 20000 });

      // Wait for the toast to disappear and new note to render
      await page.waitForTimeout(2000);

      // Re-count notes
      noteCount = await timestampLocator.count();
    }

    expect(noteCount, 'Need at least 2 notes to verify sorting').toBeGreaterThanOrEqual(2);

    // ── Helper: parse timestamps and verify sort order ────────────────────
    async function getTimestamps(): Promise<Date[]> {
      const count = await timestampLocator.count();
      const dates: Date[] = [];
      for (let i = 0; i < count; i++) {
        const title = await timestampLocator.nth(i).getAttribute('title');
        if (title) {
          dates.push(new Date(title));
        }
      }
      return dates;
    }

    function isDescending(dates: Date[]): boolean {
      for (let i = 1; i < dates.length; i++) {
        if (dates[i].getTime() > dates[i - 1].getTime()) {
          return false;
        }
      }
      return true;
    }

    function isAscending(dates: Date[]): boolean {
      for (let i = 1; i < dates.length; i++) {
        if (dates[i].getTime() < dates[i - 1].getTime()) {
          return false;
        }
      }
      return true;
    }

    // ── Apply sorting: Newest first ──────────────────────────────────────
    const sortToggle = page
      .getByTestId('notes_sort-toggle')
      .describe('Sort toggle button');
    await expect(sortToggle).toBeVisible({ timeout: 10000 });

    // Click the sort toggle to open the dropdown
    await sortToggle.click({ force: true });

    // Select "Newest" from the dropdown overlay
    const sortOverlay = page.getByTestId('notes_sort-overlay').describe('Sort options overlay');
    const newestOption = sortOverlay.getByText('Newest', { exact: true }).describe('Newest sort option');
    await newestOption.waitFor({ state: 'visible', timeout: 10000 });
    await newestOption.click();

    // Wait for the list to re-render
    await page.waitForTimeout(1000);

    // ── Verify notes are sorted in descending order (newest first) ───────
    const newestTimestamps = await getTimestamps();
    expect(
      newestTimestamps.length,
      'Should have timestamps after sorting by newest'
    ).toBeGreaterThanOrEqual(2);
    expect(
      isDescending(newestTimestamps),
      `Notes should be sorted newest first (descending). Got: ${newestTimestamps.map(d => d.toLocaleString())}`
    ).toBeTruthy();

    // Verify the sort button label shows "Newest"
    await expect(sortToggle).toContainText('Newest');

    // ── Apply sorting: Oldest first ──────────────────────────────────────
    await sortToggle.click({ force: true });

    // Select "Oldest" from the dropdown overlay
    const oldestOption = sortOverlay.getByText('Oldest', { exact: true }).describe('Oldest sort option');
    await oldestOption.waitFor({ state: 'visible', timeout: 10000 });
    await oldestOption.click();

    // Wait for the list to re-render
    await page.waitForTimeout(1000);

    // ── Verify notes are sorted in ascending order (oldest first) ────────
    const oldestTimestamps = await getTimestamps();
    expect(
      oldestTimestamps.length,
      'Should have timestamps after sorting by oldest'
    ).toBeGreaterThanOrEqual(2);
    expect(
      isAscending(oldestTimestamps),
      `Notes should be sorted oldest first (ascending). Got: ${oldestTimestamps.map(d => d.toLocaleString())}`
    ).toBeTruthy();

    // Verify the sort button label shows "Oldest"
    await expect(sortToggle).toContainText('Oldest');
  });
});
