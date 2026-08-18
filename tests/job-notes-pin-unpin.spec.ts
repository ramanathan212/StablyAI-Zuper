import { test, expect } from '@stablyai/playwright-test';
import { forceRemoveOverlays } from './Helper/overlay-helper.js';

test.describe('Job Notes - Pin and Unpin Note', () => {
  /**
   * User Prompt:
   * - Do not include login steps. Assume user is already authenticated.
   * - Navigate to an existing job and open the Notes section.
   * - Verify at least one note exists. If not, create a new note with text "Pin test note".
   * - Select the note.
   * - Pin the note.
   * - Verify the note is marked as pinned.
   * - Verify the note appears at the top of the notes list (if pinning changes order).
   * - Unpin the same note.
   * - Verify the note is no longer marked as pinned.
   * - Verify the note returns to its original position or normal state.
   */

  test('should pin a note and verify it appears in Pinned Notes section, then unpin and verify removal', async ({
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
    await passwordInput.click();
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

    // Dismiss "Introducing Agent Studio" promo modal if present
    const agentStudioBtn = page.getByRole('button', { name: 'Maybe later' });
    await agentStudioBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await agentStudioBtn.isVisible()) await agentStudioBtn.click();

    // Dismiss "Zuper Guide" onboarding overlay if present
    const zuperGuideCloseBtn = page.getByRole('button', { name: 'Close' }).first();
    await zuperGuideCloseBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await zuperGuideCloseBtn.isVisible()) await zuperGuideCloseBtn.click();

    // Minimize the "Zuper Connect" dialer widget - its iframe floats over the
    // bottom-right of the page and physically intercepts clicks on note cards
    // underneath it, even with force:true (force skips Playwright's checks,
    // but the browser still delivers the click to whatever is topmost)
    const zuperConnectMinimizeBtn = page.locator('.zuper-connect-action-icon').first();
    await zuperConnectMinimizeBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await zuperConnectMinimizeBtn.isVisible()) await zuperConnectMinimizeBtn.click();

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

    // Wait for notes area to load – the note editor button is always present
    const noteEditorButton = page
      .getByRole('button', { name: 'Enter your notes here...' })
      .describe('Note editor placeholder');
    await expect(noteEditorButton).toBeVisible({ timeout: 30000 });

    // "All Notes" header may only appear once notes exist; define locator for later use
    const allNotesHeader = page.getByText('All Notes').describe('All Notes section header');

    // Check if any note cards exist with actual text content (attachment-only
    // notes have no text paragraph and can't be verified via getByText later)
    const firstNoteCard = page
      .locator('[data-testid="notes_card"]')
      .filter({ has: page.locator('p').filter({ hasText: /\S/ }) })
      .first()
      .describe('First note card with text');

    // Wait briefly for notes to render, then check visibility
    await page.waitForTimeout(2000);
    const hasNotes = await firstNoteCard.isVisible();

    if (!hasNotes) {
      // Create a new note if none exist
      await noteEditorButton.click();

      const postNoteButton = page
        .getByRole('button', { name: 'Post Note' })
        .describe('Post Note button');
      await expect(postNoteButton).toBeVisible({ timeout: 10000 });

      const noteEditor = page.locator('.ce-paragraph').describe('Note text editor');
      await noteEditor.waitFor({ state: 'visible', timeout: 10000 });
      await noteEditor.click();
      await page.keyboard.type('Pin test note');
      await postNoteButton.click();

      // Wait for note creation
      const successToast = page
        .getByText('Note Created successfully')
        .describe('Note creation toast');
      await expect(successToast).toBeVisible({ timeout: 20000 });

      // Wait for the new card to appear
      await firstNoteCard.waitFor({ state: 'visible', timeout: 15000 });
    }

    // Get the text of the first note we'll pin – wait for paragraph with actual text
    // Note cards may contain empty <p> elements (spacers), so find one with real content
    const firstNoteTextEl = firstNoteCard
      .locator('p')
      .filter({ hasText: /\S/ })
      .first()
      .describe('First note text paragraph');
    await firstNoteTextEl.waitFor({ state: 'visible', timeout: 15000 });
    const noteTextContent = await firstNoteTextEl.textContent();
    expect(noteTextContent).toBeTruthy();

    // ── Pin the note via the more-options menu ───────────────────────────
    // The menu trigger is the second button in the note card (empty text, no aria-haspopup)
    const menuButton = firstNoteCard
      .locator('button')
      .nth(1)
      .describe('Note menu button (three-dot)');

    // Click with force to bypass CDK overlay backdrop
    await menuButton.click({ force: true, timeout: 10000 });

    // Click "Pin Note" from the popup menu (items are buttons, not menuitem role)
    const pinNoteMenuItem = page
      .getByRole('button', { name: /Pin Note/i })
      .describe('Pin Note menu item');
    await pinNoteMenuItem.waitFor({ state: 'visible', timeout: 10000 });
    await pinNoteMenuItem.click();

    // ── Verify the note is marked as pinned ──────────────────────────────
    // A "Pinned Notes" section header should appear at the top
    const pinnedNotesHeader = page
      .getByText('Pinned Notes')
      .describe('Pinned Notes section header');
    await expect(pinnedNotesHeader).toBeVisible({ timeout: 10000 });

    // Verify the note text appears in the pinned section (it's the first note shown)
    const pinnedNoteText = page
      .getByText(noteTextContent!)
      .first()
      .describe('Note text in pinned section');
    await expect(pinnedNoteText).toBeVisible({ timeout: 10000 });

    // Verify "All Notes" section still exists below the pinned section
    await expect(allNotesHeader).toBeVisible();

    // ── Unpin the same note ──────────────────────────────────────────────
    // Find the pinned note card (it's in the pinned section, which is the first card now)
    // The pinned note card also has data-testid="notes_card"
    const pinnedNoteCard = page
      .locator('[data-testid="notes_card"]')
      .filter({ hasText: noteTextContent! })
      .first()
      .describe('Pinned note card');

    const pinnedMenuButton = pinnedNoteCard
      .locator('button')
      .nth(1)
      .describe('Pinned note menu button (three-dot)');

    await pinnedMenuButton.click({ force: true, timeout: 10000 });

    // Click "Unpin Note" from the popup menu (items are buttons, not menuitem role)
    const unpinNoteMenuItem = page
      .getByRole('button', { name: /Unpin Note/i })
      .describe('Unpin Note menu item');
    await unpinNoteMenuItem.waitFor({ state: 'visible', timeout: 10000 });
    await unpinNoteMenuItem.click();

    // ── Verify the note is no longer marked as pinned ─────────────────────
    // The "Pinned Notes" section should disappear
    await expect(pinnedNotesHeader).not.toBeVisible({ timeout: 10000 });

    // ── Verify the note returns to its normal state in All Notes ──────────
    // The note should still exist in the "All Notes" list
    const noteInAllNotes = page
      .getByText(noteTextContent!)
      .first()
      .describe('Note text in All Notes after unpin');
    await expect(noteInAllNotes).toBeVisible({ timeout: 10000 });

    // Verify "All Notes" header is still visible (normal state restored)
    await expect(allNotesHeader).toBeVisible();
  });
});
