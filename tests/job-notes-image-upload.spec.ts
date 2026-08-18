import { test, expect } from '@stablyai/playwright-test';
import { LoginPage } from './pages/LoginPage.js';
import { forceRemoveOverlays } from './Helper/overlay-helper.js';
import fs from 'fs';
import path from 'path';

test.describe('Job Notes Image Upload', () => {
  /**
   * User Prompt:
   * - I want to start upload an image inside the Job --> Notes to test it out
   *
   * Clarifications:
   * - Job Setup: Navigate to an existing job (like other passing notes tests)
   * - Assertions: Both image + notification
   */
  test('should upload an image in job notes and verify it appears', async ({ page }) => {
    // --- Setup: Create a minimal valid PNG image file ---
    const assetsDir = path.resolve('tests', 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    const imagePath = path.join(assetsDir, `test-note-image-${Date.now()}.png`);

    // Minimal valid 1x1 blue PNG
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const ihdrChunk = Buffer.from([
      0x00, 0x00, 0x00, 0x0d, // length: 13
      0x49, 0x48, 0x44, 0x52, // type: IHDR
      0x00, 0x00, 0x00, 0x01, // width: 1
      0x00, 0x00, 0x00, 0x01, // height: 1
      0x08, 0x02,             // bit depth: 8, color type: 2 (RGB)
      0x00, 0x00, 0x00,       // compression, filter, interlace
      0x90, 0x77, 0x53, 0xde, // CRC
    ]);
    const idatChunk = Buffer.from([
      0x00, 0x00, 0x00, 0x0c, // length: 12
      0x49, 0x44, 0x41, 0x54, // type: IDAT
      0x78, 0x9c, 0x62, 0x60, 0x60, 0xf8, 0x0f, 0x00,
      0x00, 0x03, 0x00, 0x01,
      0x34, 0x7e, 0x49, 0x31, // CRC
    ]);
    const iendChunk = Buffer.from([
      0x00, 0x00, 0x00, 0x00, // length: 0
      0x49, 0x45, 0x4e, 0x44, // type: IEND
      0xae, 0x42, 0x60, 0x82, // CRC
    ]);
    const pngBuffer = Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);
    fs.writeFileSync(imagePath, pngBuffer);

    // --- Step 1: Login ---
    const loginPage = new LoginPage(page);
    await loginPage.login(
      process.env.companyName!,
      process.env.email!,
      process.env.password!
    );

    // Dismiss any popups after login
    await loginPage.dismissOnboarding();

    // --- Step 2: Navigate to an existing job ---
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

    // Dismiss notification popup if present
    const notifBtn = page.getByRole('button', { name: 'No, thanks' });
    await notifBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await notifBtn.isVisible()) await notifBtn.click();

    // Dismiss timezone popup if present
    const tzCancelBtn = page.getByRole('button', { name: 'Cancel' });
    await tzCancelBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await tzCancelBtn.isVisible()) await tzCancelBtn.click();

    // Wait briefly for dialogs to dismiss
    await page.waitForTimeout(500);
    await forceRemoveOverlays(page);

    // --- Step 3: Navigate to Notes tab ---
    const notesTab = page.getByRole('button', { name: /^Notes/ }).first().describe('Notes tab button');
    await notesTab.waitFor({ state: 'visible', timeout: 30000 });
    await notesTab.click();

    // --- Step 4: Open note editor ---
    const noteEditorButton = page.getByRole('button', { name: 'Enter your notes here...' }).describe('Open note editor');
    await noteEditorButton.waitFor({ state: 'visible', timeout: 15000 });
    await noteEditorButton.click();

    // Verify note editor opened - look for the "Post Note" button
    const postNoteButton = page.getByRole('button', { name: 'Post Note' }).describe('Post Note button');
    await expect(postNoteButton).toBeVisible({ timeout: 10000 });

    // --- Step 5: Upload image via Attach button ---
    const attachButton = page.getByTestId('notes_attachment-button').describe('Attach file button');
    await expect(attachButton).toBeVisible({ timeout: 10000 });

    // Upload the test image via the hidden file input directly
    // (the filechooser event is unreliable in headless mode for this Angular app)
    const fileInput = page.getByTestId('notes_attachment-input');
    await fileInput.setInputFiles(imagePath);

    // Wait for upload to process - a thumbnail preview appears in the editor
    // The editor shows a small image preview but without visible filename text,
    // so we wait for the Post Note button to remain enabled (confirming upload readiness)
    await postNoteButton.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(2000);

    // --- Step 6: Post the note ---
    await postNoteButton.click();

    // --- Step 7: Verify the note was posted with the image ---

    // 7a: Verify success toast notification "Note Created successfully" appears
    const successToast = page.getByText('Note Created successfully').describe('Success toast notification');
    await expect(successToast).toBeVisible({ timeout: 20000 });

    // 7b: Verify the attachment count text appears (e.g., "1 Attachment(s)")
    const attachmentCount = page.getByText(/\d+\s*Attachment/i).first().describe('Attachment count in posted note');
    await expect(attachmentCount).toBeVisible({ timeout: 15000 });

    // 7c: Verify the uploaded image filename appears in the note
    const imageFilename = page.getByText(/test-note-image/i).first().describe('Uploaded image filename in note');
    await expect(imageFilename).toBeVisible({ timeout: 10000 });

    // 7d: Verify the "All Notes" section is visible with posted content
    const allNotesHeading = page.getByText('All Notes').describe('All Notes section header');
    await expect(allNotesHeading).toBeVisible();

    // --- Cleanup: Remove the generated test image ---
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  });
});
