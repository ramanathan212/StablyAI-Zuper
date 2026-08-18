import { Page, expect } from '@playwright/test';

const STAGING_URL = 'https://stagingv3.zuperpro.com';
const SAVE_DRAFT_MAX_RETRIES = 3;

/**
 * Logs into the staging application using environment variables.
 */
export async function loginToStaging({
  page,
}: {
  page: Page;
}): Promise<void> {
  await page.goto(`${STAGING_URL}/login`);
  await page.waitForTimeout(2000);

  // If already logged in, the app may redirect to the dashboard
  if (page.url().includes('/dashboard')) {
    return;
  }

  // If redirected to a non-login page (already authenticated), go to dashboard
  if (!page.url().includes('/login')) {
    await page.goto(`${STAGING_URL}/dashboard`);
    await page.waitForTimeout(2000);
    return;
  }

  const companyInput = page.getByRole('textbox', { name: 'Company Name' });
  const emailInput = page.getByRole('textbox', { name: 'Email address' });

  // The login page may skip the company step if the company is already remembered.
  // Race both possible states: company input visible OR email input visible.
  const firstVisible = await Promise.race([
    companyInput.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'company' as const),
    emailInput.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'email' as const),
  ]);

  if (firstVisible === 'company') {
    await companyInput.fill(process.env.company_name || '');

    // Use JS click to bypass potential banner overlay
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Continue'
      );
      if (btn) btn.click();
    });

    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  }

  await emailInput.fill(process.env.user_name || '');

  // Wait for the password field to be visible and fill it explicitly
  const passwordInput = page.getByRole('textbox', { name: 'Password Forgot password?' });
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.fill(process.env.password || '');

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Login'
    );
    if (btn) btn.click();
  });

  // Angular SPA — use commit, not load
  await page.waitForURL('**/dashboard', { waitUntil: 'commit', timeout: 30000 });
  await page.waitForTimeout(3000);
}

/**
 * Dismisses common overlay dialogs (notification, trial, timezone, etc.).
 */
export async function dismissDialogs({
  page,
}: {
  page: Page;
}): Promise<void> {
  // Dismiss timezone modal
  try {
    const cancelBtn = page.getByRole('button', { name: 'Cancel' });
    if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cancelBtn.click();
      await page.waitForTimeout(500);
    }
  } catch { /* no timezone modal */ }

  // Dismiss notification permission dialog
  try {
    const noThanks = page.getByRole('button', { name: 'No, thanks' });
    if (await noThanks.isVisible({ timeout: 3000 }).catch(() => false)) {
      await noThanks.click();
      await page.waitForTimeout(500);
    }
  } catch { /* no notification dialog */ }

  // Dismiss trial period modal
  try {
    const trialModal = page.locator('text=Trial Period Ending Soon');
    if (await trialModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      const closeBtn = page.locator(
        '.cdk-overlay-container button.close, .cdk-overlay-container .close, .cdk-overlay-container [aria-label="Close"]'
      ).first();
      if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(500);
    }
  } catch { /* no trial modal */ }

  // Dismiss any CDK overlay backdrop
  try {
    const backdrop = page.locator('.cdk-overlay-backdrop');
    if (await backdrop.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  } catch { /* no backdrop */ }
}

/**
 * Navigates to the Purchase Orders list page.
 */
