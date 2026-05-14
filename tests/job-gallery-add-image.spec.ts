import { test, expect } from '@stablyai/playwright-test';
import { forceRemoveOverlays } from './Helper/overlay-helper.js';
import fs from 'fs';
import path from 'path';

test.describe('Job Gallery - Add Image', () => {
  /**
   * User Prompt:
   * - Go to Job gallery and add a image
   */
  test('should navigate to job gallery and add an image', async ({ page }) => {
    // ── Authentication ─────────────────────────────────────────────────
    await page.goto('/login');
    const companyInput = page
      .getByRole('textbox', { name: 'Company Name' })
      .describe('Company name input');
    await companyInput.waitFor({ state: 'visible', timeout: 30000 });
    await companyInput.fill(process.env.companyName!);

    await page
      .getByRole('button', { name: 'Continue' })
      .describe('Continue button')
      .click();

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

    await page
      .getByRole('button', { name: 'Login', exact: true })
      .describe('Login button')
      .click();

    await page.waitForURL('**/dashboard', { timeout: 45000 });

    // Dismiss popups
    const tzCancelBtn = page.getByRole('button', { name: 'Cancel' });
    await tzCancelBtn
      .waitFor({ state: 'visible', timeout: 5000 })
      .catch(() => {});
    if (await tzCancelBtn.isVisible()) await tzCancelBtn.click();

    const notifBtn = page.getByRole('button', { name: 'No, thanks' });
    await notifBtn
      .waitFor({ state: 'visible', timeout: 5000 })
      .catch(() => {});
    if (await notifBtn.isVisible()) await notifBtn.click();

    // ── Navigate to Jobs list and open the first job ───────────────────
    await page.goto('/jobs');
    await forceRemoveOverlays(page);

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

    // ── Open the Gallery tab ──────────────────────────────────────────
    const galleryTab = page
      .getByRole('button', { name: /^Gallery/ })
      .first()
      .describe('Gallery tab button');
    await galleryTab.waitFor({ state: 'visible', timeout: 30000 });
    await galleryTab.click();

    // Wait for gallery content to load
    await page.waitForTimeout(3000);

    // ── Record baseline image count ──────────────────────────────────
    const galleryImages = page.locator(
      'img[loading="lazy"][class*="object-cover"]'
    );
    const baselineCount = await galleryImages.count();

    // ── Upload an image via Notes section ─────────────────────────────
    const notesTab = page
      .getByRole('button', { name: /^Notes/ })
      .first()
      .describe('Notes tab button');
    await notesTab.waitFor({ state: 'visible', timeout: 15000 });
    await notesTab.click();

    const noteEditorButton = page
      .getByRole('button', { name: 'Enter your notes here...' })
      .describe('Note editor placeholder');
    await noteEditorButton.waitFor({ state: 'visible', timeout: 15000 });
    await noteEditorButton.click();

    const postNoteButton = page
      .getByRole('button', { name: 'Post Note' })
      .describe('Post Note button');
    await expect(postNoteButton).toBeVisible({ timeout: 10000 });

    // Create a minimal valid PNG image for upload
    const assetsDir = path.resolve('tests', 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    const uniqueSuffix = Date.now();
    const imagePath = path.join(
      assetsDir,
      `gallery-add-image-test-${uniqueSuffix}.png`
    );

    // Minimal 1x1 RGB PNG
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const ihdrChunk = Buffer.from([
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
      0x77, 0x53, 0xde,
    ]);
    const idatChunk = Buffer.from([
      0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62,
      0x60, 0x60, 0xf8, 0x0f, 0x00, 0x00, 0x03, 0x00, 0x01, 0x34, 0x7e,
      0x49, 0x31,
    ]);
    const iendChunk = Buffer.from([
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60,
      0x82,
    ]);
    fs.writeFileSync(
      imagePath,
      Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk])
    );

    // Click the attachment button and upload the image
    const attachButton = page
      .getByTestId('notes_attachment-button')
      .describe('Attach file button');
    await expect(attachButton).toBeVisible({ timeout: 10000 });

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 15000 }),
      attachButton.click(),
    ]);
    await fileChooser.setFiles(imagePath);
    await page.waitForTimeout(3000);

    // Post the note with the attached image
    await postNoteButton.click();

    // Verify success toast appears
    const successToast = page
      .getByText('Note Created successfully')
      .describe('Note creation success toast');
    await expect(successToast).toBeVisible({ timeout: 20000 });

    // Cleanup temp image file
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // ── Navigate back to Gallery tab ──────────────────────────────────
    const galleryTabAgain = page
      .getByRole('button', { name: /^Gallery/ })
      .first()
      .describe('Gallery tab button after upload');
    await galleryTabAgain.waitFor({ state: 'visible', timeout: 15000 });
    await galleryTabAgain.click();

    // Wait for gallery to load with the new image
    await page.waitForTimeout(3000);

    // ── Verify the image was added to the gallery ──────────────────────
    const galleryImagesAfter = page.locator(
      'img[loading="lazy"][class*="object-cover"]'
    );
    await expect(galleryImagesAfter.first()).toBeVisible({ timeout: 15000 });

    const newCount = await galleryImagesAfter.count();
    expect(newCount).toBeGreaterThan(baselineCount);
  });
});
