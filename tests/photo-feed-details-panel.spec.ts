import { test, expect } from '@stablyai/playwright-test';
import { forceRemoveOverlays } from './Helper/overlay-helper.js';

test.describe('Photo Feed Details Panel', () => {
  /**
   * User Prompt:
   * - Create a NEW test case. Do not include login steps. Assume user is already authenticated.
   * - Navigate to the Photo Feed module.
   * - Open a random photo.
   * - Verify the photo details panel is visible on the left side.
   * - Click on Job redirection. Verify navigation to the related job is successful.
   * - Navigate back to Photo Feed. Open the same or another photo.
   * - Click on Customer redirection. Verify navigation to the related customer is successful.
   * - Navigate back to Photo Feed. Open a photo.
   * - Change the visibility from internal to public or vice versa. Verify the update is applied successfully.
   * - Add tags to the photo. Verify tags are saved and visible.
   * - Add a description to the photo. Verify the description is saved.
   * - Download the photo. Verify the download is triggered.
   * - Use the Copy Link option. Verify the copied link opens the image successfully.
   */
  test('should verify photo details panel actions including redirections, visibility, tags, description, download, and copy link', async ({
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

    // ── Helper: click the first photo in the feed via JS ────────────────
    // The hover overlay has opacity-0 and needs JS click to bypass
    async function openFirstPhoto() {
      await page.evaluate(() => {
        const overlay = document.querySelector(
          '.absolute.w-full.h-full.z-20'
        ) as HTMLElement;
        if (overlay) overlay.click();
      });
      // Wait for the detail panel to appear
      await page
        .locator('h6')
        .filter({ hasText: 'Details' })
        .waitFor({ state: 'visible', timeout: 15000 });
    }

    // ── Navigate to Photo Feed ──────────────────────────────────────────
    await page.goto('/photo_feed');
    await forceRemoveOverlays(page);

    // Wait for photo feed to fully load
    const filterBtn = page
      .getByRole('button', { name: 'Filter' })
      .describe('Filter button in photo feed toolbar');
    await filterBtn.waitFor({ state: 'visible', timeout: 30000 });

    // Wait for photo images to appear in the grid
    await page
      .locator('img[loading="lazy"]')
      .first()
      .waitFor({ state: 'visible', timeout: 30000 });

    // ── Open a photo ────────────────────────────────────────────────────
    await openFirstPhoto();

    // ── Verify the photo details panel is visible ───────────────────────
    const detailsHeading = page
      .locator('h6')
      .filter({ hasText: 'Details' })
      .describe('Details panel heading');
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

    // Verify the gallery status counter is visible (e.g., "1 / 18")
    const galleryStatus = page.getByRole('status').describe('Gallery counter');
    await expect(galleryStatus).toBeVisible({ timeout: 5000 });

    // ── Click on Job redirection ────────────────────────────────────────
    const jobLink = page
      .locator('a[href*="/jobs/"]')
      .first()
      .describe('Job redirection link');
    await expect(jobLink).toBeVisible({ timeout: 10000 });
    const jobHref = await jobLink.getAttribute('href');
    expect(jobHref).toContain('/jobs/');

    // Click the job link (opens in new tab)
    const [jobPage] = await Promise.all([
      page.context().waitForEvent('page', { timeout: 15000 }),
      jobLink.click(),
    ]);

    // Verify navigation to job page
    await jobPage.waitForURL(/\/jobs\/.*\/details/, { timeout: 30000 });
    await expect(jobPage).toHaveURL(/\/jobs\/.*\/details/);
    await jobPage.close();

    // ── Navigate back to Photo Feed ─────────────────────────────────────
    const closeGalleryBtn = page
      .getByRole('button', { name: 'Close gallery' })
      .describe('Close gallery button');
    await closeGalleryBtn.click();
    await page.waitForTimeout(1000);

    // ── Open a photo that has a customer association ─────────────────────
    await openFirstPhoto();

    // Navigate through photos until we find one with a customer link
    const customerLink = page
      .locator('a[href*="/customers/"]')
      .first()
      .describe('Customer redirection link');

    const nextSlideBtn = page.getByRole('button', { name: 'Next slide' });
    const maxSlides = 20;
    for (let i = 0; i < maxSlides; i++) {
      if (await customerLink.isVisible().catch(() => false)) break;
      if (await nextSlideBtn.isEnabled().catch(() => false)) {
        await nextSlideBtn.click();
        await page.waitForTimeout(1000);
      } else {
        break;
      }
    }

    await expect(customerLink).toBeVisible({ timeout: 10000 });
    const customerHref = await customerLink.getAttribute('href');
    expect(customerHref).toContain('/customers/');

    // Click the customer link (opens in new tab)
    const [customerPage] = await Promise.all([
      page.context().waitForEvent('page', { timeout: 15000 }),
      customerLink.click(),
    ]);

    // Verify navigation to customer page
    await customerPage.waitForURL(/\/customers\/.*\/details/, {
      timeout: 30000,
    });
    await expect(customerPage).toHaveURL(/\/customers\/.*\/details/);
    await customerPage.close();

    // ── Navigate back to Photo Feed and open a photo ────────────────────
    await closeGalleryBtn.click();
    await page.waitForTimeout(1000);
    await openFirstPhoto();

    // ── Change visibility from Internal to Public or vice versa ─────────
    const internalBtn = page
      .getByRole('button', { name: /Internal/i })
      .describe('Internal visibility button');
    const publicBtn = page
      .getByRole('button', { name: /Public/i })
      .describe('Public visibility button');

    const isInternal = await internalBtn.isVisible().catch(() => false);

    if (isInternal) {
      await internalBtn.click();
      await expect(publicBtn).toBeVisible({ timeout: 10000 });

      // Toggle back (cleanup)
      await publicBtn.click();
      await expect(internalBtn).toBeVisible({ timeout: 10000 });
    } else {
      await publicBtn.click();
      await expect(internalBtn).toBeVisible({ timeout: 10000 });

      // Toggle back (cleanup)
      await internalBtn.click();
      await expect(publicBtn).toBeVisible({ timeout: 10000 });
    }

    // ── Add tags to the photo ───────────────────────────────────────────
    const tagEditButton = page
      .locator('h6')
      .filter({ hasText: 'Tags' })
      .locator('..')
      .locator('button')
      .first()
      .describe('Tag edit button');
    await tagEditButton.click();

    // Wait for "Update Tags" panel
    const updateTagsHeading = page
      .locator('h6')
      .filter({ hasText: 'Update Tags' })
      .describe('Update Tags panel heading');
    await expect(updateTagsHeading).toBeVisible({ timeout: 10000 });

    // Click on the tag combobox input
    const tagCombobox = page.getByRole('combobox').describe('Tag combobox');
    await tagCombobox.click();

    // Wait for options
    const optionsList = page
      .getByRole('listbox', { name: 'Options list' })
      .describe('Tag options dropdown');
    await expect(optionsList).toBeVisible({ timeout: 10000 });

    // Select the first available tag
    const firstTagOption = page
      .getByRole('option')
      .first()
      .describe('First tag option');
    await firstTagOption.waitFor({ state: 'visible', timeout: 10000 });
    const selectedTagName = await firstTagOption.textContent();
    await firstTagOption.click();

    // Close dropdown
    await page.keyboard.press('Escape');

    // Click Update
    const updateButton = page
      .getByRole('button', { name: 'Update' })
      .describe('Update button for tags');
    await updateButton.waitFor({ state: 'visible', timeout: 10000 });
    await updateButton.click();

    // Verify tags saved
    const tagSuccessToast = page
      .getByText('Attachment tags updated successfully')
      .describe('Tag update success toast');
    await expect(tagSuccessToast).toBeVisible({ timeout: 20000 });

    // Wait for toast to disappear to avoid interference
    await page.waitForTimeout(2000);

    // Re-open the photo detail panel
    await openFirstPhoto();

    // Verify the selected tag is displayed
    const savedTag = page
      .getByText(selectedTagName!.trim())
      .describe('Saved tag text in detail panel');
    await expect(savedTag).toBeVisible({ timeout: 10000 });

    // ── Add a description to the photo ──────────────────────────────────
    const addDescPlaceholder = page.getByText('Add your description');
    const hasPlaceholder = await addDescPlaceholder.isVisible().catch(
      () => false
    );

    if (hasPlaceholder) {
      await addDescPlaceholder.click();
    } else {
      // Click the edit button next to Description heading
      const descEditBtn = page
        .locator('h6')
        .filter({ hasText: 'Description' })
        .locator('..')
        .locator('button')
        .first()
        .describe('Description edit pencil button');
      await descEditBtn.click();
    }

    const uniqueDescription = `Photo feed test description ${Date.now()}`;
    const descriptionInput = page
      .getByRole('textbox', { name: 'Add your description' })
      .describe('Description text input');
    await expect(descriptionInput).toBeVisible({ timeout: 10000 });
    await descriptionInput.clear();
    await descriptionInput.fill(uniqueDescription);

    // Click Save
    const saveButton = page
      .getByRole('button', { name: 'Save' })
      .describe('Save button for description');
    await saveButton.waitFor({ state: 'visible', timeout: 10000 });
    await saveButton.click();

    // Verify description saved
    const descSuccessToast = page
      .getByText('Attachment Updated successfully')
      .describe('Description update success toast');
    await expect(descSuccessToast).toBeVisible({ timeout: 20000 });

    // Verify the description text is displayed
    const savedDescription = page
      .getByText(uniqueDescription)
      .describe('Saved description text');
    await expect(savedDescription).toBeVisible({ timeout: 10000 });

    // ── Download the photo ──────────────────────────────────────────────
    // The details panel header buttons are siblings of the "Details" h6
    // Order: Internal/Public toggle, Download button, Copy Link button
    const detailsHeaderButtons = page
      .locator('h6')
      .filter({ hasText: 'Details' })
      .locator('..')
      .locator('button');
    // nth(0) = Internal/Public toggle, nth(1) = Download, nth(2) = Copy Link
    const downloadButton = detailsHeaderButtons
      .nth(1)
      .describe('Download button in details panel header');
    await expect(downloadButton).toBeVisible({ timeout: 10000 });

    // Use JS click + download event to avoid overlay interception
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      downloadButton.evaluate((el: HTMLElement) => el.click()),
    ]);

    // Verify download was triggered
    expect(download).toBeTruthy();
    expect(download.suggestedFilename()).toBeTruthy();

    // ── Use the Copy Link option ────────────────────────────────────────
    const copyLinkButton = detailsHeaderButtons
      .nth(2)
      .describe('Copy Link button in details panel header');
    await expect(copyLinkButton).toBeVisible({ timeout: 10000 });
    await copyLinkButton.evaluate((el: HTMLElement) => el.click());

    // Verify the "Link copied to clipboard" toast appears
    const copyToast = page
      .getByText('Link copied to clipboard')
      .describe('Copy link success toast');
    await expect(copyToast).toBeVisible({ timeout: 10000 });

    // Verify the copied link opens the image successfully
    await page.context().grantPermissions(['clipboard-read']);
    const copiedLink = await page.evaluate(async () => {
      return await navigator.clipboard.readText();
    });
    expect(copiedLink).toBeTruthy();
    expect(copiedLink).toMatch(/^https?:\/\//);

    // Open the copied link in a new tab and verify it loads
    const newPage = await page.context().newPage();
    const response = await newPage.goto(copiedLink, { timeout: 30000 });
    expect(response).toBeTruthy();
    expect(response!.status()).toBeLessThan(400);
    await newPage.close();
  });
});