export async function navigateToPurchaseOrders({
  page,
}: {
  page: Page;
}): Promise<void> {
  // Click the Purchasing sidebar icon
  const purchasingIcon = page.locator('#purchasing > .zuper-vertical-navigation-item-wrapper > .mat-mdc-tooltip-trigger > .mat-icon');
  await purchasingIcon.waitFor({ state: 'visible', timeout: 10000 });
  await purchasingIcon.click();
  await page.waitForTimeout(500);

  // Click Purchase Orders link
  const poLink = page.getByRole('link', { name: 'Purchase Orders Beta' });
  await poLink.waitFor({ state: 'visible', timeout: 5000 });
  await poLink.click();

  await page.waitForURL('**/purchase_order', { timeout: 15000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
}

/**
 * Creates a new Purchase Order and saves it as Draft.
 * Returns the PO detail page URL.
 */
export async function createNewPOAsDraft({
  page,
  poTitle,
  vendorName,
  requiredQty = '1',
}: {
  page: Page;
  poTitle: string;
  vendorName: string;
  requiredQty?: string;
}): Promise<string> {
  // Navigate to new PO form
  await page.goto(`${STAGING_URL}/purchase_order/new`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  await dismissDialogs({ page });

  // Fill PO Title
  const titleInput = page.getByRole('textbox', { name: 'PO Title *' });
  await titleInput.waitFor({ state: 'visible', timeout: 15000 });
  await titleInput.fill(poTitle);

  // Select Vendor via modal picker (vendor field is readonly)
  const vendorInput = page.getByRole('textbox', { name: 'Vendor *' });
  await vendorInput.click();
  await page.waitForTimeout(1500);

  // The "Choose Vendor" modal opens — search and select the vendor
  const vendorSearch = page.getByRole('textbox', { name: 'Search Vendors ...' });
  await vendorSearch.waitFor({ state: 'visible', timeout: 10000 });
  await vendorSearch.fill(vendorName);
  await page.waitForTimeout(1500);

  // Select the vendor radio button
  const vendorRadio = page.getByRole('radio', { name: new RegExp(vendorName, 'i') }).first();
  await vendorRadio.waitFor({ state: 'visible', timeout: 10000 });
  await vendorRadio.click();
  await page.waitForTimeout(500);

  // Click "Choose Vendor" confirmation button
  const chooseVendorBtn = page.getByRole('button', { name: 'Choose Vendor' });
  await chooseVendorBtn.waitFor({ state: 'visible', timeout: 5000 });
  await chooseVendorBtn.click();
  await page.waitForTimeout(2000);

  // Set Required By date (click the date field and select a date)
  const requiredByInput = page.getByRole('textbox', { name: 'Required By *' });
  await requiredByInput.click();
  await page.waitForTimeout(1000);

  // Select a future date in the calendar
  const futureDate = page.locator(
    'button.mat-calendar-body-cell:not(.mat-calendar-body-disabled)'
  ).last();
  if (await futureDate.isVisible({ timeout: 5000 }).catch(() => false)) {
    await futureDate.click();
  }
  await page.waitForTimeout(500);

  // Add a PO Item — click the "Add" button inside the PO Items region
  const poItemsRegion = page.getByRole('region', { name: /PO Items/i });
  const poItemsAddBtn = poItemsRegion.getByRole('button', { name: /Add/i }).first();
  await poItemsAddBtn.waitFor({ state: 'visible', timeout: 10000 });
  await poItemsAddBtn.click();
  await page.waitForTimeout(1000);

  // A menu appears with "Line Item" / "Custom Line Item" — click "Line Item"
  const lineItemMenuItem = page.getByRole('menuitem', { name: 'Line Item', exact: true });
  await lineItemMenuItem.waitFor({ state: 'visible', timeout: 5000 });
  await lineItemMenuItem.click();
  await page.waitForTimeout(2000);

  // Product accordion is now shown — expand and check the first product
  const firstProductAccordion = page.locator('button[aria-expanded]').filter({ hasText: /Cleaning part|#\s*1/ }).first();
  if (await firstProductAccordion.isVisible({ timeout: 5000 }).catch(() => false)) {
    const isExpanded = await firstProductAccordion.getAttribute('aria-expanded');
    if (isExpanded !== 'true') {
      await firstProductAccordion.click();
      await page.waitForTimeout(1000);
    }
  }

  // Check the first available product option checkbox
  const productCheckbox = page.getByRole('checkbox').first();
  await productCheckbox.waitFor({ state: 'visible', timeout: 5000 });
  await productCheckbox.check({ force: true });
  await page.waitForTimeout(500);

  // Fill in Required Qty (validation blocks save without it)
  const qtyInput = page.locator('input[id^="qty_"]').first();
  if (await qtyInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await qtyInput.fill(requiredQty);
    await page.waitForTimeout(500);
  }

  // Click "Add Item" button to confirm the selection
  const addItemConfirmBtn = page.getByRole('button', { name: 'Add Item' });
  await addItemConfirmBtn.waitFor({ state: 'visible', timeout: 5000 });
  await addItemConfirmBtn.click();
  await page.waitForTimeout(2000);

  // Dismiss item selection sidebar if still visible
  const itemSidebar = page.locator('[class*="cdk-overlay-backdrop"]');
  if (await itemSidebar.isVisible({ timeout: 1000 }).catch(() => false)) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
  }

  // Save as Draft with retry logic (the API sometimes fails with a transient server error)
  await saveAsDraftWithRetry({ page });

  return page.url();
}

/**
 * Clicks "Save as Draft", confirms the dialog, and waits for navigation to the
 * PO details page. Retries up to SAVE_DRAFT_MAX_RETRIES times if the server
 * returns a transient error (detected via the error toast).
 */
async function saveAsDraftWithRetry({
  page,
}: {
  page: Page;
}): Promise<void> {
  for (let attempt = 1; attempt <= SAVE_DRAFT_MAX_RETRIES; attempt++) {
    // Click "Save as Draft" action (it's a clickable div, not a button or anchor)
    const saveAsDraftAction = page.locator('a, span, div').filter({ hasText: /^Save as Draft$/ }).first();
    await saveAsDraftAction.waitFor({ state: 'visible', timeout: 10000 });
    await saveAsDraftAction.click();
    await page.waitForTimeout(2000);

    // Confirm in the "Save as Draft" dialog
    const confirmSaveBtn = page.getByRole('button', { name: 'Save as Draft' });
    if (await confirmSaveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await confirmSaveBtn.click();
    }

    // Race: either navigate to details (success) or detect error toast (failure)
    const result = await Promise.race([
      page
        .waitForURL('**/purchase_order/**/details', { waitUntil: 'commit', timeout: 30000 })
        .then(() => 'navigated' as const),
      page
        .locator('.hot-toast-message, [class*="toast"]')
        .filter({ hasText: /something went wrong|error|failed/i })
        .first()
        .waitFor({ state: 'visible', timeout: 25000 })
        .then(() => 'error-toast' as const),
    ]).catch(() => 'timeout' as const);

    if (result === 'navigated') {
      // Success — URL changed to details page
      await page.waitForTimeout(3000);
      return;
    }

    // Server error or timeout — retry
    console.warn(
      `Save as Draft attempt ${attempt}/${SAVE_DRAFT_MAX_RETRIES} failed (${result}). ` +
      (attempt < SAVE_DRAFT_MAX_RETRIES ? 'Retrying...' : 'Giving up.')
    );

    if (attempt < SAVE_DRAFT_MAX_RETRIES) {
      // Wait for the error toast to disappear before retrying
      await page.waitForTimeout(3000);

      // If we're still on the form page, dismiss any overlays and retry
      await dismissDialogs({ page });
    }
  }

  // All retries exhausted — fail with a clear message
  throw new Error(
    `Save as Draft failed after ${SAVE_DRAFT_MAX_RETRIES} attempts. ` +
    `The server returned a transient error each time. Current URL: ${page.url()}`
  );
}

/**
 * Opens the "More Actions" dropdown menu on a PO details page.
 * The element is a generic clickable div/span (not an anchor or button role).
 */
export async function openMoreActionsMenu({
  page,
}: {
  page: Page;
}): Promise<void> {
  await dismissDialogs({ page });
  await page.waitForTimeout(1000);

  // "More Actions" may be a link, div, or span — use a broad locator
  const moreActions = page.locator('a, span, div').filter({ hasText: /^More Actions$/ }).first();
  await moreActions.waitFor({ state: 'visible', timeout: 10000 });
  await moreActions.click();
  await page.waitForTimeout(1000);
}

/**
 * Checks if "Edit PO" menu item is visible in the More Actions menu.
 * Assumes the More Actions menu is already open.
 */
export async function isEditPOVisible({
  page,
}: {
  page: Page;
}): Promise<boolean> {
  const editMenuItem = page.getByRole('menuitem', { name: /Edit PO/i });
  return editMenuItem.isVisible({ timeout: 3000 }).catch(() => false);
}

/**
 * Checks if "Cancel PO" menu item is visible in the More Actions menu.
 */
export async function isCancelPOVisible({
  page,
}: {
  page: Page;
}): Promise<boolean> {
  const cancelMenuItem = page.getByRole('menuitem', { name: /Cancel PO/i });
  return cancelMenuItem.isVisible({ timeout: 3000 }).catch(() => false);
}

/**
 * Checks if "Delete PO" menu item is visible in the More Actions menu.
 */
export async function isDeletePOVisible({
  page,
}: {
  page: Page;
}): Promise<boolean> {
  const deleteMenuItem = page.getByRole('menuitem', { name: /Delete PO/i });
  return deleteMenuItem.isVisible({ timeout: 3000 }).catch(() => false);
}

/**
 * Clicks "Edit PO" from the More Actions menu and waits for the edit page.
 * Opens the More Actions menu first.
 */
export async function clickEditPO({
  page,
}: {
  page: Page;
}): Promise<void> {
  await openMoreActionsMenu({ page });

  const editMenuItem = page.getByRole('menuitem', { name: /Edit PO/i });
  await editMenuItem.waitFor({ state: 'visible', timeout: 5000 });
  await editMenuItem.click();

  await page.waitForURL('**/purchase_order/**/edit', { timeout: 15000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
}

/**
 * On the Edit PO page, modifies the PO title and saves as Draft.
 */
export async function editPOTitleAndSave({
  page,
  newTitle,
}: {
  page: Page;
  newTitle: string;
}): Promise<void> {
  const titleInput = page.getByRole('textbox', { name: 'PO Title *' });
  await titleInput.waitFor({ state: 'visible', timeout: 10000 });
  await titleInput.clear();
  await titleInput.fill(newTitle);

  // Save as Draft with retry logic (the API sometimes fails with a transient server error)
  await saveAsDraftWithRetry({ page });
}

/**
 * On the Edit PO page, checks if the Associations "Add" button is visible.
 */
export async function isAssociationsAddButtonVisible({
  page,
}: {
  page: Page;
}): Promise<boolean> {
  // The "Add" clickable element is a sibling of the "Association(s)" heading
  // It's a generic div (not a button or anchor), so use text-based locator
  const heading = page.getByRole('heading', { name: 'Association(s)' });
  const headingVisible = await heading.isVisible({ timeout: 3000 }).catch(() => false);
  if (!headingVisible) return false;

  // The "Add" element is a sibling generic/div next to the heading
  const addElement = page.getByText('Add', { exact: true })
    .locator('xpath=ancestor::*[.//*[contains(text(),"Association")]]')
    .getByText('Add', { exact: true }).first();

  // Simpler approach: find the clickable "Add" near "Association(s)"
  const assocSection = heading.locator('..');
  const addBtn = assocSection.getByText('Add', { exact: true }).first();
  return addBtn.isVisible({ timeout: 3000 }).catch(() => false);
}

/**
 * Marks the PO as Submitted from the PO details page.
 */
export async function markAsSubmitted({
  page,
}: {
  page: Page;
}): Promise<void> {
  await dismissDialogs({ page });
  await page.waitForTimeout(1000);

  // Click "Mark as Submitted" action link
  const markSubmittedLink = page.locator('a, span, div').filter({ hasText: /^Mark as Submitted$/ }).first();
  await markSubmittedLink.waitFor({ state: 'visible', timeout: 15000 });
  await markSubmittedLink.click();
  await page.waitForTimeout(1000);

  // A confirmation dialog may appear
  const confirmBtn = page.getByRole('button', { name: 'Mark as Submitted' });
  if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await confirmBtn.click();
  }

  await page.waitForTimeout(3000);
  await dismissDialogs({ page });
}

/**
 * Marks the PO as Approved from the PO details page.
 * NOTE: The actual app has an "Approved" status between Submitted and Sent to Vendor
 * that is NOT documented in the PRD. This helper is needed to transition through
 * the real application workflow.
 */
export async function markAsApproved({
  page,
}: {
  page: Page;
}): Promise<void> {
  await dismissDialogs({ page });
  await page.waitForTimeout(1000);

  // Try the direct "Mark as Approved" action link first
  const directLink = page.locator('a, span, div').filter({ hasText: /^Mark as Approved$/ }).first();
  if (await directLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await directLink.click();
  } else {
    // Fall back to More Actions menu
    await openMoreActionsMenu({ page });
    const menuItem = page.getByRole('menuitem', { name: /Mark as Approved/i }).first();
    await menuItem.waitFor({ state: 'visible', timeout: 5000 });
    await menuItem.click();
  }
  await page.waitForTimeout(1000);

  // Click confirmation button if dialog appears
  const confirmBtn = page.getByRole('button', { name: /Mark as Approved|Confirm|Yes/i }).first();
  if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await confirmBtn.click();
  }

  await page.waitForTimeout(3000);
  await dismissDialogs({ page });
}

/**
 * Marks the PO as Sent to Vendor from the PO details page.
 * NOTE: In the actual app, this requires first going through Submitted → Approved.
 * The "Send to Vendor" action may appear as a top-level button or in More Actions.
 */
export async function markAsSentToVendor({
  page,
}: {
  page: Page;
}): Promise<void> {
  await dismissDialogs({ page });
  await page.waitForTimeout(1500);

  // Try various text patterns for the action link
  const patterns = [
    /^Mark as Sent to Vendor$/,
    /^Send to Vendor$/,
    /^Sent to Vendor$/,
  ];

  let clicked = false;
  for (const pattern of patterns) {
    const directLink = page.locator('a, span, div').filter({ hasText: pattern }).first();
    if (await directLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await directLink.click();
      clicked = true;
      break;
    }
  }

  if (!clicked) {
    // Fall back to More Actions menu
    await openMoreActionsMenu({ page });
    const menuItem = page.getByRole('menuitem', { name: /Sent to Vendor|Send to Vendor/i }).first();
    await menuItem.waitFor({ state: 'visible', timeout: 5000 });
    await menuItem.click();
  }
  await page.waitForTimeout(1000);

  // Click confirmation button if a dialog appears
  const confirmBtn = page.getByRole('button', { name: /Mark as Sent to Vendor|Send to Vendor|Confirm|Yes/i }).first();
  if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await confirmBtn.click();
  }

  await page.waitForTimeout(3000);
  await dismissDialogs({ page });
}

/**
 * Marks the PO as Vendor Accepted from the PO details page.
 */
export async function markAsVendorAccepted({
  page,
}: {
  page: Page;
}): Promise<void> {
  await dismissDialogs({ page });
  await page.waitForTimeout(1000);

  // Try the direct action link first
  const directLink = page.locator('a, span, div').filter({ hasText: /^Mark as Vendor Accepted$/ }).first();
  if (await directLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await directLink.click();
  } else {
    // Fall back to More Actions menu
    await openMoreActionsMenu({ page });
    const menuItem = page.getByRole('menuitem', { name: /Vendor Accepted/i }).first();
    await menuItem.waitFor({ state: 'visible', timeout: 5000 });
    await menuItem.click();
  }
  await page.waitForTimeout(1000);

  // Click confirmation button if a dialog appears
  const confirmBtn = page.getByRole('button', { name: /Mark as Vendor Accepted|Confirm|Yes/i }).first();
  if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await confirmBtn.scrollIntoViewIfNeeded();
    await confirmBtn.click({ force: true });
  }

  await page.waitForTimeout(3000);
  await dismissDialogs({ page });
}

/**
 * Marks the PO as Vendor Rejected from the PO details page.
 * The "Mark as Rejected" menuitem appears in the More Actions dropdown.
 */
export async function markAsVendorRejected({
  page,
}: {
  page: Page;
}): Promise<void> {
  await dismissDialogs({ page });
  await page.waitForTimeout(1000);

  // Try various direct action link patterns
  const directPatterns = [
    /^Mark as Rejected$/,
    /^Mark as Vendor Rejected$/,
    /^Vendor Rejected$/,
    /^Reject$/,
  ];

  let clicked = false;
  for (const pattern of directPatterns) {
    const link = page.locator('a, span, div').filter({ hasText: pattern }).first();
    if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
      await link.click();
      clicked = true;
      console.log(`Clicked direct link: "${pattern.source}"`);
      break;
    }
  }

  if (!clicked) {
    // Fall back to More Actions menu
    await openMoreActionsMenu({ page });

    // Log all visible menu items for debugging
    const allMenuItems = await page.getByRole('menuitem').all();
    const menuLabels: string[] = [];
    for (const item of allMenuItems) {
      const text = await item.textContent().catch(() => '');
      if (text) menuLabels.push(text.trim());
    }
    console.log(`More Actions menu items: ${JSON.stringify(menuLabels)}`);

    const menuItem = page.getByRole('menuitem', { name: /Reject|Vendor Rejected/i }).first();
    if (await menuItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await menuItem.click();
    } else {
      // Try clicking any menu item containing "reject"
      const rejectItem = page.getByRole('menuitem').filter({ hasText: /reject/i }).first();
      if (await rejectItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        await rejectItem.click();
      } else {
        throw new Error(`No reject menu item found. Available items: ${JSON.stringify(menuLabels)}`);
      }
    }
  }
  await page.waitForTimeout(1000);

  // Click confirmation button if a dialog appears
  const confirmBtn = page.getByRole('button', { name: /Reject|Mark as Rejected|Vendor Rejected|Confirm|Yes/i }).first();
  if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await confirmBtn.scrollIntoViewIfNeeded();
    await confirmBtn.click({ force: true });
  }

  await page.waitForTimeout(3000);
  await dismissDialogs({ page });
}

