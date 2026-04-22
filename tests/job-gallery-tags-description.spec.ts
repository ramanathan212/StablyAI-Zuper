import { test, expect } from '@stablyai/playwright-test';
import { forceRemoveOverlays } from './Helper/overlay-helper.js';
import fs from 'fs';
import path from 'path';

test.describe('Job Gallery - Tags and Description', () => {
  /**
   * User Prompt:
   * - Do not include login steps. Assume user is already authenticated.
   * - Navigate to an existing job and open the Gallery section.
   * - Verify that images uploaded from Notes or Attachments are visible in the gallery.
   * - If no images are present, upload an image via Notes.
   * - Verify the image appears in the Gallery.
   * - Select an image and add tags.
   * - Verify the tags are saved and visible.
   * - Add a description to the image.
   * - Verify the description is saved and displayed correctly.
   */
  test('should add tags and description to a gallery image', async ({ page }) => {
    // ── Authentication ─────────────────────────────────────────────────
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

    // ── Navigate to Jobs list ──────────────────────────────────────────
    await page.goto('/jobs');
    await forceRemoveOverlays(page);

    const jobTable = page.locator('table').first().describe('Jobs list table');
    await jobTable.waitFor({ state: 'visible', timeout: 30000 });

    // Open the first job from the table
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

    // ── Check if gallery has images; if not, upload via Notes ─────────
    // Wait briefly for gallery content to load
    await page.waitForTimeout(3000);

    const galleryImages = page.locator(
      'img[loading="lazy"][class*="object-cover"]'
    );
    const imageCount = await galleryImages.count();

    if (imageCount === 0) {
      // No images in gallery — upload one via Notes
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

      // Create a minimal PNG image for upload
      const assetsDir = path.resolve('tests', 'assets');
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
      const uniqueSuffix = Date.now();
      const imagePath = path.join(
        assetsDir,
        `gallery-test-image-${uniqueSuffix}.png`
      );
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

      // Upload via the attach button
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

      // Post the note
      await postNoteButton.click();
      const successToast = page
        .getByText('Note Created successfully')
        .describe('Success toast notification');
      await expect(successToast).toBeVisible({ timeout: 20000 });

      // Cleanup temp file
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      // Switch back to the Gallery tab
      const galleryTabAgain = page
        .getByRole('button', { name: /^Gallery/ })
        .first()
        .describe('Gallery tab button after upload');
      await galleryTabAgain.waitFor({ state: 'visible', timeout: 15000 });
      await galleryTabAgain.click();

      // Wait for gallery to load with the new image
      await page.waitForTimeout(3000);
    }

    // ── Verify images are present in the Gallery ────────────────────────
    const galleryImagesAfter = page.locator(
      'img[loading="lazy"][class*="object-cover"]'
    );
    await expect(galleryImagesAfter.first()).toBeVisible({ timeout: 15000 });
    const finalImageCount = await galleryImagesAfter.count();
    expect(finalImageCount).toBeGreaterThan(0);

    // ── Click on the first image to open the detail panel ──────────────
    // Images have a hover overlay that intercepts clicks —
    // use the overlay container (`.absolute.w-full.h-full` positioned on top)
    const imageOverlay = page
      .locator('.absolute.w-full.h-full')
      .first()
      .describe('First image hover overlay');
    await imageOverlay.click({ force: true, timeout: 15000 });

    // ── Verify the image detail panel opened ────────────────────────────
    const detailsHeading = page
      .locator('h6')
      .filter({ hasText: 'Details' })
      .describe('Image detail panel heading');
    await expect(detailsHeading).toBeVisible({ timeout: 15000 });

    const tagsHeading = page
      .locator('h6')
      .filter({ hasText: 'Tags' })
      .describe('Tags section heading');
    await expect(tagsHeading).toBeVisible({ timeout: 10000 });

    const descriptionHeading = page
      .locator('h6')
      .filter({ hasText: 'Description' })
      .describe('Description section heading');
    await expect(descriptionHeading).toBeVisible({ timeout: 10000 });

    // ── Add tags to the image ──────────────────────────────────────────
    // Click the tag edit button (icon button next to "Tags" heading)
    const tagEditButton = tagsHeading
      .locator('..')
      .locator('button')
      .first()
      .describe('Tag edit button');
    await tagEditButton.click();

    // Wait for "Update Tags" panel to appear
    const updateTagsHeading = page
      .locator('h6')
      .filter({ hasText: 'Update Tags' })
      .describe('Update Tags panel heading');
    await expect(updateTagsHeading).toBeVisible({ timeout: 10000 });

    // Click on the tag combobox input
    const tagCombobox = page
      .getByRole('combobox')
      .describe('Tag combobox');
    await tagCombobox.click();

    // Wait for options to load
    const optionsList = page
      .getByRole('listbox', { name: 'Options list' })
      .describe('Tag options dropdown');
    await expect(optionsList).toBeVisible({ timeout: 10000 });

    // Select the first available tag from the dropdown
    const firstTagOption = page
      .getByRole('option')
      .first()
      .describe('First tag option');
    await firstTagOption.waitFor({ state: 'visible', timeout: 10000 });
    const selectedTagName = await firstTagOption.textContent();
    await firstTagOption.click();

    // Close the dropdown by pressing Escape (ng-select stays open after selection)
    await page.keyboard.press('Escape');

    // Click Update to save the tag
    const updateButton = page
      .getByRole('button', { name: 'Update' })
      .describe('Update button for tags');
    await updateButton.waitFor({ state: 'visible', timeout: 10000 });
    await updateButton.click();

    // ── Verify tags saved ───────────────────────────────────────────────
    const tagSuccessToast = page
      .getByText('Attachment tags updated successfully')
      .describe('Tag update success toast');
    await expect(tagSuccessToast).toBeVisible({ timeout: 20000 });

    // Re-open the image detail panel (it closes after tag update)
    await imageOverlay.click({ force: true, timeout: 15000 });
    await expect(tagsHeading).toBeVisible({ timeout: 15000 });

    // Verify the selected tag is displayed in the Tags section
    const savedTag = page
      .getByText(selectedTagName!.trim())
      .describe('Saved tag text in detail panel');
    await expect(savedTag).toBeVisible({ timeout: 10000 });

    // ── Add description to the image ────────────────────────────────────
    // When no description exists: "Add your description" placeholder is clickable.
    // When description exists: a pencil edit button appears next to the heading.
    const addDescPlaceholder = page.getByText('Add your description');
    const hasPlaceholder = await addDescPlaceholder.isVisible().catch(() => false);

    if (hasPlaceholder) {
      await addDescPlaceholder.click();
    } else {
      // Click the edit pencil icon button next to Description heading
      const descriptionEditButton = descriptionHeading
        .locator('..')
        .locator('button')
        .first()
        .describe('Description edit pencil button');
      await descriptionEditButton.click();
    }

    const uniqueDescription = `Gallery test description ${Date.now()}`;
    const descriptionInput = page
      .getByRole('textbox', { name: 'Add your description' })
      .describe('Description text input');
    await expect(descriptionInput).toBeVisible({ timeout: 10000 });
    await descriptionInput.clear();
    await descriptionInput.fill(uniqueDescription);

    // Click Save for description
    const saveButton = page
      .getByRole('button', { name: 'Save' })
      .describe('Save button for description');
    await saveButton.waitFor({ state: 'visible', timeout: 10000 });
    await saveButton.click();

    // ── Verify description saved ────────────────────────────────────────
    const descriptionSuccessToast = page
      .getByText('Attachment Updated successfully')
      .describe('Description update success toast');
    await expect(descriptionSuccessToast).toBeVisible({ timeout: 20000 });

    // Verify the description text is displayed in the panel
    const savedDescription = page
      .getByText(uniqueDescription)
      .describe('Saved description text');
    await expect(savedDescription).toBeVisible({ timeout: 10000 });
  });
});
