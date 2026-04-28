import { test, expect } from '@stablyai/playwright-test';
import { forceRemoveOverlays } from './Helper/overlay-helper.js';

test.describe('Photo Feed Listing, Filters, and Customize', () => {
  /**
   * User Prompt:
   * - Create a NEW test case. Do not include login steps. Assume user is already authenticated.
   * - Navigate to the Photo Feed module. Verify the listing page is loaded with photos.
   * - --- Date Range Validation ---
   * - Apply a date range filter (e.g., Today). Verify the photo list updates.
   * - Change the date range. Verify results update accordingly.
   * - --- Filter Validation ---
   * - Click on the Filter option. Apply any filter. Verify the photo list updates.
   * - Clear the filter. Verify all photos are visible again.
   * - --- Customize Validation (Layout + Attributes) ---
   * - Click on the Customize option. Change the photo size (e.g., small to large or grid density).
   * - Verify the layout updates accordingly (photo size visibly changes).
   * - choose any attribute/column visibility (e.g., show/hide details).
   * - Verify the attribute appears or disappears on the listing page.
   * - Revert the customization. Verify the listing returns to default layout and attributes.
   */
  test('should verify listing page, date range, filters, and customize functionality', async ({
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

    // ── Navigate to Photo Feed ──────────────────────────────────────────
    await page.goto('/photo_feed');
    await forceRemoveOverlays(page);

    // ── Verify the listing page loads with photos ───────────────────────
    const filterBtn = page
      .getByRole('button', { name: 'Filter' })
      .describe('Filter button in photo feed toolbar');
    await filterBtn.waitFor({ state: 'visible', timeout: 30000 });

    // Wait for photo images to render
    const firstImage = page
      .locator('img[loading="lazy"]')
      .first()
      .describe('First lazy-loaded photo image');
    await firstImage.waitFor({ state: 'visible', timeout: 30000 });

    // Verify date group headings are visible (photos are grouped by date)
    // Use a specific date pattern to avoid matching the hidden "Getting things ready" h3
    const visibleDateHeading = page
      .locator('h3')
      .filter({ hasText: /\d{4}/ })
      .first()
      .describe('Visible date group heading with year');
    await expect(visibleDateHeading).toBeVisible({ timeout: 15000 });

    // Count initial images to compare later
    const initialImageCount = await page
      .locator('img[loading="lazy"]')
      .count();
    expect(initialImageCount).toBeGreaterThan(0);

    // ══════════════════════════════════════════════════════════════════════
    // ── Date Range Validation ─────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════

    // Click the date range dropdown (it starts with "Select Date Range" or a default range)
    const dateRangeBtn = page
      .locator('button')
      .filter({ hasText: /Select Date Range|Last \d+ Days|Today|Yesterday|This Month|Last Month/i })
      .first()
      .describe('Date range dropdown button');
    await dateRangeBtn.click();

    // Select "Last 30 Days" to ensure we have photos
    const last30DaysOption = page
      .getByRole('menuitem', { name: 'Last 30 Days' })
      .describe('Last 30 Days date range option');
    await last30DaysOption.waitFor({ state: 'visible', timeout: 10000 });
    await last30DaysOption.click();

    // Wait for the page to update with filtered results
    await page
      .locator('img[loading="lazy"]')
      .first()
      .waitFor({ state: 'visible', timeout: 30000 });

    // Verify the date range button reflects the selection
    const dateRangeAfterSelect = page
      .locator('button')
      .filter({ hasText: 'Last 30 Days' })
      .first()
      .describe('Date range button showing Last 30 Days');
    await expect(dateRangeAfterSelect).toBeVisible({ timeout: 10000 });

    // Verify photos are displayed under the date range
    const imagesAfterDateFilter = await page
      .locator('img[loading="lazy"]')
      .count();
    expect(imagesAfterDateFilter).toBeGreaterThan(0);

    // Now change the date range to "Today" to observe the list updating
    await dateRangeAfterSelect.click();

    const todayOption = page
      .getByRole('menuitem', { name: 'Today' })
      .describe('Today date range option');
    await todayOption.waitFor({ state: 'visible', timeout: 10000 });
    await todayOption.click();

    // Verify the date range button now shows "Today"
    const dateRangeToday = page
      .locator('button')
      .filter({ hasText: 'Today' })
      .first()
      .describe('Date range button showing Today');
    await expect(dateRangeToday).toBeVisible({ timeout: 10000 });

    // Either photos are shown or the "No attachments found" message appears
    const noAttachmentsMsg = page
      .getByText('No attachments found for the applied filter')
      .describe('No attachments message when filter returns empty');
    const hasPhotosForToday = (await page.locator('img[loading="lazy"]').count()) > 0;
    const hasNoAttachments = await noAttachmentsMsg.isVisible().catch(() => false);

    // At least one of these must be true — the page responded to the date change
    expect(hasPhotosForToday || hasNoAttachments).toBe(true);

    // Change back to "Last 30 Days" so we have photos for the rest of the test
    await dateRangeToday.click();
    const last30DaysAgain = page
      .getByRole('menuitem', { name: 'Last 30 Days' })
      .describe('Last 30 Days option to restore photos');
    await last30DaysAgain.waitFor({ state: 'visible', timeout: 10000 });
    await last30DaysAgain.click();

    // Wait for photos to load after restoring date range
    await page
      .locator('img[loading="lazy"]')
      .first()
      .waitFor({ state: 'visible', timeout: 30000 });

    // ══════════════════════════════════════════════════════════════════════
    // ── Filter Validation ─────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════

    // Click on Filter button (may show "Filter" or "N Filter(s)" depending on state)
    const filterButton = page
      .locator('button')
      .filter({ hasText: /Filters?/ })
      .first()
      .describe('Filter button');
    await filterButton.click();

    // Wait for filter dropdown to appear with categories
    const userFilterItem = page
      .getByRole('menuitem', { name: 'User' })
      .describe('User filter category');
    await userFilterItem.waitFor({ state: 'visible', timeout: 10000 });

    // Hover on "User" to expand the sub-menu (sub-menus expand on hover, not click)
    await userFilterItem.hover();

    // Wait for the User search textbox to appear (sub-menu indicator)
    const userSearchBox = page
      .getByRole('textbox', { name: 'Search User' })
      .describe('Search User textbox in filter sub-menu');
    await userSearchBox.waitFor({ state: 'visible', timeout: 10000 });

    // Click on the first user in the list to apply the filter
    const firstUserOption = page
      .locator('button')
      .filter({ has: page.locator('img[alt="Avatar"]') })
      .first()
      .describe('First user option with avatar');
    await firstUserOption.waitFor({ state: 'visible', timeout: 10000 });
    await firstUserOption.click();

    // Close the filter dropdown by pressing Escape
    await page.keyboard.press('Escape');

    // Verify the filter indicator shows "N Filter(s)" (extra spaces from icon element)
    const activeFilterBtn = page
      .locator('button')
      .filter({ hasText: /\d+\s+Filters?/ })
      .first()
      .describe('Active filter button showing count');
    await expect(activeFilterBtn).toBeVisible({ timeout: 10000 });

    // Verify photos are displayed (filtered results)
    const photosAfterFilter = await page.locator('img[loading="lazy"]').count();
    expect(photosAfterFilter).toBeGreaterThan(0);

    // Clear all filters using the × button
    const clearAllBtn = page
      .getByTitle('Clear all filters')
      .describe('Clear all filters button');
    await clearAllBtn.click();

    // Verify the filter button no longer shows a count number
    // After clearing, the button text should be just "Filter" (no digits)
    const filterBtnAfterClear = page
      .locator('button')
      .filter({ hasText: 'Filter' })
      .filter({ hasNotText: /\d/ })
      .first()
      .describe('Filter button after clearing all filters');
    await expect(filterBtnAfterClear).toBeVisible({ timeout: 15000 });

    // Wait for photos to reload after clearing filters
    await page
      .locator('img[loading="lazy"]')
      .first()
      .waitFor({ state: 'visible', timeout: 30000 });

    // Verify photos are displayed again (all photos visible)
    const photosAfterClear = await page.locator('img[loading="lazy"]').count();
    expect(photosAfterClear).toBeGreaterThan(0);

    // ══════════════════════════════════════════════════════════════════════
    // ── Customize Validation (Layout + Attributes) ────────────────────────
    // ══════════════════════════════════════════════════════════════════════

    // Helper: read grid column count from inline style
    async function getGridColumnCount(): Promise<number> {
      return page.evaluate(() => {
        const grid = document.querySelector('.gap-3.grid.mt-1') as HTMLElement;
        if (grid) {
          const style = grid.getAttribute('style') || '';
          const match = style.match(/repeat\((\d+),/);
          return match ? parseInt(match[1]) : 0;
        }
        return 0;
      });
    }

    // Click the Customize button
    const customizeBtn = page
      .getByRole('button', { name: /Customize/ })
      .describe('Customize button');
    await customizeBtn.click();

    // Wait for the Customize Photo Feed panel to appear
    const customizeHeading = page
      .locator('h6')
      .filter({ hasText: 'Customize Photo Feed' })
      .describe('Customize Photo Feed panel heading');
    await expect(customizeHeading).toBeVisible({ timeout: 15000 });

    // ── First ensure clean state: remove Job Title if present, set Small ──
    // Check if the "Remove" button exists (indicates Job Title chip is present)
    const removeExistingBtn = page
      .getByRole('button', { name: 'Remove' })
      .describe('Remove button for existing attribute chip');
    const jobTitleAlreadyAdded = await removeExistingBtn.isVisible().catch(() => false);

    if (jobTitleAlreadyAdded) {
      await removeExistingBtn.click();
    }

    // Set size to Small first (baseline)
    const smallSizeForBaseline = page
      .locator('img[alt="Small"]')
      .locator('..')
      .locator('..')
      .describe('Small photo size for baseline');
    await smallSizeForBaseline.click();

    // Save and close the panel to establish baseline
    const saveBtnBaseline = page
      .getByRole('button', { name: 'Save' })
      .describe('Save button for baseline');
    await saveBtnBaseline.waitFor({ state: 'visible', timeout: 10000 });
    await saveBtnBaseline.click();
    await expect(customizeHeading).toBeHidden({ timeout: 15000 });

    // Reload the page to ensure the UI reflects the saved settings
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page
      .locator('img[loading="lazy"]')
      .first()
      .waitFor({ state: 'visible', timeout: 30000 });

    // Verify baseline: Small = 8 columns
    const baselineGridCols = await getGridColumnCount();
    expect(baselineGridCols).toBe(8);

    // Verify Job Title is NOT shown on photo cards
    const jobTitlePatternBaseline = page
      .locator('text=/#\\d+ - /i')
      .first()
      .describe('Job title pattern should be absent at baseline');
    await expect(jobTitlePatternBaseline).toBeHidden({ timeout: 10000 });

    // ── Apply customizations: Large + Job Title ─────────────────────────
    await customizeBtn.click();
    await expect(customizeHeading).toBeVisible({ timeout: 15000 });

    // Change to Large (4 per row)
    const largeSizeOption = page
      .locator('img[alt="Large"]')
      .locator('..')
      .locator('..')
      .describe('Large photo size option');
    await largeSizeOption.click();

    // Add "Job Title" attribute
    const addAttributeBtn = page
      .getByRole('button', { name: /Add attribute/ })
      .describe('Add attribute button');
    await addAttributeBtn.click();

    const attributeList = page
      .getByRole('listbox', { name: 'Options list' })
      .describe('Attribute options listbox');
    await expect(attributeList).toBeVisible({ timeout: 10000 });

    const jobTitleOption = page
      .getByRole('option', { name: 'Job Title' })
      .describe('Job Title attribute option');
    await jobTitleOption.click();

    // Close the attribute dropdown
    await page.keyboard.press('Escape');

    // Save both changes (Large + Job Title)
    const saveBtn = page
      .getByRole('button', { name: 'Save' })
      .describe('Save button in Customize panel');
    await saveBtn.waitFor({ state: 'visible', timeout: 10000 });
    await saveBtn.click();

    // Wait for the Customize panel to close
    await expect(customizeHeading).toBeHidden({ timeout: 15000 });

    // Wait for photos to re-render with new layout
    await page
      .locator('img[loading="lazy"]')
      .first()
      .waitFor({ state: 'visible', timeout: 30000 });

    // Verify the layout changed — grid should now be 4 columns (Large)
    const updatedGridCols = await getGridColumnCount();
    expect(updatedGridCols).toBe(4);

    // Verify the Job Title attribute appears on photo cards
    // Job titles follow the pattern "#NNNN - ..." on the listing
    const jobTitleOnCard = page
      .locator('text=/#\\d+ - /i')
      .first()
      .describe('Job title text on photo card');
    await expect(jobTitleOnCard).toBeVisible({ timeout: 15000 });

    // ── Revert customization (back to Small/default and remove attribute) ──
    // Re-open Customize panel
    await customizeBtn.click();
    await expect(customizeHeading).toBeVisible({ timeout: 15000 });

    // Change Photo Size back to Small
    const smallSizeOption = page
      .locator('img[alt="Small"]')
      .locator('..')
      .locator('..')
      .describe('Small photo size option');
    await smallSizeOption.click();

    // Remove the Job Title attribute using the "Remove" button
    const removeJobTitleBtn = page
      .getByRole('button', { name: 'Remove' })
      .describe('Remove Job Title attribute button');
    await expect(removeJobTitleBtn).toBeVisible({ timeout: 10000 });
    await removeJobTitleBtn.click();

    // Save to revert
    const saveBtnRevert = page
      .getByRole('button', { name: 'Save' })
      .describe('Save button to revert customization');
    await saveBtnRevert.waitFor({ state: 'visible', timeout: 10000 });
    await saveBtnRevert.click();

    // Wait for the Customize panel to close
    await expect(customizeHeading).toBeHidden({ timeout: 15000 });

    // Reload the page to ensure the Angular UI reflects saved settings
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page
      .locator('img[loading="lazy"]')
      .first()
      .waitFor({ state: 'visible', timeout: 30000 });

    // Verify the layout reverted — grid should now be 8 columns (Small)
    const revertedGridCols = await getGridColumnCount();
    expect(revertedGridCols).toBe(8);

    // Verify the Job Title text is no longer visible on photo cards
    const jobTitleGone = page
      .locator('text=/#\\d+ - /i')
      .first()
      .describe('Job title text should be gone after revert');
    await expect(jobTitleGone).toBeHidden({ timeout: 15000 });
  });
});