/**
 * Gets the current PO status text from the details page.
 */
export async function getPOStatus({
  page,
}: {
  page: Page;
}): Promise<string> {
  // The status badge is inside a generic element near the PO number
  const statusBadge = page.locator('[class*="status"], [class*="badge"]').filter({ hasText: /Draft|Submitted|Sent to Vendor|Vendor Accepted|Vendor Rejected|Partially Fulfilled|Fulfilled|Invoiced|Paid|Closed|Approved/ }).first();
  if (await statusBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
    return (await statusBadge.textContent() || '').trim();
  }
  // Fallback: try another approach
  const statusEl = page.locator('span, div').filter({ hasText: /^(Draft|Submitted|Sent to Vendor|Vendor Accepted|Vendor Rejected|Partially Fulfilled|Fulfilled|Invoiced|Paid|Closed|Approved)$/ }).first();
  return (await statusEl.textContent() || '').trim();
}

/**
 * Verifies that specific editable fields are present on the Edit PO form.
 */
export async function verifyEditableFieldsPresent({
  page,
}: {
  page: Page;
}): Promise<void> {
  // PO Title
  await expect(page.getByRole('textbox', { name: 'PO Title *' })).toBeVisible();

  // Vendor
  await expect(page.getByRole('textbox', { name: 'Vendor *' })).toBeVisible();

  // Delivery Method — use exact label text to avoid matching hidden "Select Delivery Method"
  await expect(page.getByText('Delivery Method', { exact: true }).first()).toBeVisible();

  // Delivery Time
  await expect(page.getByText('Delivery Time', { exact: true }).first()).toBeVisible();

  // Reference Number
  await expect(page.getByRole('textbox', { name: 'Reference Number' })).toBeVisible();

  // Required By
  await expect(page.getByRole('textbox', { name: 'Required By *' })).toBeVisible();

  // Payment Term
  await expect(page.getByText('Payment Term', { exact: true }).first()).toBeVisible();

  // Template
  await expect(page.getByText('Template', { exact: true }).first()).toBeVisible();

  // Remarks (rich text editor)
  await expect(page.getByText('Remarks', { exact: true }).first()).toBeVisible();

  // PO Items section
  await expect(page.getByText('PO Items', { exact: true }).first()).toBeVisible();

  // Billing Address section
  await expect(page.getByText('Billing Address', { exact: false }).first()).toBeVisible();

  // Attachments section
  await expect(page.getByText('Attachments', { exact: true }).first()).toBeVisible();
}

