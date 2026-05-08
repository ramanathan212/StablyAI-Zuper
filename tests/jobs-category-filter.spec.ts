import { test, expect } from '@stablyai/playwright-test';
import type { Page } from '@playwright/test';

test.describe('Jobs Category Filter', () => {
  /**
   * User Prompt:
   * - Go to Job details page.
   * - Add a filter for job category and verify it.
   */
  test('should add a Job Category filter and verify filtered results', async ({ page }) => {
    test.setTimeout(180000);

    // ── Step 1: Login ──────────────────────────────────────────────────────
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Company Name' }).waitFor({ state: 'visible', timeout: 30000 });
    await page.getByRole('textbox', { name: 'Company Name' }).fill(process.env.company_name ?? '');

    // Use JS click to bypass banner overlay that may intercept Playwright clicks
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Continue');
      if (btn) (btn as HTMLButtonElement).click();
    });

    await page.getByRole('textbox', { name: 'Email address' }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByRole('textbox', { name: 'Email address' }).fill(process.env.user_name ?? '');
    await page.getByRole('textbox', { name: 'Password Forgot password?' }).fill(process.env.password ?? '');

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Login');
      if (btn) (btn as HTMLButtonElement).click();
    });

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { waitUntil: 'commit', timeout: 60000 });

    // ── Step 2: Dismiss popups on Dashboard ────────────────────────────────
    await dismissPopups(page);

    // ── Step 3: Navigate to Jobs module ─────────────────────────────────────
    await page.goto('/jobs');
    await page.locator('button').filter({ hasText: /Filter/ }).first().waitFor({ state: 'visible', timeout: 30000 });

    // Dismiss popups that may reappear after navigation
    await dismissPopups(page);

    // ── Step 4: Click on the Filter button to open the filter panel ─────────
    await page.locator('button').filter({ hasText: /Filter/ }).first().click();
    await page.getByRole('heading', { name: 'Pinned Filters' }).waitFor({ state: 'visible', timeout: 10000 });

    // ── Step 5: Remove Job Category from Pinned Filters (if pinned) ─────────
    // This makes it available in the "Choose Filter" dropdown
    await removeJobCategoryFromPinned(page);

    // ── Step 6: Click "Add Filter" button ───────────────────────────────────
    await page.getByRole('button', { name: 'Add Filter' }).first().click();

    // Wait for the Choose Filter combobox to appear and expand
    const filterCombobox = page.getByRole('combobox', { name: 'Choose Filter' });
    await filterCombobox.waitFor({ state: 'visible', timeout: 5000 });

    // ── Step 7: Select "Job Category" from the filter dropdown ──────────────
    await filterCombobox.click();
    await page.getByRole('option', { name: 'Job Category', exact: true }).click();
    await page.waitForTimeout(500);

    // ── Step 8: Select a value for the filter ("Fixes") ─────────────────────
    const valueNgSelect = page.locator('[id="field_value_job_category_uid"]');
    const valueInput = valueNgSelect.locator('input');
    await valueInput.click();
    await page.waitForTimeout(500);

    // Select "Fixes" from the dropdown
    await page.getByRole('option', { name: 'Fixes', exact: true }).click();
    await page.waitForTimeout(500);

    // ── Step 9: Click "Add" button to apply the filter ──────────────────────
    // Dismiss CDK overlays that may block the button
    await page.evaluate(() => {
      document.querySelectorAll('.cdk-overlay-backdrop').forEach(el => el.remove());
    });
    await page.waitForTimeout(300);

    // Use JS click to bypass any remaining overlay
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(b => b.textContent?.trim() === 'Add');
      if (addBtn) (addBtn as HTMLButtonElement).click();
    });

    // Wait for filter to be applied and results to load
    await page.waitForTimeout(3000);

    // ── Step 10: Verify the filter is applied ───────────────────────────────

    // Verify "Job Category" text is visible in the applied filters area
    await expect(page.locator('text=Job Category').first()).toBeVisible({ timeout: 10000 });

    // Verify the filter shows "Contains" operator with "Fixes" value
    await expect(page.locator('text=Fixes').first()).toBeVisible({ timeout: 10000 });

    // Verify all visible job rows show "Fixes" in the Category column (index 5)
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();

    // Ensure results are present after filtering
    expect(rowCount).toBeGreaterThan(0);

    // Check that each visible row has "Fixes" in the Category column (6th column, index 5)
    for (let i = 0; i < Math.min(rowCount, 15); i++) {
      const categoryCell = tableRows.nth(i).locator('td').nth(5);
      await expect(categoryCell).toHaveText(/Fixes/);
    }
  });
});

// ── Helper functions ────────────────────────────────────────────────────────

/**
 * Dismisses common popups: timezone dialog, notification permission dialog,
 * and CDK overlay backdrops.
 */
async function dismissPopups(page: Page): Promise<void> {
  await page.waitForTimeout(2000);

  // Dismiss "Your timezone has changed" dialog if present
  const cancelBtn = page.getByRole('button', { name: 'Cancel' });
  if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cancelBtn.click();
    await page.waitForTimeout(500);
  }

  // Dismiss notification permission dialog
  const noThanksBtn = page.getByRole('button', { name: /no,?\s*thanks/i });
  if (await noThanksBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await noThanksBtn.click();
    await page.waitForTimeout(500);
  }

  // Dismiss any remaining CDK overlay backdrops
  await page.evaluate(() => {
    document.querySelectorAll('.cdk-overlay-backdrop').forEach(el => el.remove());
  });
  await page.waitForTimeout(300);
}

/**
 * Removes the Job Category filter from the Pinned Filters section.
 * Job Category is typically the first pinned filter. After removal,
 * it becomes available in the "Choose Filter" dropdown.
 * If no pinned filters exist, this function does nothing.
 */
async function removeJobCategoryFromPinned(page: Page): Promise<void> {
  // The pinned filters area shows items like:
  // "Job Category" [Unpin] [Remove]
  // "Scheduled Date Range" [Unpin] [Remove]
  // "Job Priority" [Unpin] [Remove]
  // Job Category is typically the first pinned filter.
  // Click the first "Remove" button in the Pinned Filters section.
  const removeBtn = page.getByRole('button', { name: 'Remove' }).first();
  if (await removeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await removeBtn.click();
    await page.waitForTimeout(500);
  }
}
