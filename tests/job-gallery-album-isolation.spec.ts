import { test, expect } from '@stablyai/playwright-test';
import {
  loginAndDismissPopups,
  createNewJob,
  navigateToJobGalleryAlbums,
  getJobAlbumNames,
  addAlbumToJob,
  renameAlbumOnJob,
  deleteAlbumOnJob,
  getSettingsAlbumNames,
  addMasterAlbum,
  deleteMasterAlbum,
  dismissBeamerModal,
} from './helpers/gallery.helper.js';
import { forceRemoveOverlays } from './Helper/overlay-helper.js';

test.describe('Job Gallery Album Isolation', () => {
  /**
   * User Prompt:
   * - Create a NEW test case. Do not include login steps. Assume user is already authenticated.
   * - Navigate to an existing job and open the Gallery section.
   * - Edit the albums at the job level (add/edit/delete an album).
   * - Verify the changes are applied only to that job.
   * - Create a new job.
   * - Navigate to the Gallery section of the new job.
   * - Verify that the job-level changes from the previous job are NOT reflected.
   * - Navigate to Gallery Settings.
   * - Update the master album configuration.
   * - Create another new job.
   * - Navigate to the Gallery section.
   * - Verify the new job reflects the updated master album configuration.
   * - Navigate back to the previously modified job.
   * - Verify that its job-level album changes remain unchanged and are NOT overridden by the master update.
   */
  test('should isolate job-level album changes and propagate master settings only to new jobs', async ({
    page,
  }) => {
    test.setTimeout(480000); // 8 minutes for this comprehensive multi-job flow

    const ts = Date.now();

    // ── Authentication ─────────────────────────────────────────────────
    await loginAndDismissPopups(page);

    // ── Step 1: Read baseline default album names from Gallery Settings ─
    const baselineSettingsAlbums = await getSettingsAlbumNames(page);
    expect(
      baselineSettingsAlbums.length,
      'Gallery Settings should have at least 2 default albums'
    ).toBeGreaterThanOrEqual(2);
    console.log('Baseline settings albums:', baselineSettingsAlbums);

    // ── Step 2: Navigate to an existing job (Job A) ─────────────────────
    await page.goto('/jobs');
    await forceRemoveOverlays(page);
    await dismissBeamerModal(page);

    const jobTable = page
      .locator('table')
      .first()
      .describe('Jobs list table');
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
    await dismissBeamerModal(page);

    const jobAUrl = page.url();
    console.log('Job A URL:', jobAUrl);

    // ── Step 3: Open Gallery > Albums on Job A ──────────────────────────
    await navigateToJobGalleryAlbums(page);

    const initialJobAAlbums = await getJobAlbumNames(page);
    console.log('Job A initial albums:', initialJobAAlbums);
    expect(
      initialJobAAlbums.length,
      'Job A should have at least 2 albums to rename/delete'
    ).toBeGreaterThanOrEqual(2);

    // ── Step 4: Add a new album at job level ────────────────────────────
    const addedAlbumName = `Added Album ${ts}`;
    await addAlbumToJob(page, addedAlbumName);

    // Verify added album visible in list
    await expect(
      page
        .locator('p', { hasText: addedAlbumName })
        .describe('Added album in Job A')
    ).toBeVisible({ timeout: 10000 });

    // ── Step 5: Rename an existing album at job level ───────────────────
    const albumToRename = initialJobAAlbums[0];
    const renamedAlbumName = `Renamed ${ts}`;
    await renameAlbumOnJob(page, albumToRename, renamedAlbumName);

    // Verify renamed album visible, old name gone
    await expect(
      page
        .locator('p', { hasText: renamedAlbumName })
        .describe('Renamed album in Job A')
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator('p', { hasText: albumToRename })
    ).toBeHidden({ timeout: 10000 });

    // ── Step 6: Delete another existing album at job level ──────────────
    const albumToDelete = initialJobAAlbums[1];
    await deleteAlbumOnJob(page, albumToDelete);

    // Verify deleted album gone
    await expect(
      page.locator('p', { hasText: albumToDelete })
    ).toBeHidden({ timeout: 10000 });

    // Record Job A's final album state
    const jobAFinalAlbums = await getJobAlbumNames(page);
    console.log('Job A final albums after edits:', jobAFinalAlbums);

    // Verify the 3 changes are reflected
    expect(jobAFinalAlbums).toContain(addedAlbumName);
    expect(jobAFinalAlbums).toContain(renamedAlbumName);
    expect(jobAFinalAlbums).not.toContain(albumToRename);
    expect(jobAFinalAlbums).not.toContain(albumToDelete);

    // ── Step 7: Create Job B and verify it has defaults (not Job A's changes) ─
    const jobBTitle = `Job B Album Isolation ${ts}`;
    const jobBUrl = await createNewJob(page, jobBTitle);
    console.log('Job B URL:', jobBUrl);

    await navigateToJobGalleryAlbums(page);

    const jobBAlbums = await getJobAlbumNames(page);
    console.log('Job B albums:', jobBAlbums);

    // Job B should have the baseline settings albums (not Job A's modifications)
    expect(
      jobBAlbums.length,
      'Job B should have the same count as baseline settings'
    ).toBe(baselineSettingsAlbums.length);

    for (const settingsAlbum of baselineSettingsAlbums) {
      expect(
        jobBAlbums,
        `Job B should have default album "${settingsAlbum}"`
      ).toContain(settingsAlbum);
    }

    // Job B should NOT have Job A's added/renamed albums
    expect(
      jobBAlbums,
      'Job B should NOT contain Job A\'s added album'
    ).not.toContain(addedAlbumName);
    expect(
      jobBAlbums,
      'Job B should NOT contain Job A\'s renamed album'
    ).not.toContain(renamedAlbumName);

    // Job B should still have the album that was deleted from Job A
    expect(
      jobBAlbums,
      `Job B should still have "${albumToDelete}" which was deleted from Job A`
    ).toContain(albumToDelete);

    // ── Step 8: Navigate to Gallery Settings and add a new master album ─
    const masterAlbumName = `Master New ${ts}`;
    // Read the current settings to compare later
    await page.goto('/settings_new/job/gallery');
    await page
      .getByRole('heading', { name: 'Albums' })
      .describe('Albums heading')
      .waitFor({ state: 'visible', timeout: 30000 });

    // Wait for table rows to load
    await page.waitForFunction(
      () => {
        const datePattern = /^[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}$/;
        const allDivs = document.querySelectorAll('div');
        for (const div of allDivs) {
          if (datePattern.test((div.textContent || '').trim())) return true;
        }
        return false;
      },
      null,
      { timeout: 15000 }
    );

    await addMasterAlbum(page, masterAlbumName);

    // Verify the master album was added by re-reading settings
    const updatedSettingsAlbums = await getSettingsAlbumNames(page);
    console.log('Updated settings albums:', updatedSettingsAlbums);
    expect(
      updatedSettingsAlbums,
      `Master album "${masterAlbumName}" should now appear in settings`
    ).toContain(masterAlbumName);

    // ── Step 9: Create Job C and verify it has the updated master config ─
    const jobCTitle = `Job C Master Update ${ts}`;
    const jobCUrl = await createNewJob(page, jobCTitle);
    console.log('Job C URL:', jobCUrl);

    await navigateToJobGalleryAlbums(page);

    const jobCAlbums = await getJobAlbumNames(page);
    console.log('Job C albums:', jobCAlbums);

    // Job C should have all updated settings albums including the new master album
    expect(
      jobCAlbums.length,
      'Job C should have the updated settings album count'
    ).toBe(updatedSettingsAlbums.length);

    expect(
      jobCAlbums,
      `Job C should contain the new master album "${masterAlbumName}"`
    ).toContain(masterAlbumName);

    for (const settingsAlbum of updatedSettingsAlbums) {
      expect(
        jobCAlbums,
        `Job C should have updated default album "${settingsAlbum}"`
      ).toContain(settingsAlbum);
    }

    // ── Step 10: Navigate back to Job A and verify changes are intact ───
    await page.goto(jobAUrl);
    await expect(page).toHaveURL(/\/jobs\/.*\/details/, { timeout: 30000 });
    await forceRemoveOverlays(page);
    await dismissBeamerModal(page);

    await navigateToJobGalleryAlbums(page);

    const jobAAlbumsAfterMasterUpdate = await getJobAlbumNames(page);
    console.log(
      'Job A albums after master update:',
      jobAAlbumsAfterMasterUpdate
    );

    // Job A's custom changes should be intact
    expect(
      jobAAlbumsAfterMasterUpdate,
      'Job A should still have the added album'
    ).toContain(addedAlbumName);
    expect(
      jobAAlbumsAfterMasterUpdate,
      'Job A should still have the renamed album'
    ).toContain(renamedAlbumName);
    expect(
      jobAAlbumsAfterMasterUpdate,
      'Job A should still NOT have the original name of the renamed album'
    ).not.toContain(albumToRename);
    expect(
      jobAAlbumsAfterMasterUpdate,
      'Job A should still NOT have the deleted album'
    ).not.toContain(albumToDelete);

    // Job A should NOT have been affected by the new master album
    // (existing jobs are not retroactively updated)
    expect(
      jobAAlbumsAfterMasterUpdate,
      `Job A should NOT have the new master album "${masterAlbumName}"`
    ).not.toContain(masterAlbumName);

    // ── Cleanup: Remove the master album from settings ──────────────────
    await page.goto('/settings_new/job/gallery');
    await page
      .getByRole('heading', { name: 'Albums' })
      .waitFor({ state: 'visible', timeout: 30000 });

    await page.waitForFunction(
      () => {
        const datePattern = /^[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}$/;
        const allDivs = document.querySelectorAll('div');
        for (const div of allDivs) {
          if (datePattern.test((div.textContent || '').trim())) return true;
        }
        return false;
      },
      null,
      { timeout: 15000 }
    );

    await deleteMasterAlbum(page, masterAlbumName);
    console.log(`Cleaned up master album "${masterAlbumName}"`);
  });
});