/**
 * Advances a PO from the current status to the target status by clicking
 * through intermediate status transitions. The actual application has an
 * "Approved" status between Submitted and Sent to Vendor that the PRD
 * does not mention. This helper handles that transparently.
 */
export async function advancePOToStatus({
  page,
  targetStatus,
}: {
  page: Page;
  targetStatus: 'Submitted' | 'Approved' | 'Sent to Vendor' | 'Vendor Accepted' | 'Vendor Rejected';
}): Promise<void> {
  const statusOrder = ['Draft', 'Submitted', 'Approved', 'Sent to Vendor'];

  const currentStatus = await getPOStatus({ page });

  if (targetStatus === 'Vendor Accepted') {
    // First advance to Sent to Vendor, then accept
    if (!currentStatus.includes('Sent to Vendor')) {
      await advancePOToStatus({ page, targetStatus: 'Sent to Vendor' });
    }
    await markAsVendorAccepted({ page });
    return;
  }

  if (targetStatus === 'Vendor Rejected') {
    // First advance to Sent to Vendor, then reject
    if (!currentStatus.includes('Sent to Vendor')) {
      await advancePOToStatus({ page, targetStatus: 'Sent to Vendor' });
    }
    await markAsVendorRejected({ page });
    return;
  }

  const currentIndex = statusOrder.findIndex((s) => currentStatus.includes(s));
  const targetIndex = statusOrder.findIndex((s) => s === targetStatus);

  for (let i = currentIndex + 1; i <= targetIndex; i++) {
    const nextStatus = statusOrder[i];
    switch (nextStatus) {
      case 'Submitted':
        await markAsSubmitted({ page });
        break;
      case 'Approved':
        await markAsApproved({ page });
        break;
      case 'Sent to Vendor':
        await markAsSentToVendor({ page });
        break;
    }
    await page.waitForTimeout(1000);
    await dismissDialogs({ page });
  }
}

