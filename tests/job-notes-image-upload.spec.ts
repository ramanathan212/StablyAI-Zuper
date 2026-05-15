import { test, expect } from '@stablyai/playwright-test';
import { LoginPage } from './pages/LoginPage.js';
import { JobPage } from './pages/JobPage.js';
import fs from 'fs';
import path from 'path';

test.describe('Job Notes Image Upload', () => {
  /**
   * User Prompt:
   * - I want to start upload an image inside the Job --> Notes to test it out
   *
   * Clarifications:
   * - Job Setup: Create a new job
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

    // --- Step 2: Navigate to New Job form ---
    const jobPage = new JobPage(page);
    await jobPage.navigateToJobs();
    await jobPage.clickNewJob();

    // --- Step 3: Fill mandatory job fields ---
    const uniqueJobTitle = `Notes Upload Test ${Date.now()}`;

    // Dynamic due date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const dueDate = `${monthNames[tomorrow.getMonth()]} ${tomorrow.getDate()},`;

    await jobPage.fillJobBasicInfo({ title: uniqueJobTitle, dueDate });

    // Add organization (mandatory)
    await jobPage.addOrganizationToJob('ACME Corporation');

    // Fill mandatory custom field
    await jobPage.fillCustomFields('test');

    // --- Step 4: Create the job ---
    await jobPage.createJob();

    // Verify we're on the job details page
    await expect(page).toHaveURL(/\/jobs\/.*\/details/, { timeout: 30000 });

    // --- Step 5: Navigate to Notes tab ---
    const notesTab = page.getByRole('button', { name: 'Notes' }).describe('Notes tab button');
    await notesTab.waitFor({ state: 'visible', timeout: 15000 });
    await notesTab.click();

    // --- Step 6: Open note editor ---
    const noteEditorButton = page.getByRole('button', { name: 'Enter your notes here...' }).describe('Open note editor');
    await noteEditorButton.waitFor({ state: 'visible', timeout: 15000 });
    await noteEditorButton.click();

    // Verify note editor opened - look for the "Post Note" button
    const postNoteButton = page.getByRole('button', { name: 'Post Note' }).describe('Post Note button');
    await expect(postNoteButton).toBeVisible({ timeout: 10000 });

    // --- Step 7: Upload image via Attach button ---
    const attachButton = page.getByTestId('notes_attachment-button').describe('Attach file button');
    await expect(attachButton).toBeVisible({ timeout: 10000 });

    // Listen for file chooser, then click Attach
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 15000 }),
      attachButton.click(),
    ]);

    // Upload the test image
    await fileChooser.setFiles(imagePath);

    // Wait for upload to process - a thumbnail preview appears in the editor
    // The editor shows a small image preview but without visible filename text,
    // so we wait for the Post Note button to remain enabled (confirming upload readiness)
    await postNoteButton.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(2000);

    // --- Step 8: Post the note ---
    await postNoteButton.click();

    // --- Step 9: Verify the note was posted with the image ---

    // 9a: Verify success toast notification "Note Created successfully" appears
    const successToast = page.getByText('Note Created successfully').describe('Success toast notification');
    await expect(successToast).toBeVisible({ timeout: 20000 });

    // 9b: Verify the attachment count text appears (e.g., "1 Attachment(s)")
    const attachmentCount = page.getByText(/\d+\s*Attachment/i).first().describe('Attachment count in posted note');
    await expect(attachmentCount).toBeVisible({ timeout: 15000 });

    // 9c: Verify the uploaded image filename appears in the note
    const imageFilename = page.getByText(/test-note-image/i).first().describe('Uploaded image filename in note');
    await expect(imageFilename).toBeVisible({ timeout: 10000 });

    // 9d: Verify the "All Notes" section is visible with posted content
    const allNotesHeading = page.getByText('All Notes').describe('All Notes section header');
    await expect(allNotesHeading).toBeVisible();

    // --- Cleanup: Remove the generated test image ---
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  });
});
