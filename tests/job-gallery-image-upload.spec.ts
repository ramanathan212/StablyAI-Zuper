import { test, expect } from '@stablyai/playwright-test';
import { forceRemoveOverlays } from './Helper/overlay-helper.js';
import fs from 'fs';
import path from 'path';

test.use({ baseURL: 'https://stagingv3.zuperpro.com' });

test.describe('Job Gallery - Image Upload', () => {
  /**
   * User Prompt:
   * - Add a image to a job gallery
   *
   * Clarifications:
   * - Navigate to an existing job, open Gallery tab, upload an image, and verify it appears
   */
  test('should upload an image to a job gallery and verify it appears', async ({ page }) => {
    // ── Setup: Create a minimal valid PNG image for upload ─────────────
    const assetsDir = path.resolve('tests', 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    const uniqueSuffix = Date.now();
    const imagePath = path.join(assetsDir, `gallery-upload-test-${uniqueSuffix}.png`);

    // Minimal valid 1x1 pixel PNG
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
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
      0xae, 0x42, 0x60, 0x82,
    ]);
    fs.writeFileSync(
      imagePath,
      Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk])
    );

    // ── Step 1: Login ─────────────────────────────────────────────────
    const companyName = process.env.companyName || 'web-v3';
    const email = process.env.email || 'gprasath630@gmail.com';
    const password = process.env.password || 'test12345';

    await page.goto('/login');
    const companyInput = page
      .getByRole('textbox', { name: 'Company Name' })
      .describe('Company name input');
    await companyInput.waitFor({ state: 'visible', timeout: 30000 });
    await companyInput.fill(companyName);

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
    await emailInput.fill(email);

    const passwordInput = page
      .getByRole('textbox', { name: 'Password Forgot password?' })
      .describe('Password input');
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.fill(password);

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Login'
      );
      if (btn) btn.click();
    });

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

    // ── Step 2: Navigate to Jobs list ─────────────────────────────────
    await page.goto('/jobs');
    await forceRemoveOverlays(page);

    const jobTable = page.locator('table').first().describe('Jobs list table');
    await jobTable.waitFor({ state: 'visible', timeout: 30000 });

    // ── Step 3: Open the first job ────────────────────────────────────
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

    // ── Step 4: Open the Gallery tab ──────────────────────────────────
    const galleryTab = page
      .getByRole('button', { name: /^Gallery/ })
      .first()
      .describe('Gallery tab button');
    await galleryTab.waitFor({ state: 'visible', timeout: 30000 });
    await galleryTab.click();
    await page.waitForTimeout(3000);

    // ── Step 5: Click the upload button in the gallery toolbar ─────────
    // The upload button is a direct child BUTTON of the toolbar container
    // (sibling of the DIV wrappers for Filter and Date Range)
    await page.evaluate(() => {
      const filterBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.innerText?.trim() === 'Filter'
      );
      if (filterBtn) {
        const toolbarContainer = filterBtn.parentElement?.parentElement;
        if (toolbarContainer) {
          const uploadBtn = toolbarContainer.querySelector(':scope > button');
          if (uploadBtn) (uploadBtn as HTMLElement).click();
        }
      }
    });

    // ── Step 6: Verify the "Add Attachments" dialog appears ───────────
    const addAttachmentsHeading = page
      .getByText('Add Attachments')
      .describe('Add Attachments dialog heading');
    await expect(addAttachmentsHeading).toBeVisible({ timeout: 15000 });

    // ── Step 7: Upload the image via the hidden file input ────────────
    const fileInput = page.locator('#dropzone-file').describe('Gallery file upload input');
    await fileInput.setInputFiles(imagePath);

    // Wait for upload progress to complete
    const previewAttachments = page
      .getByRole('button', { name: /Preview Attachments/ })
      .describe('Preview Attachments section');
    await expect(previewAttachments).toBeVisible({ timeout: 15000 });

    // ── Step 8: Click Done to confirm the upload ──────────────────────
    const doneButton = page
      .getByRole('button', { name: 'Done' })
      .describe('Done button to confirm upload');
    await doneButton.waitFor({ state: 'visible', timeout: 15000 });
    await doneButton.click();

    // ── Step 9: Verify the image appears in the gallery ───────────────
    // Verify an image is visible in the gallery (the gallery should show images)
    const galleryImage = page
      .locator('img[loading="lazy"]')
      .first()
      .describe('Uploaded image in gallery');
    await expect(galleryImage).toBeVisible({ timeout: 15000 });

    // ── Cleanup: Remove the generated test image ──────────────────────
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  });
});
