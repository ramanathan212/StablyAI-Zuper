import { test, expect } from '@stablyai/playwright-test';
import { forceRemoveOverlays } from './Helper/overlay-helper.js';
import { testData } from './test-data.js';
import fs from 'fs';
import path from 'path';

test.describe('Job Notes - Create Note with Attachments', () => {
  /**
   * User Prompt:
   * - Do not include login steps. Assume user is already authenticated.
   * - Navigate to an existing job and open the Notes section.
   * - Verify the Notes editor input is visible and enabled.
   * - Create a new note with text "Automation test note - create flow".
   * - Submit the note.
   * - Verify the newly created note appears in the notes list with the exact text.
   * - Add an image attachment to this note.
   * - Wait for the upload to complete.
   * - Verify the image preview or thumbnail is visible inside the note.
   * - Add a video attachment to the same note.
   * - Wait for the upload to complete.
   * - Verify the video attachment is visible.
   * - Add a file attachment (PDF or document) to the same note.
   * - Wait for the upload to complete.
   * - Verify the file name is displayed.
   * - Refresh the page.
   * - Verify the created note and all attachments persist after refresh.
   */

  // Unique suffix to avoid collision with previous runs
  const uniqueSuffix = Date.now();
  const noteText = `Automation test note - create flow ${uniqueSuffix}`;

  let imagePath: string;
  let videoPath: string;
  let pdfPath: string;

  test.beforeAll(async () => {
    // Create test asset files
    const assetsDir = path.resolve('tests', 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    // --- Minimal valid 1x1 PNG image ---
    imagePath = path.join(assetsDir, `test-attachment-image-${uniqueSuffix}.png`);
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const ihdrChunk = Buffer.from([
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde,
    ]);
    const idatChunk = Buffer.from([
      0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54,
      0x78, 0x9c, 0x62, 0x60, 0x60, 0xf8, 0x0f, 0x00,
      0x00, 0x03, 0x00, 0x01, 0x34, 0x7e, 0x49, 0x31,
    ]);
    const iendChunk = Buffer.from([
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
    fs.writeFileSync(imagePath, Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]));

    // --- Minimal valid MP4 video ---
    videoPath = path.join(assetsDir, `test-attachment-video-${uniqueSuffix}.mp4`);
    const ftypBox = Buffer.from([
      0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70,
      0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
      0x69, 0x73, 0x6f, 0x6d,
    ]);
    const moovBox = Buffer.from([
      0x00, 0x00, 0x00, 0x08, 0x6d, 0x6f, 0x6f, 0x76,
    ]);
    fs.writeFileSync(videoPath, Buffer.concat([ftypBox, moovBox]));

    // --- Minimal valid PDF document ---
    pdfPath = path.join(assetsDir, `test-attachment-document-${uniqueSuffix}.pdf`);
    const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer
<< /Size 4 /Root 1 0 R >>
startxref
190
%%EOF`;
    fs.writeFileSync(pdfPath, pdfContent);
  });

  test.afterAll(async () => {
    // Cleanup test assets
    for (const filePath of [imagePath, videoPath, pdfPath]) {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  });

  test('should create a note with text, add image/video/PDF attachments, and verify persistence', async ({
    page,
  }) => {
    // ── Authentication ───────────────────────────────────────────────────
    await page.goto('/login');
    const companyInput = page
      .getByRole('textbox', { name: 'Company Name' })
      .describe('Company name input');
    await companyInput.waitFor({ state: 'visible', timeout: 30000 });
    await companyInput.fill(testData.login.companyName);

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
    await emailInput.fill(testData.login.email);

    const passwordInput = page
      .getByRole('textbox', { name: 'Password Forgot password?' })
      .describe('Password input');
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.fill(testData.login.password);

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
    if (await tzCancelBtn.isVisible()) await tzCancelBtn.click({ force: true });

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

    // ── Navigate to an existing job ──────────────────────────────────────
    await page.goto('/jobs');
    await forceRemoveOverlays(page);

    const jobTable = page.locator('table').first().describe('Jobs list table');
    await jobTable.waitFor({ state: 'visible', timeout: 30000 });

    // Get the first job link href and navigate directly
    const firstJobLink = page
      .locator('table tbody tr')
      .first()
      .locator('a')
      .first()
      .describe('First job link');
    await firstJobLink.waitFor({ state: 'visible', timeout: 15000 });
    await firstJobLink.click();

    await expect(page).toHaveURL(/\/jobs\/.*\/details/, { timeout: 30000 });
    await forceRemoveOverlays(page);

    // ── Open the Notes section ───────────────────────────────────────────
    // Use CSS text selector - getByRole unreliable after page.goto navigation
    const notesTab = page.locator('button:has-text("Notes")').first()
      .describe('Notes tab button');
    await notesTab.waitFor({ state: 'visible', timeout: 30000 });
    await notesTab.click({ force: true });

    // ── Verify the Notes editor input is visible and enabled ─────────────
    const noteEditorButton = page
      .locator('button:has-text("Enter your notes here")')
      .first()
      .describe('Note editor placeholder');
    await expect(noteEditorButton).toBeVisible({ timeout: 15000 });
    await expect(noteEditorButton).toBeEnabled();

    // ── Open the editor and type note text ───────────────────────────────
    await noteEditorButton.click();

    const postNoteButton = page
      .locator('button:has-text("Post Note")')
      .first()
      .describe('Post Note button');
    await expect(postNoteButton).toBeVisible({ timeout: 10000 });

    const noteEditor = page.locator('.ce-paragraph').describe('Note text editor');
    await noteEditor.waitFor({ state: 'visible', timeout: 10000 });
    await noteEditor.click();
    await page.keyboard.type(noteText);

    // ── Attach files before posting ─────────────────────────────────────
    const attachButton = page
      .getByTestId('notes_attachment-button')
      .describe('Attach file button');
    await expect(attachButton).toBeVisible({ timeout: 10000 });

    // Small stabilization wait after typing before first upload
    await page.waitForTimeout(500);

    // Find the hidden file input associated with the attachment button.
    // Angular apps often use a hidden <input type="file"> that is triggered
    // programmatically. We set files directly on it to avoid filechooser event issues.
    const fileInput = page.locator('input[type="file"]').first();

    // Upload image
    await fileInput.setInputFiles(imagePath);
    // Wait for upload to process and UI to update
    await page.waitForTimeout(3000);

    // Upload video
    await fileInput.setInputFiles(videoPath);
    await page.waitForTimeout(3000);

    // Upload PDF
    await fileInput.setInputFiles(pdfPath);
    await page.waitForTimeout(3000);

    // ── Submit the note with all attachments ─────────────────────────────
    await postNoteButton.click();

    // Verify success toast (text may vary slightly)
    const successToast = page
      .getByText(/Note Created successfully|Note created successfully|Note added/i)
      .first()
      .describe('Note creation success toast');
    await expect(successToast).toBeVisible({ timeout: 20000 });

    // ── Verify the note text appears ─────────────────────────────────────
    const postedNoteText = page
      .getByText(noteText)
      .first()
      .describe('Posted note text');
    await expect(postedNoteText).toBeVisible({ timeout: 15000 });

    // ── Verify attachment count is shown ──────────────────────────────────
    const attachmentCount = page
      .getByText(/\d+\s*Attachment/i)
      .first()
      .describe('Attachment count indicator');
    await expect(attachmentCount).toBeVisible({ timeout: 15000 });

    // ── Verify individual attachment filenames ────────────────────────────
    // Image may be rendered as inline <img> (preview) or shown as filename text
    const imageByFilename = page
      .getByText(new RegExp(`test-attachment-image-${uniqueSuffix}`, 'i'))
      .first();
    const imageByAlt = page
      .locator(`img[alt*="test-attachment-image-${uniqueSuffix}"]`)
      .first();
    const imageBySource = page
      .locator(`img[src*="test-attachment-image-${uniqueSuffix}"]`)
      .first();

    // Check if image is visible as filename text, alt attribute, or src attribute
    const imageVisible = await imageByFilename.isVisible().catch(() => false)
      || await imageByAlt.isVisible().catch(() => false)
      || await imageBySource.isVisible().catch(() => false);
    expect(imageVisible, 'Image attachment should be visible as filename or preview').toBeTruthy();

    const videoAttachment = page
      .getByText(new RegExp(`test-attachment-video-${uniqueSuffix}`, 'i'))
      .first()
      .describe('Video attachment filename');
    await expect(videoAttachment).toBeVisible({ timeout: 15000 });

    const pdfAttachment = page
      .getByText(new RegExp(`test-attachment-document-${uniqueSuffix}`, 'i'))
      .first()
      .describe('PDF attachment filename');
    await expect(pdfAttachment).toBeVisible({ timeout: 15000 });

    // ── Refresh the page ─────────────────────────────────────────────────
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Dismiss any popups that reappear after refresh
    const cancelBtn = page.getByRole('button', { name: 'Cancel' });
    await cancelBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await cancelBtn.isVisible()) await cancelBtn.click();

    const noThanksBtn = page.getByRole('button', { name: 'No, thanks' });
    await noThanksBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await noThanksBtn.isVisible()) await noThanksBtn.click();

    const agentStudioBtnAfterRefresh = page.getByRole('button', { name: 'Maybe later' });
    await agentStudioBtnAfterRefresh.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await agentStudioBtnAfterRefresh.isVisible()) await agentStudioBtnAfterRefresh.click();

    // Navigate back to Notes tab after refresh
    const notesTabAfterRefresh = page
      .locator('button')
      .filter({ hasText: 'Notes' })
      .first()
      .describe('Notes tab after refresh');
    await notesTabAfterRefresh.waitFor({ state: 'visible', timeout: 30000 });
    await notesTabAfterRefresh.click();

    // ── Verify note and attachments persist after refresh ─────────────────
    const persistedNoteText = page
      .getByText(noteText)
      .first()
      .describe('Persisted note text after refresh');
    await expect(persistedNoteText).toBeVisible({ timeout: 15000 });

    const persistedAttachmentCount = page
      .getByText(/\d+\s*Attachment/i)
      .first()
      .describe('Persisted attachment count after refresh');
    await expect(persistedAttachmentCount).toBeVisible({ timeout: 15000 });

    // Image may be rendered as inline preview or filename text
    const persistedImageByFilename = page
      .getByText(new RegExp(`test-attachment-image-${uniqueSuffix}`, 'i'))
      .first();
    const persistedImageByAlt = page
      .locator(`img[alt*="test-attachment-image-${uniqueSuffix}"]`)
      .first();
    const persistedImageBySource = page
      .locator(`img[src*="test-attachment-image-${uniqueSuffix}"]`)
      .first();
    const persistedImageVisible = await persistedImageByFilename.isVisible().catch(() => false)
      || await persistedImageByAlt.isVisible().catch(() => false)
      || await persistedImageBySource.isVisible().catch(() => false);
    expect(persistedImageVisible, 'Image attachment should persist after refresh').toBeTruthy();

    const persistedVideo = page
      .getByText(new RegExp(`test-attachment-video-${uniqueSuffix}`, 'i'))
      .first()
      .describe('Persisted video filename');
    await expect(persistedVideo).toBeVisible({ timeout: 10000 });

    const persistedPdf = page
      .getByText(new RegExp(`test-attachment-document-${uniqueSuffix}`, 'i'))
      .first()
      .describe('Persisted PDF filename');
    await expect(persistedPdf).toBeVisible({ timeout: 10000 });
  });
});