/**
 * Receives items for a PO at Vendor Accepted status.
 * @param receiveQty - the quantity to fill in the receive form for each line item
 */
export async function receiveItems({
  page,
  receiveQty,
}: {
  page: Page;
  receiveQty: number;
}): Promise<void> {
  await dismissDialogs({ page });
  await page.waitForTimeout(1000);

  // Look for "Receive Items" action link/button on the PO details page
  const receivePatterns = [
    /^Receive Items$/,
    /^Receive Item$/,
    /^Receive$/,
  ];

  let clicked = false;
  for (const pattern of receivePatterns) {
    const link = page.locator('a, span, div, button').filter({ hasText: pattern }).first();
    if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
      await link.click();
      clicked = true;
      console.log(`Clicked "${pattern.source}" action`);
      break;
    }
  }

  if (!clicked) {
    // Fall back to More Actions menu
    await openMoreActionsMenu({ page });

    // Log all menu items for debugging
    const allMenuItems = await page.getByRole('menuitem').all();
    const menuLabels: string[] = [];
    for (const item of allMenuItems) {
      const text = await item.textContent().catch(() => '');
      if (text) menuLabels.push(text.trim());
    }
    console.log(`More Actions menu items: ${JSON.stringify(menuLabels)}`);

    const menuItem = page.getByRole('menuitem', { name: /Receive/i }).first();
    if (await menuItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await menuItem.click();
      console.log('Clicked Receive from More Actions');
    }
  }

  // Wait for the receive form/page/sidebar to load
  await page.waitForTimeout(5000);

  // Log all visible inputs for debugging
  const allInputs = await page.locator('input:visible').all();
  console.log(`Total visible inputs on page: ${allInputs.length}`);
  for (const input of allInputs.slice(0, 15)) {
    const id = await input.getAttribute('id').catch(() => '');
    const type = await input.getAttribute('type').catch(() => '');
    const placeholder = await input.getAttribute('placeholder').catch(() => '');
    const name = await input.getAttribute('name').catch(() => '');
    const formcontrol = await input.getAttribute('formcontrolname').catch(() => '');
    const value = await input.inputValue().catch(() => '');
    console.log(`  Input: id="${id}" type="${type}" placeholder="${placeholder}" name="${name}" formcontrol="${formcontrol}" value="${value}"`);
  }

  // Look for quantity input fields in the receive form
  // Try multiple selector strategies
  const qtySelectors = [
    page.locator('input[formcontrolname*="received" i]'),
    page.locator('input[formcontrolname*="qty" i]'),
    page.locator('input[id*="received" i]'),
    page.locator('input[id*="qty" i]'),
    page.locator('input[placeholder*="Qty" i]'),
    page.locator('input[placeholder*="quantity" i]'),
    page.locator('input[placeholder*="Received" i]'),
    page.locator('input[type="number"]:visible'),
  ];

  let filledCount = 0;
  for (const selector of qtySelectors) {
    const count = await selector.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const input = selector.nth(i);
        if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
          await input.clear();
          await input.fill(String(receiveQty));
          filledCount++;
          console.log(`Filled receive qty input ${filledCount}: ${receiveQty}`);
        }
      }
      if (filledCount > 0) break;
    }
  }

  if (filledCount === 0) {
    console.warn('WARNING: No quantity inputs found for receive items');
  }

  await page.waitForTimeout(1000);

  // Click the Receive/Submit/Save button
  const receiveBtnPatterns = [
    /^Receive$/,
    /^Receive Items$/,
    /^Save$/,
    /^Submit$/,
    /^Confirm$/,
    /^Update$/,
  ];

  let btnClicked = false;
  for (const pattern of receiveBtnPatterns) {
    const btn = page.getByRole('button', { name: pattern }).first();
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click();
      console.log(`Clicked "${pattern.source}" button to confirm receive`);
      btnClicked = true;
      break;
    }
  }

  if (!btnClicked) {
    // Try any submit-like button
    const anyBtn = page.locator('button[type="submit"]:visible, button.btn-primary:visible').first();
    if (await anyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const btnText = await anyBtn.textContent();
      await anyBtn.click();
      console.log(`Clicked submit button: "${btnText}"`);
    }
  }

  await page.waitForTimeout(3000);

  // Handle any confirmation dialog
  const confirmBtn = page.getByRole('button', { name: /Confirm|Yes|OK/i }).first();
  if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirmBtn.click();
    await page.waitForTimeout(2000);
  }

  await page.waitForTimeout(3000);
  await dismissDialogs({ page });
}

