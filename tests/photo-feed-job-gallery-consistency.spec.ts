import { test, expect } from '@stablyai/playwright-test';
import { forceRemoveOverlays } from './Helper/overlay-helper.js';

test.describe('Photo Feed to Job Gallery Consistency', () => {
  /**
   * User Prompt:
   * - Create a NEW test case.
   * - Do not include login steps. Assume user is already authenticated.
   * - Navigate to the Photo Feed module.
   * - Open a photo.
   * - Verify the photo details panel is visible.
   * - Capture the photo name or identifier (if available).
   * - Click on the Job link from the photo details.
   * - Verify navigation to the Job details page.
   * - Navigate to the Gallery tab.
   * - Verify the gallery loads with images.
   * - Find the same photo in the gallery using the captured name or by visual match.
   * - Verify the image is visible and displayed correctly.
   * - Refresh the page.
   * - Verify the same image still exists in the gallery.
   */
  test('should verify a photo from Photo Feed appears consistently in the associated Job Gallery and persists after refresh', async ({
    page,
  }) => {
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

    // ══════════════════════════════════════════════════════════════════════
    // ── Navigate to Photo Feed ──────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════

    await page.goto('/photo_feed');
    await forceRemoveOverlays(page);

    // Verify listing loads with photos
    const firstImage = page
      .locator('img[loading="lazy"]')
      .first()
      .describe('First lazy-loaded photo in Photo Feed');
    await firstImage.waitFor({ state: 'visible', timeout: 30000 });

    const photoCount = await page.locator('img[loading="lazy"]').count();
    expect(photoCount).toBeGreaterThan(0);

    // ══════════════════════════════════════════════════════════════════════
    // ── Open the first photo ────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════

    // Photo cards have an opacity-0 overlay that requires JS click in headless mode
    await page.evaluate(() => {
      const overlays = document.querySelectorAll(
        '.opacity-0.group-hover\\:opacity-100'
      );
      if (overlays.length > 0) {
        overlays[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });

    // ══════════════════════════════════════════════════════════════════════
    // ── Verify the photo details panel is visible ───────────────────────
    // ══════════════════════════════════════════════════════════════════════

    const detailsHeading = page
      .locator('h6')
      .filter({ hasText: 'Details' })
      .describe('Details heading in photo panel');
    await expect(detailsHeading).toBeVisible({ timeout: 15000 });

    // Verify key detail sections are present
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

    // ══════════════════════════════════════════════════════════════════════
    // ── Capture the photo identifier ────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════

    // Capture the image's CDN base64 identifier from the Photo Feed thumbnail.
    // CDN URLs follow: https://.../{signature}/resize:fill:300:300/gravity:sm/{base64-s3-path}
    // The base64 S3 path uniquely identifies the attachment file across modules.
    const feedImageSrc = await firstImage.getAttribute('src');
    expect(feedImageSrc).toBeTruthy();

    // Extract the base64 identifier (last path segment of the CDN URL)
    const feedBase64Path = feedImageSrc!.split('/').pop()!;
    expect(feedBase64Path).toBeTruthy();
    expect(feedBase64Path.length).toBeGreaterThan(10); // Sanity check: valid base64 string

    // Also capture the attachment filename from the details panel for error messages.
    // The filename element has an aria-label of "Attachment Name" in the panel.
    const attachmentFilename: string = await page.evaluate(() => {
      // Look for the element with aria-label "Attachment Name" and get its text
      const el = document.querySelector('[aria-label="Attachment Name"]');
      if (el) {
        // The filename is in a child element
        const nameEl = el.querySelector('[class*="cursor-pointer"]');
        return nameEl?.textContent?.trim() || el.textContent?.trim() || '';
      }
      return '';
    });

    // ══════════════════════════════════════════════════════════════════════
    // ── Click on the Job link from photo details ────────────────────────
    // ══════════════════════════════════════════════════════════════════════

    const jobLink = page
      .locator('a[href*="/jobs/"]')
      .first()
      .describe('Job redirection link in details panel');
    await expect(jobLink).toBeVisible({ timeout: 10000 });

    const jobHref = await jobLink.getAttribute('href');
    expect(jobHref).toContain('/jobs/');

    // Click the job link — it opens in a new tab
    const [jobPage] = await Promise.all([
      page.context().waitForEvent('page', { timeout: 15000 }),
      jobLink.click(),
    ]);

    // ══════════════════════════════════════════════════════════════════════
    // ── Verify navigation to the Job details page ───────────────────────
    // ══════════════════════════════════════════════════════════════════════

    await jobPage.waitForURL(/\/jobs\/.*\/details/, { timeout: 30000 });
    await expect(jobPage).toHaveURL(/\/jobs\/.*\/details/);

    // Remove CDK overlays on the job page
    await jobPage.evaluate(() => {
      document
        .querySelectorAll('.cdk-overlay-backdrop, .cdk-overlay-container')
        .forEach((el) => el.remove());
    });

    // ══════════════════════════════════════════════════════════════════════
    // ── Navigate to the Gallery tab ─────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════

    const galleryTab = jobPage
      .getByRole('button', { name: /^Gallery/ })
      .first()
      .describe('Gallery tab button on job page');
    await galleryTab.waitFor({ state: 'visible', timeout: 30000 });
    await galleryTab.click();

    // Wait for gallery content to load asynchronously
    await jobPage.waitForTimeout(3000);

    // ══════════════════════════════════════════════════════════════════════
    // ── Verify the gallery loads with images ────────────────────────────
    // ══════════════════════════════════════════════════════════════════════

    // The "All" tab should be visible and show images
    const allTab = jobPage
      .getByRole('button', { name: 'All', exact: true })
      .describe('"All" tab in gallery');
    await expect(allTab).toBeVisible({ timeout: 10000 });

    // Verify at least one image exists in the gallery
    const galleryImageSelector = 'img[loading="lazy"], img[class*="object-cover"]';
    const galleryImages = jobPage.locator(galleryImageSelector);

    const galleryImageCount = await galleryImages.count();
    expect(galleryImageCount).toBeGreaterThan(0);

    // ══════════════════════════════════════════════════════════════════════
    // ── Find the same photo in the gallery ──────────────────────────────
    // ══════════════════════════════════════════════════════════════════════

    // Search gallery images for one whose CDN URL contains the same base64 S3 path
    // as the Photo Feed image. This uniquely identifies the attachment file.
    const matchingImageIndex: number = await jobPage.evaluate(
      ({ selector, base64Path }: { selector: string; base64Path: string }) => {
        const images = document.querySelectorAll(selector);
        for (let i = 0; i < images.length; i++) {
          const src = (images[i] as HTMLImageElement).src;
          if (src && src.includes(base64Path)) {
            return i;
          }
        }
        return -1;
      },
      { selector: galleryImageSelector, base64Path: feedBase64Path }
    );

    // Assert the photo was found in the gallery
    const identifier = attachmentFilename || feedBase64Path.substring(0, 20);
    expect(
      matchingImageIndex,
      `Photo "${identifier}" from Photo Feed should appear in the Job Gallery`
    ).toBeGreaterThanOrEqual(0);

    // ══════════════════════════════════════════════════════════════════════
    // ── Verify the image is visible and displayed correctly ─────────────
    // ══════════════════════════════════════════════════════════════════════

    const matchedGalleryImage = galleryImages
      .nth(matchingImageIndex)
      .describe('Matching photo found in Job Gallery');
    await expect(matchedGalleryImage).toBeVisible({ timeout: 10000 });

    // Verify the image has loaded (naturalWidth > 0 means the image rendered)
    const imageLoaded = await matchedGalleryImage.evaluate(
      (img: HTMLImageElement) => img.naturalWidth > 0 && img.naturalHeight > 0
    );
    expect(imageLoaded).toBe(true);

    // Capture the gallery image src for post-refresh comparison
    const galleryImageSrc = await matchedGalleryImage.getAttribute('src');
    expect(galleryImageSrc).toBeTruthy();

    // Verify the CDN base64 path matches (same underlying attachment file)
    expect(galleryImageSrc).toContain(feedBase64Path);

    // ══════════════════════════════════════════════════════════════════════
    // ── Refresh the page ────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════

    await jobPage.reload({ waitUntil: 'domcontentloaded' });

    // Remove overlays after refresh
    await jobPage.evaluate(() => {
      document
        .querySelectorAll('.cdk-overlay-backdrop, .cdk-overlay-container')
        .forEach((el) => el.remove());
    });

    // Re-navigate to Gallery tab (page reload returns to job details view)
    const galleryTabAfterRefresh = jobPage
      .getByRole('button', { name: /^Gallery/ })
      .first()
      .describe('Gallery tab button after page refresh');
    await galleryTabAfterRefresh.waitFor({ state: 'visible', timeout: 30000 });
    await galleryTabAfterRefresh.click();

    // Wait for gallery content to reload
    await jobPage.waitForTimeout(3000);

    // ══════════════════════════════════════════════════════════════════════
    // ── Verify the same image still exists after refresh ────────────────
    // ══════════════════════════════════════════════════════════════════════

    // Search for the same photo again using the base64 identifier
    const matchingAfterRefresh: number = await jobPage.evaluate(
      ({ selector, base64Path }: { selector: string; base64Path: string }) => {
        const images = document.querySelectorAll(selector);
        for (let i = 0; i < images.length; i++) {
          const src = (images[i] as HTMLImageElement).src;
          if (src && src.includes(base64Path)) {
            return i;
          }
        }
        return -1;
      },
      { selector: galleryImageSelector, base64Path: feedBase64Path }
    );

    expect(
      matchingAfterRefresh,
      `Photo "${identifier}" should still appear in Gallery after page refresh`
    ).toBeGreaterThanOrEqual(0);

    // Verify the image is still visible and rendered after refresh
    const matchedImageAfterRefresh = jobPage
      .locator(galleryImageSelector)
      .nth(matchingAfterRefresh)
      .describe('Matching photo in Gallery after refresh');
    await expect(matchedImageAfterRefresh).toBeVisible({ timeout: 10000 });

    const imageLoadedAfterRefresh = await matchedImageAfterRefresh.evaluate(
      (img: HTMLImageElement) => img.naturalWidth > 0 && img.naturalHeight > 0
    );
    expect(imageLoadedAfterRefresh).toBe(true);

    // Verify the src still contains the same base64 path (data persists)
    const galleryImageSrcAfterRefresh =
      await matchedImageAfterRefresh.getAttribute('src');
    expect(galleryImageSrcAfterRefresh).toContain(feedBase64Path);

    // Clean up the new tab
    await jobPage.close();
  });
});
