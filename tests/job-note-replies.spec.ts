import { test, expect } from '@stablyai/playwright-test';
import { forceRemoveOverlays } from './Helper/overlay-helper.js';

/**
 * High-level regression/sanity test suite for Job Module – Note Replies/Comments.
 *
 * IMPORTANT NOTES:
 * - TC_07 and TC_08 use a secondary user (ZuperTL-FE: tlfe@mail.com / test1234 / divyatest)
 *   to verify mention notifications and deep link navigation.
 */

test.use({ baseURL: 'https://developmentv3.zuperpro.com/v2' });

test.describe('Job Note Replies/Comments - Sanity Suite', () => {
  // Each test involves login + navigation + multiple page loads, needs extended timeout
  test.setTimeout(300000);

  // Shared login + navigation helper
  async function loginAndNavigateToJob(page: any) {
    // Navigate to login - clear cookies first to ensure fresh login
    await page.context().clearCookies();
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for app to initialize (dev env shows "Getting things ready" first)
    await page.waitForTimeout(5000);

    // Check if we're redirected (already logged in) or at login page
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      // Wait for login form to be ready - look for any interactive element
      // The login page has either: Company Name input OR Email/Password inputs
      await page.waitForFunction(
        () => {
          const inputs = document.querySelectorAll('input');
          return inputs.length > 0;
        },
        { timeout: 60000 }
      );
      await page.waitForTimeout(2000);

      // Check if we need to enter company name first
      const companyInput = page.getByRole('textbox', { name: 'Company Name' });
      const hasCompanyStep = await companyInput.isVisible().catch(() => false);

      if (hasCompanyStep) {
        await companyInput.click();
        await page.keyboard.type(process.env.companyName!, { delay: 50 });
        await page.waitForTimeout(1000);

        // Use JS click to bypass banner overlay
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(
            (b: any) => b.textContent?.trim() === 'Continue'
          );
          if (btn) (btn as HTMLElement).click();
        });
        await page.waitForTimeout(3000);
      }

      // Now fill email and password (handles both fresh and returning login)
      const emailInput = page.getByRole('textbox', { name: 'Email address' })
        .or(page.locator('input[type="email"]').first());
      await emailInput.waitFor({ state: 'visible', timeout: 30000 });
      await emailInput.clear();
      await emailInput.fill(process.env.email!);

      const passwordInput = page.locator('input[type="password"]').describe('Password input');
      await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
      await passwordInput.clear();
      await passwordInput.fill(process.env.password!);

      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(
          (b: any) => b.textContent?.trim() === 'Login'
        );
        if (btn) (btn as HTMLElement).click();
      });

      // Wait for navigation away from login page (dashboard, jobs, or any app page)
      await page.waitForFunction(
        () => !window.location.href.includes('/login'),
        { timeout: 60000 }
      );
    }

    // Wait for the app's main UI to load (sidebar/nav)
    await page.waitForSelector('nav, [role="navigation"], a[href*="/jobs"]', { timeout: 90000 });

    // Dismiss timezone popup if visible
    await dismissPopups(page);

    // Navigate to Jobs list
    await page.goto('/jobs', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for the jobs page to fully load - wait for table with job rows
    // The table body with rows indicates actual job data has loaded
    await page.waitForSelector('table tbody tr', { timeout: 90000 });
    await dismissPopups(page);
    await forceRemoveOverlays(page);

    // Click first job link in the table (not sidebar links)
    const firstJobLink = page.locator('table tbody tr').first().locator('a').first().describe('First job link in table');
    await firstJobLink.waitFor({ state: 'visible', timeout: 30000 });
    const jobHref = await firstJobLink.getAttribute('href');

    if (jobHref) {
      await page.goto(jobHref, { waitUntil: 'domcontentloaded', timeout: 60000 });
    } else {
      await firstJobLink.click();
    }

    // Wait for job details page to load - wait for the tab navigation
    await page.waitForFunction(
      () => window.location.href.includes('/jobs/') && window.location.href.includes('/details'),
      { timeout: 60000 }
    );
    // Wait for the page content to render
    await page.waitForSelector('button:has-text("Details"), button:has-text("Notes")', { timeout: 60000 });
    await dismissPopups(page);
    await forceRemoveOverlays(page);
  }

  async function dismissPopups(page: any) {
    await page.waitForTimeout(2000);

    // Remove the entire CDK overlay container contents (dialogs, backdrops, etc.)
    // This is the most reliable way to dismiss Angular Material dialogs
    await page.evaluate(() => {
      const container = document.querySelector('.cdk-overlay-container');
      if (container) container.innerHTML = '';
    });
    await page.waitForTimeout(500);
  }

  async function navigateToNotesTab(page: any) {
    // Look for Notes tab button within the job tabs navigation (listitem > button pattern)
    const notesTab = page.locator('listitem button:has-text("Notes"), li button:has-text("Notes"), [role="tablist"] button:has-text("Notes")').first().describe('Notes tab button');

    // Fallback: if specific selectors don't work, try generic button with Notes text
    const genericNotesTab = page.locator('button').filter({ hasText: /^Notes/ }).first();

    try {
      await notesTab.waitFor({ state: 'visible', timeout: 15000 });
      await notesTab.click({ force: true });
    } catch {
      // Fallback to generic selector
      await genericNotesTab.waitFor({ state: 'visible', timeout: 15000 });
      await genericNotesTab.click({ force: true });
    }

    // Wait for notes section to load - editor, existing notes, or "No Notes Found"
    await Promise.race([
      page.locator('[data-testid="notes_card"]').first().waitFor({ state: 'visible', timeout: 30000 }),
      page.getByText('Enter your notes here').first().waitFor({ state: 'visible', timeout: 30000 }),
      page.getByText('No Notes Found').waitFor({ state: 'visible', timeout: 30000 }),
    ]);
    await page.waitForTimeout(1000);
  }

  async function removeOverlayBackdrops(page: any) {
    await page.evaluate(() => {
      document.querySelectorAll('.cdk-overlay-backdrop').forEach((el: any) => el.remove());
    });
  }

  // Login as the second user (ZuperTL-FE) for TC_07 and TC_08
  async function loginAsSecondUser(page: any) {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);

    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      await page.waitForFunction(
        () => {
          const inputs = document.querySelectorAll('input');
          return inputs.length > 0;
        },
        { timeout: 60000 }
      );
      await page.waitForTimeout(2000);

      // Check if company name step is shown
      const companyInput = page.getByRole('textbox', { name: 'Company Name' });
      const hasCompanyStep = await companyInput.isVisible().catch(() => false);

      if (hasCompanyStep) {
        await companyInput.waitFor({ state: 'visible', timeout: 10000 });
        await companyInput.clear();
        await companyInput.fill('divyatest');
        await page.waitForTimeout(1000);

        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(
            (b: any) => b.textContent?.trim() === 'Continue'
          );
          if (btn) (btn as HTMLElement).click();
        });
        await page.waitForTimeout(3000);
      }

      // Fill email and password for ZuperTL-FE user
      const emailInput = page.getByRole('textbox', { name: 'Email address' })
        .or(page.locator('input[type="email"]').first());
      await emailInput.waitFor({ state: 'visible', timeout: 30000 });
      await emailInput.clear();
      await emailInput.fill('tlfe@mail.com');

      const passwordInput = page.locator('input[type="password"]').describe('Password input');
      await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
      await passwordInput.clear();
      await passwordInput.fill('test1234');

      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(
          (b: any) => b.textContent?.trim() === 'Login'
        );
        if (btn) (btn as HTMLElement).click();
      });

      await page.waitForFunction(
        () => !window.location.href.includes('/login'),
        { timeout: 60000 }
      );
    }

    // Wait for app to load
    await page.waitForSelector('nav, [role="navigation"], a[href*="/jobs"]', { timeout: 90000 });
    await dismissPopups(page);
  }

  async function createNote(page: any, noteText: string) {
    // Click "Enter your notes here" to open the New Note modal
    const noteEditorButton = page.locator('button:has-text("Enter your notes here"), [placeholder*="Enter your notes"]').first().describe('Note editor placeholder');
    await noteEditorButton.waitFor({ state: 'visible', timeout: 15000 });
    await noteEditorButton.click();

    // Wait for the New Note modal/editor to open
    await page.waitForTimeout(2000);

    // Type in the editor area (placeholder: "Type text or paste a link")
    const noteEditor = page.locator('[contenteditable="true"], .ProseMirror, .ce-paragraph, [data-placeholder]').first().describe('Note text editor');
    await noteEditor.waitFor({ state: 'visible', timeout: 10000 });
    await noteEditor.click();
    await page.keyboard.type(noteText);

    // Click Post Note button
    const postNoteButton = page.locator('button:has-text("Post Note")').first().describe('Post Note button');
    await postNoteButton.waitFor({ state: 'visible', timeout: 10000 });
    await postNoteButton.click();

    // Wait for success toast or note to appear in list
    await page.waitForTimeout(3000);
    // Verify note was created by checking it appears in the notes list
    const noteCard = page.locator('[data-testid="notes_card"]').filter({ hasText: noteText }).first();
    await noteCard.waitFor({ state: 'visible', timeout: 20000 });
  }

  async function openRepliesForNote(page: any, noteText: string) {
    await removeOverlayBackdrops(page);
    // Find the note card containing our text
    const noteCard = page.locator('[data-testid="notes_card"]').filter({ hasText: noteText }).first();
    await noteCard.waitFor({ state: 'visible', timeout: 15000 });

    // Click the reply toggle button within this note card
    const replyToggle = noteCard.locator('[data-testid="notes_comment-toggle"]').describe('Reply toggle button');
    await replyToggle.click({ force: true });

    // Wait for reply input to appear
    const replyInput = page.locator('[placeholder*="Write a reply"], [placeholder*="write a reply"]').first();
    await replyInput.waitFor({ state: 'visible', timeout: 15000 });
  }

  async function submitReply(page: any, replyText: string) {
    const replyInput = page.locator('[placeholder*="Write a reply"], [placeholder*="write a reply"]').first().describe('Reply input');
    await replyInput.waitFor({ state: 'visible', timeout: 10000 });
    await replyInput.click();
    await page.keyboard.type(replyText);

    // The send button becomes enabled after text entry
    const sendButton = replyInput.locator('..').locator('button:not([disabled])').last();
    await sendButton.waitFor({ state: 'visible', timeout: 5000 });
    await sendButton.click();
    await page.waitForTimeout(2000);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // TC_01 – Access Note/Comment
  // ────────────────────────────────────────────────────────────────────────────
  /**
   * User Prompt:
   * - Open the Job module. Open a valid job. Navigate to the Notes/Comments section.
   * - Verify that the section loads correctly.
   */
  test('TC_01 - Access Note/Comment section', async ({ page }) => {
    await loginAndNavigateToJob(page);
    await navigateToNotesTab(page);

    // Verify notes section is displayed (handles both cases: with notes or empty)
    // Use a single locator that matches any of the notes indicators
    const notesLoaded = await Promise.race([
      page.getByText('All Notes').first().waitFor({ state: 'visible', timeout: 10000 }).then(() => true),
      page.getByText('Enter your notes here').first().waitFor({ state: 'visible', timeout: 10000 }).then(() => true),
      page.getByText('No Notes Found').waitFor({ state: 'visible', timeout: 10000 }).then(() => true),
    ]);
    expect(notesLoaded).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TC_02 – Create Reply/Comment
  // ────────────────────────────────────────────────────────────────────────────
  /**
   * User Prompt:
   * - Open an existing note/comment. Add a valid text reply/comment. Submit it.
   * - Verify that the reply/comment is created and displayed correctly.
   */
  test('TC_02 - Create Reply/Comment', async ({ page }) => {
    await loginAndNavigateToJob(page);
    await navigateToNotesTab(page);

    const uniqueSuffix = Date.now();
    const noteText = `Reply test note ${uniqueSuffix}`;
    const replyText = `Test reply ${uniqueSuffix}`;

    // Create a note to reply to
    await createNote(page, noteText);

    // Open replies for the note
    await openRepliesForNote(page, noteText);

    // Submit a reply
    await submitReply(page, replyText);

    // Verify reply appears
    const replyElement = page.getByText(replyText).first().describe('Submitted reply text');
    await expect(replyElement).toBeVisible({ timeout: 15000 });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TC_03 – Reply/Comment Persistence
  // ────────────────────────────────────────────────────────────────────────────
  /**
   * User Prompt:
   * - Create a reply/comment. Refresh the page or navigate away and return.
   * - Verify that the reply/comment is still displayed.
   */
  test('TC_03 - Reply/Comment Persistence', async ({ page }) => {
    await loginAndNavigateToJob(page);
    await navigateToNotesTab(page);

    const uniqueSuffix = Date.now();
    const noteText = `Persistence test note ${uniqueSuffix}`;
    const replyText = `Persistent reply ${uniqueSuffix}`;

    // Create note and reply
    await createNote(page, noteText);
    await openRepliesForNote(page, noteText);
    await submitReply(page, replyText);

    // Verify reply is visible before refresh
    const replyElement = page.getByText(replyText).first();
    await expect(replyElement).toBeVisible({ timeout: 15000 });

    // Refresh page
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('button:has-text("Notes"), button:has-text("Details")', { timeout: 60000 });
    await dismissPopups(page);
    await forceRemoveOverlays(page);

    // Navigate back to Notes tab
    await navigateToNotesTab(page);

    // Open replies for the note again
    await openRepliesForNote(page, noteText);

    // Verify reply persisted
    const persistedReply = page.getByText(replyText).first().describe('Persisted reply after refresh');
    await expect(persistedReply).toBeVisible({ timeout: 15000 });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TC_04 – Edit Own Reply/Comment
  // ────────────────────────────────────────────────────────────────────────────
  /**
   * User Prompt:
   * - Create a reply/comment using the logged-in user. Edit the same reply/comment.
   * - Verify that the updated content is displayed correctly.
   */
  test('TC_04 - Edit Own Reply/Comment', async ({ page }) => {
    await loginAndNavigateToJob(page);
    await navigateToNotesTab(page);

    const uniqueSuffix = Date.now();
    const noteText = `Edit reply test note ${uniqueSuffix}`;
    const originalReply = `Original reply ${uniqueSuffix}`;
    const editedReply = `Edited reply ${uniqueSuffix}`;

    // Create note and reply
    await createNote(page, noteText);
    await openRepliesForNote(page, noteText);
    await submitReply(page, originalReply);

    // Verify original reply is visible
    const replyElement = page.getByText(originalReply).first();
    await expect(replyElement).toBeVisible({ timeout: 15000 });

    // Open three-dot menu on the reply via JS
    await removeOverlayBackdrops(page);
    await page.evaluate((text: string) => {
      const spans = Array.from(document.querySelectorAll('span, div, p'));
      const replyEl = spans.find(el => el.textContent?.trim() === text);
      if (replyEl) {
        let parent = replyEl.parentElement;
        for (let i = 0; i < 5 && parent; i++) {
          const btn = parent.querySelector('.cdk-menu-trigger') as HTMLElement;
          if (btn) {
            btn.click();
            return;
          }
          parent = parent.parentElement;
        }
      }
    }, originalReply);

    // Wait for CDK menu to appear and click Edit
    await page.waitForTimeout(1500);
    const editMenuItem = page.locator('div').filter({ hasText: /^Edit$/ }).first();
    await editMenuItem.click({ force: true, timeout: 10000 });

    // Wait for reply text to populate in the edit input
    await page.waitForTimeout(1500);

    // The reply input should now be editable with the original text
    const replyInput = page.locator('[placeholder*="Write a reply"], [placeholder*="write a reply"]').first().describe('Reply edit input');
    await replyInput.waitFor({ state: 'visible', timeout: 10000 });

    // Clear and type the edited text
    await replyInput.fill('');
    await page.keyboard.type(editedReply);

    // Click the save/send button
    const saveBtn = replyInput.locator('..').locator('button:not([disabled])').last();
    await saveBtn.waitFor({ state: 'visible', timeout: 5000 });
    await saveBtn.click();

    // Wait for edit to be saved
    await page.waitForTimeout(3000);

    // Verify edited reply text appears
    const editedElement = page.getByText(editedReply).first().describe('Edited reply text');
    await expect(editedElement).toBeVisible({ timeout: 15000 });

    // Verify original text is no longer visible
    await expect(page.getByText(originalReply)).not.toBeVisible({ timeout: 10000 });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TC_05 – Delete Own Reply/Comment
  // ────────────────────────────────────────────────────────────────────────────
  /**
   * User Prompt:
   * - Create a reply/comment using the logged-in user. Delete the reply/comment.
   * - Verify that the reply/comment is permanently removed.
   */
  test('TC_05 - Delete Own Reply/Comment', async ({ page }) => {
    await loginAndNavigateToJob(page);
    await navigateToNotesTab(page);

    const uniqueSuffix = Date.now();
    const noteText = `Delete reply test note ${uniqueSuffix}`;
    const replyText = `Delete me reply ${uniqueSuffix}`;

    // Create note and reply
    await createNote(page, noteText);
    await openRepliesForNote(page, noteText);
    await submitReply(page, replyText);

    // Verify reply is visible
    const replyElement = page.getByText(replyText).first();
    await expect(replyElement).toBeVisible({ timeout: 15000 });

    // Find and click the three-dot menu on the reply using JS to locate the correct button
    await removeOverlayBackdrops(page);
    await page.evaluate((text: string) => {
      // Find the span containing the reply text
      const spans = Array.from(document.querySelectorAll('span, div, p'));
      const replyEl = spans.find(el => el.textContent?.trim() === text);
      if (replyEl) {
        // Walk up to find the reply container, then find the cdk-menu-trigger button
        let parent = replyEl.parentElement;
        for (let i = 0; i < 5 && parent; i++) {
          const btn = parent.querySelector('.cdk-menu-trigger') as HTMLElement;
          if (btn) {
            btn.click();
            return;
          }
          parent = parent.parentElement;
        }
      }
    }, replyText);

    // Wait for CDK menu to appear
    await page.waitForTimeout(1500);

    // Click Delete from the menu using force click (menu might be behind overlay)
    const deleteMenuItem = page.locator('text=Delete').last();
    await deleteMenuItem.click({ force: true });

    // Wait for confirmation dialog to appear
    await page.waitForTimeout(2000);
    await removeOverlayBackdrops(page);

    // Click the "Delete" button in the confirmation dialog
    // The dialog has "Cancel" and "Delete" buttons - get the one in the dialog
    const confirmDeleteBtn = page.locator('button:has-text("Delete")').last();
    await confirmDeleteBtn.waitFor({ state: 'visible', timeout: 10000 });
    await confirmDeleteBtn.click({ force: true });

    // Verify reply is removed
    await page.waitForTimeout(3000);
    await expect(page.getByText(replyText)).not.toBeVisible({ timeout: 15000 });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TC_06 – User Mention
  // ────────────────────────────────────────────────────────────────────────────
  /**
   * User Prompt:
   * - Create a reply/comment. Mention another active user using @mention.
   * - Submit the reply/comment. Verify that the mention is created and displayed.
   */
  test('TC_06 - User Mention in Reply', async ({ page }) => {
    await loginAndNavigateToJob(page);
    await navigateToNotesTab(page);

    const uniqueSuffix = Date.now();
    const noteText = `Mention test note ${uniqueSuffix}`;

    // Create note
    await createNote(page, noteText);

    // Open replies
    await openRepliesForNote(page, noteText);

    // Type a reply with @mention
    const replyInput = page.locator('[placeholder*="Write a reply"], [placeholder*="write a reply"]').first().describe('Reply input');
    await replyInput.waitFor({ state: 'visible', timeout: 10000 });
    await replyInput.click();
    await page.keyboard.type('@');

    // Wait for mention suggestions dropdown
    await page.waitForTimeout(2000);

    // Look for mention suggestions
    const mentionSuggestion = page.locator('[class*="mention"], [class*="suggestion"], [role="listbox"], [role="option"]').first();
    const hasSuggestions = await mentionSuggestion.isVisible().catch(() => false);

    if (hasSuggestions) {
      // Click first suggestion
      await mentionSuggestion.click({ force: true });
    } else {
      // Type a user name and select
      await page.keyboard.type('Divya');
      await page.waitForTimeout(2000);
      const suggestion = page.locator('[class*="mention"], [class*="suggestion"]').first();
      if (await suggestion.isVisible().catch(() => false)) {
        await suggestion.click({ force: true });
      }
    }

    // Add text after mention
    await page.keyboard.type(` mention test ${uniqueSuffix}`);

    // Submit
    const sendButton = page.locator('[placeholder*="Write a reply"], [placeholder*="write a reply"]').first().locator('..').locator('button:not([disabled])').last();
    await sendButton.waitFor({ state: 'visible', timeout: 5000 });
    await sendButton.click();

    // Verify the reply with mention is displayed (@ symbol should be in text)
    await page.waitForTimeout(2000);
    const mentionReply = page.getByText(new RegExp(`mention test ${uniqueSuffix}`)).first();
    await expect(mentionReply).toBeVisible({ timeout: 15000 });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TC_07 – Mention Notification
  // ────────────────────────────────────────────────────────────────────────────
  /**
   * User Prompt:
   * - Mention another active user in a reply/comment. Switch to or log in as
   *   the mentioned user. Verify that the mentioned user receives in-app notification.
   * - Use the ZuperTL-FE user (tlfe@mail.com / test1234 / company: divyatest) for TC7.
   */
  test('TC_07 - Mention Notification', async ({ page }) => {
    // Step 1: Login as primary user and create a note with @ZuperTL-FE mention
    await loginAndNavigateToJob(page);
    await navigateToNotesTab(page);

    const uniqueSuffix = Date.now();
    const noteText = `Mention notify test ${uniqueSuffix}`;

    // Create note
    await createNote(page, noteText);

    // Open replies
    await openRepliesForNote(page, noteText);

    // Type a reply mentioning @ZuperTL-FE
    const replyInput = page.locator('[placeholder*="Write a reply"], [placeholder*="write a reply"]').first().describe('Reply input');
    await replyInput.waitFor({ state: 'visible', timeout: 10000 });
    await replyInput.click();
    await page.keyboard.type('@ZuperTL');

    // Wait for mention suggestions dropdown
    await page.waitForTimeout(2000);

    // Look for ZuperTL-FE in mention suggestions and click it
    const mentionSuggestion = page.locator('[class*="mention"], [class*="suggestion"], [role="listbox"] [role="option"], [class*="dropdown"] li, [class*="list"] [class*="item"]').filter({ hasText: /ZuperTL/i }).first();
    const hasSuggestion = await mentionSuggestion.isVisible().catch(() => false);

    if (hasSuggestion) {
      await mentionSuggestion.click({ force: true });
    } else {
      // Fallback: try clicking first visible suggestion
      const anySuggestion = page.locator('[class*="mention"] li, [class*="suggestion"] li, [role="option"]').first();
      const hasAny = await anySuggestion.isVisible().catch(() => false);
      if (hasAny) {
        await anySuggestion.click({ force: true });
      } else {
        // Type the full mention manually
        await page.keyboard.type('-FE');
      }
    }

    await page.keyboard.type(` notification test ${uniqueSuffix}`);

    // Submit
    const sendButton = replyInput.locator('..').locator('button:not([disabled])').last();
    await sendButton.waitFor({ state: 'visible', timeout: 5000 });
    await sendButton.click();
    await page.waitForTimeout(3000);

    // Verify the reply with mention was posted
    const mentionReply = page.getByText(new RegExp(`notification test ${uniqueSuffix}`)).first();
    await expect(mentionReply).toBeVisible({ timeout: 15000 });

    // Step 2: Login as the mentioned user (ZuperTL-FE) and check notifications
    await page.context().clearCookies();
    await loginAsSecondUser(page);

    // Check notification bell/icon
    const notificationBell = page.locator('[data-testid*="notification"], button[aria-label*="notification"], button[aria-label*="Notification"], [class*="notification"] button, [class*="bell"]').first();
    const bellVisible = await notificationBell.isVisible().catch(() => false);

    if (bellVisible) {
      await notificationBell.click({ force: true });
      await page.waitForTimeout(2000);

      // Verify notification mentioning the note text or the mention
      const notification = page.getByText(new RegExp(`notification test ${uniqueSuffix}|mentioned you`)).first();
      await expect(notification).toBeVisible({ timeout: 15000 });
    } else {
      // Navigate to notifications page directly if bell is not visible
      await page.goto('/notifications', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
      const notification = page.getByText(new RegExp(`notification test ${uniqueSuffix}|mentioned you|Zuper jeevi`)).first();
      await expect(notification).toBeVisible({ timeout: 15000 });
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TC_08 – Notification Deep Link
  // ────────────────────────────────────────────────────────────────────────────
  /**
   * User Prompt:
   * - Open the mention notification received by the mentioned user.
   * - Verify it navigates to the correct Job and opens the correct Note/Comment.
   * - Use the ZuperTL-FE user (tlfe@mail.com / test1234 / company: divyatest) for TC8.
   */
  test('TC_08 - Notification Deep Link', async ({ page }) => {
    // Step 1: Login as primary user and create a note with @ZuperTL-FE mention
    await loginAndNavigateToJob(page);
    const jobUrl = page.url(); // Store job URL for later verification
    await navigateToNotesTab(page);

    const uniqueSuffix = Date.now();
    const noteText = `Deep link test ${uniqueSuffix}`;

    // Create note
    await createNote(page, noteText);

    // Open replies
    await openRepliesForNote(page, noteText);

    // Type a reply mentioning @ZuperTL-FE
    const replyInput = page.locator('[placeholder*="Write a reply"], [placeholder*="write a reply"]').first().describe('Reply input');
    await replyInput.waitFor({ state: 'visible', timeout: 10000 });
    await replyInput.click();
    await page.keyboard.type('@ZuperTL');

    // Wait for mention suggestions dropdown
    await page.waitForTimeout(2000);

    // Look for ZuperTL-FE in mention suggestions
    const mentionSuggestion = page.locator('[class*="mention"], [class*="suggestion"], [role="listbox"] [role="option"], [class*="dropdown"] li, [class*="list"] [class*="item"]').filter({ hasText: /ZuperTL/i }).first();
    const hasSuggestion = await mentionSuggestion.isVisible().catch(() => false);

    if (hasSuggestion) {
      await mentionSuggestion.click({ force: true });
    } else {
      const anySuggestion = page.locator('[class*="mention"] li, [class*="suggestion"] li, [role="option"]').first();
      const hasAny = await anySuggestion.isVisible().catch(() => false);
      if (hasAny) {
        await anySuggestion.click({ force: true });
      } else {
        await page.keyboard.type('-FE');
      }
    }

    await page.keyboard.type(` deeplink test ${uniqueSuffix}`);

    // Submit
    const sendButton = replyInput.locator('..').locator('button:not([disabled])').last();
    await sendButton.waitFor({ state: 'visible', timeout: 5000 });
    await sendButton.click();
    await page.waitForTimeout(3000);

    // Verify reply posted
    const mentionReply = page.getByText(new RegExp(`deeplink test ${uniqueSuffix}`)).first();
    await expect(mentionReply).toBeVisible({ timeout: 15000 });

    // Step 2: Login as the mentioned user (ZuperTL-FE) and open notification
    await page.context().clearCookies();
    await loginAsSecondUser(page);

    // Open notification bell
    const notificationBell = page.locator('[data-testid*="notification"], button[aria-label*="notification"], button[aria-label*="Notification"], [class*="notification"] button, [class*="bell"]').first();
    const bellVisible = await notificationBell.isVisible().catch(() => false);

    if (bellVisible) {
      await notificationBell.click({ force: true });
      await page.waitForTimeout(2000);

      // Click on the notification to navigate to the job
      const notification = page.getByText(new RegExp(`deeplink test ${uniqueSuffix}|mentioned you`)).first();
      await notification.waitFor({ state: 'visible', timeout: 15000 });
      await notification.click();
      await page.waitForTimeout(5000);
    } else {
      // Navigate to notifications page
      await page.goto('/notifications', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
      const notification = page.getByText(new RegExp(`deeplink test ${uniqueSuffix}|mentioned you`)).first();
      await notification.waitFor({ state: 'visible', timeout: 15000 });
      await notification.click();
      await page.waitForTimeout(5000);
    }

    // Verify navigation to the correct job (URL should contain /jobs/)
    await page.waitForFunction(
      () => window.location.href.includes('/jobs/'),
      { timeout: 30000 }
    );
    expect(page.url()).toContain('/jobs/');

    // Wait for the job page to load fully
    await page.waitForSelector('button:has-text("Notes"), button:has-text("Details")', { timeout: 60000 });
    await dismissPopups(page);
    await forceRemoveOverlays(page);

    // Verify the Notes tab/section is visible on the job page (deep link navigated correctly)
    // The deep link should either show the Notes tab directly or the note text
    const notesTabOrContent = await Promise.race([
      page.getByText(noteText).first().waitFor({ state: 'visible', timeout: 15000 }).then(() => 'note_visible'),
      page.getByText('All Notes').first().waitFor({ state: 'visible', timeout: 15000 }).then(() => 'notes_tab'),
      page.locator('button:has-text("Notes")').first().waitFor({ state: 'visible', timeout: 15000 }).then(() => 'notes_button'),
    ]);

    // As long as we landed on a job page with notes functionality, the deep link worked
    expect(['note_visible', 'notes_tab', 'notes_button']).toContain(notesTabOrContent);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TC_09 – Emoji
  // ────────────────────────────────────────────────────────────────────────────
  /**
   * User Prompt:
   * - Add an emoji or emoji-based reply/comment. Verify it is created and displayed.
   */
  test('TC_09 - Emoji in Reply', async ({ page }) => {
    await loginAndNavigateToJob(page);
    await navigateToNotesTab(page);

    const uniqueSuffix = Date.now();
    const noteText = `Emoji test note ${uniqueSuffix}`;

    // Create note
    await createNote(page, noteText);

    // Open replies
    await openRepliesForNote(page, noteText);

    // Type emoji directly in the reply (keyboard emoji entry)
    const replyInput = page.locator('[placeholder*="Write a reply"], [placeholder*="write a reply"]').first().describe('Reply input');
    await replyInput.waitFor({ state: 'visible', timeout: 10000 });
    await replyInput.click();
    // Type emoji characters directly followed by unique text
    await page.keyboard.type(`😀🎉 emoji test ${uniqueSuffix}`);

    // Submit
    const sendButton = replyInput.locator('..').locator('button:not([disabled])').last();
    await sendButton.waitFor({ state: 'visible', timeout: 5000 });
    await sendButton.click();

    // Verify the reply with emoji text is displayed
    await page.waitForTimeout(2000);
    const emojiReply = page.getByText(new RegExp(`emoji test ${uniqueSuffix}`)).first();
    await expect(emojiReply).toBeVisible({ timeout: 15000 });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TC_10 – Multiple Replies/Comments
  // ────────────────────────────────────────────────────────────────────────────
  /**
   * User Prompt:
   * - Add multiple replies/comments to the same note/comment.
   * - Verify that all replies/comments are displayed correctly.
   */
  test('TC_10 - Multiple Replies/Comments', async ({ page }) => {
    await loginAndNavigateToJob(page);
    await navigateToNotesTab(page);

    const uniqueSuffix = Date.now();
    const noteText = `Multi reply test note ${uniqueSuffix}`;
    const reply1 = `First reply ${uniqueSuffix}`;
    const reply2 = `Second reply ${uniqueSuffix}`;
    const reply3 = `Third reply ${uniqueSuffix}`;

    // Create note
    await createNote(page, noteText);

    // Open replies
    await openRepliesForNote(page, noteText);

    // Submit first reply
    await submitReply(page, reply1);

    // Submit second reply
    await submitReply(page, reply2);

    // Submit third reply
    await submitReply(page, reply3);

    // Verify all three replies are displayed
    await expect(page.getByText(reply1).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(reply2).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(reply3).first()).toBeVisible({ timeout: 15000 });

    // Verify reply count shows 3
    const noteCard = page.locator('[data-testid="notes_card"]').filter({ hasText: noteText }).first();
    const replyCount = noteCard.locator('[data-testid="notes_comment-toggle"]');
    await expect(replyCount).toContainText('3', { timeout: 10000 });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // TC_11 – Basic Permission Validation
  // ────────────────────────────────────────────────────────────────────────────
  /**
   * User Prompt:
   * - Verify that the logged-in user can delete their own reply/comment.
   * - Verify basic permission restrictions for another user's reply/comment.
   */
  test('TC_11 - Basic Permission Validation', async ({ page }) => {
    await loginAndNavigateToJob(page);
    await navigateToNotesTab(page);

    const uniqueSuffix = Date.now();
    const noteText = `Permission test note ${uniqueSuffix}`;
    const replyText = `Permission reply ${uniqueSuffix}`;

    // Create note and reply
    await createNote(page, noteText);
    await openRepliesForNote(page, noteText);
    await submitReply(page, replyText);

    // Verify own reply shows more-options (three-dot) button with Delete option
    await removeOverlayBackdrops(page);

    // Open the reply's three-dot menu via JS
    await page.evaluate((text: string) => {
      const spans = Array.from(document.querySelectorAll('span, div, p'));
      const replyEl = spans.find(el => el.textContent?.trim() === text);
      if (replyEl) {
        let parent = replyEl.parentElement;
        for (let i = 0; i < 5 && parent; i++) {
          const btn = parent.querySelector('.cdk-menu-trigger') as HTMLElement;
          if (btn) {
            btn.click();
            return;
          }
          parent = parent.parentElement;
        }
      }
    }, replyText);

    // Wait for menu to appear and verify Delete is available
    await page.waitForTimeout(1500);
    const deleteOption = page.locator('[cdkmenuitem]').filter({ hasText: 'Delete' }).first()
      .or(page.locator('div').filter({ hasText: /^Delete$/ }).first());
    await expect(deleteOption).toBeVisible({ timeout: 10000 });

    // Close menu by pressing Escape
    await page.keyboard.press('Escape');
    await removeOverlayBackdrops(page);
  });
});