/**
 * Marks the PO as Invoiced from the PO details page.
 */
export async function markAsInvoiced({
  page,
}: {
  page: Page;
}): Promise<void> {
  await dismissDialogs({ page });
  await page.waitForTimeout(1000);

  const patterns = [
    /^Mark as Invoiced$/,
    /^Invoiced$/,
    /^Create Invoice$/,
  ];

  let clicked = false;
  for (const pattern of patterns) {
    const link = page.locator('a, span, div').filter({ hasText: pattern }).first();
    if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
      await link.click();
      clicked = true;
      break;
    }
  }

  if (!clicked) {
    await openMoreActionsMenu({ page });
    const menuItem = page.getByRole('menuitem', { name: /Invoice/i }).first();
    if (await menuItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await menuItem.click();
    }
  }

  await page.waitForTimeout(1000);

  const confirmBtn = page.getByRole('button', { name: /Mark as Invoiced|Invoiced|Confirm|Yes/i }).first();
  if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await confirmBtn.click();
  }

  await page.waitForTimeout(3000);
  await dismissDialogs({ page });
}

/**
 * Marks the PO as Paid from the PO details page.
 */
export async function markAsPaid({
  page,
}: {
  page: Page;
}): Promise<void> {
  await dismissDialogs({ page });
  await page.waitForTimeout(1000);

  const patterns = [
    /^Mark as Paid$/,
    /^Paid$/,
  ];

  let clicked = false;
  for (const pattern of patterns) {
    const link = page.locator('a, span, div').filter({ hasText: pattern }).first();
    if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
      await link.click();
      clicked = true;
      break;
    }
  }

  if (!clicked) {
    await openMoreActionsMenu({ page });
    const menuItem = page.getByRole('menuitem', { name: /Paid/i }).first();
    if (await menuItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await menuItem.click();
    }
  }

  await page.waitForTimeout(1000);

  const confirmBtn = page.getByRole('button', { name: /Mark as Paid|Paid|Confirm|Yes/i }).first();
  if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await confirmBtn.click();
  }

  await page.waitForTimeout(3000);
  await dismissDialogs({ page });
}

/**
 * Advances a PO from Draft through all statuses to Vendor Accepted.
 * Handles the auto-advance from Approved → Sent to Vendor.
 */
export async function advancePOToVendorAccepted({
  page,
}: {
  page: Page;
}): Promise<void> {
  await markAsSubmitted({ page });
  await markAsApproved({ page });

  // markAsApproved auto-advances to Sent to Vendor in the current app.
  // Wait for the status transition to complete before proceeding.
  await page.waitForTimeout(3000);
  await dismissDialogs({ page });

  // Try Vendor Accepted directly — if the "Mark as Vendor Accepted" action
  // isn't visible, then try advancing to Sent to Vendor first.
  const vendorAcceptLink = page.locator('a, span, div').filter({ hasText: /^Mark as Vendor Accepted$/ }).first();
  if (await vendorAcceptLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    // Already at Sent to Vendor — proceed to Vendor Accepted
    await markAsVendorAccepted({ page });
  } else {
    // May still be at Approved — try advancing to Sent to Vendor first
    try {
      await markAsSentToVendor({ page });
    } catch {
      // Already at Sent to Vendor — ignore the error
      console.log('markAsSentToVendor skipped — PO already at Sent to Vendor');
    }
    await markAsVendorAccepted({ page });
  }
}

/**
 * Navigates to the first PO in the list matching the given status.
 * Uses the KPI cards on the PO list page to filter by status.
 * Returns true if a PO with the given status was found and navigated to.
 */
export async function navigateToExistingPOWithStatus({
  page,
  status,
}: {
  page: Page;
  status: string;
}): Promise<boolean> {
  await page.goto(`${STAGING_URL}/purchase_order`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  await dismissDialogs({ page });

  // Find a row whose Status cell matches the target status
  // Use the status cell to avoid false matches from PO titles or other text
  const statusCell = page.getByRole('cell').filter({ hasText: new RegExp(`^${status}$`) }).first();
  const statusRow = statusCell.locator('xpath=ancestor::tr');

  if (await statusCell.isVisible({ timeout: 10000 }).catch(() => false)) {
    const poLink = statusRow.getByRole('link').first();
    await poLink.waitFor({ state: 'visible', timeout: 5000 });
    await poLink.click();

    await page.waitForURL('**/purchase_order/**/details', { timeout: 15000 });
    await page.waitForTimeout(3000);
    await dismissDialogs({ page });
    return true;
  }
  return false;
}
