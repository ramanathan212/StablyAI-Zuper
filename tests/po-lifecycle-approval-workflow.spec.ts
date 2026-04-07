import { test, expect, Page } from '@stablyai/playwright-test';

const BASE_URL = 'https://stagingv3.zuperpro.com';

/**
 * Dismiss common modals/dialogs that may appear during navigation:
 * - Timezone change modal
 * - Notification permission dialog
 * - CDK overlay backdrops
 */
async function dismissModals(page: Page) {
  // Dismiss timezone modal if present
  try {
    const cancelBtn = page.getByRole('button', { name: 'Cancel' });
    if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cancelBtn.click();
      await page.waitForTimeout(500);
    }
  } catch { /* no modal */ }

  // Dismiss notification dialog
  try {
    const noThanks = page.getByRole('button', { name: 'No, thanks' });
    if (await noThanks.isVisible({ timeout: 2000 }).catch(() => false)) {
      await noThanks.click();
      await page.waitForTimeout(500);
    }
  } catch { /* no dialog */ }

  // Dismiss Trial Period modal via close button
  try {
    const closeButton = page.locator('.cdk-overlay-container button.close, .cdk-overlay-container .close, .cdk-overlay-container [aria-label="Close"]').first();
    if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }
  } catch { /* no trial modal */ }

  // Dismiss any overlay backdrop
  try {
    const backdrop = page.locator('.cdk-overlay-backdrop');
    if (await backdrop.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  } catch { /* no backdrop */ }
}

test.describe('PO Lifecycle Approval Workflow', () => {
  /**
   * User Prompt:
   * - Url - https://stagingv3.zuperpro.com/
   * - Go to settings -> modules -> Purchasing -> General settings make sure Require Vendor Approval? - ON Automatically Send PO to Vendor after Approval? - Off
   * - Go to purchasing module -> click PO -> add basic details and mandatory fields fill vendor as Jacksonville Roofing USA add line item -> Cleaning part
   * - create a PO as draft
   * - Draft -> submit
   * - Click Mark as approved click more options check mark as rejected is present - add assert press esc to close mark actions dialogue Click mark as approved confirm mark as accepted
   * - Click send to vendor button -> email trigger will open change email id as -> ramanathan.m@zuper.co Add subject - Test Add Body - Test make pdf button is enabled click send
   * - click more options check Edit PO is available- add assert click mark as vendor accepted confirm mark as vendor accepted
   * - click more options check Edit PO is available- add assert click receive item add receiving qty as 1 click submit
   * - click more options check Edit PO shouldn't be available- add assert click add mark as invoiced. click mark as paid add comment payment received click close PO
   */
  test('should complete full PO lifecycle from draft to close', async ({ page }) => {
    test.setTimeout(600000); // 10 minutes for this comprehensive workflow

    // =====================================================
    // STEP 0: Login
    // =====================================================
    await test.step('Login to application', async () => {
      await page.goto(`${BASE_URL}/login`);
      const companyNameInput = page.getByRole('textbox', { name: 'Company Name' });
      await companyNameInput.waitFor({ state: 'visible', timeout: 30000 });
      await companyNameInput.fill(process.env.company_name!);

      // Use JS click to bypass banner overlay
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent!.trim() === 'Continue');
        if (btn) btn.click();
      });

      const emailInput = page.getByRole('textbox', { name: 'Email address' });
      await emailInput.waitFor({ state: 'visible', timeout: 15000 });
      await emailInput.fill(process.env.user_name!);
      await page.getByRole('textbox', { name: 'Password Forgot password?' }).fill(process.env.password!);

      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent!.trim() === 'Login');
        if (btn) btn.click();
      });

      await page.waitForURL('**/dashboard', { timeout: 30000 });
      console.log('✓ Login successful');
    });

    // Dismiss any modals/dialogs
    await test.step('Dismiss onboarding dialogs', async () => {
      await dismissModals(page);
    });

    // =====================================================
    // STEP 1: Verify Purchasing General Settings
    // =====================================================
    await test.step('Verify Purchasing General Settings', async () => {
      await page.goto(`${BASE_URL}/settings_new/purchasing`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      await dismissModals(page);

      // Click on General Settings
      const generalSettingsItem = page.getByRole('listitem').filter({ hasText: 'General Settings' });
      await generalSettingsItem.waitFor({ state: 'visible', timeout: 15000 });
      await generalSettingsItem.click();

      // Wait for the configuration page
      await page.waitForURL('**/purchasing/configuration**', { timeout: 15000 });
      await page.waitForTimeout(2000);

      // Verify "Require Vendor Approval?" is ON (Yes)
      const vendorApprovalRow = page.locator('div').filter({ hasText: /^Require Vendor Approval\?/ }).first();
      await expect(vendorApprovalRow.locator('..'))
        .toContainText('Yes', { timeout: 10000 });
      console.log('✓ Require Vendor Approval is ON');

      // Verify "Automatically Send PO to Vendor after Approval?" is Off (No)
      const autoSendRow = page.locator('div').filter({ hasText: /^Automatically Send PO to Vendor after Approval\?/ }).first();
      await expect(autoSendRow.locator('..'))
        .toContainText('No', { timeout: 10000 });
      console.log('✓ Automatically Send PO to Vendor after Approval is Off');
    });

    // =====================================================
    // STEP 2: Navigate to Purchase Orders and create new PO
    // =====================================================
    let poUrl: string;
    await test.step('Create new Purchase Order as Draft', async () => {
      // Navigate to PO creation page
      await page.goto(`${BASE_URL}/purchase_order/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      await dismissModals(page);

      // Fill PO Title
      const poTitleInput = page.getByRole('textbox', { name: 'PO Title *' });
      await poTitleInput.waitFor({ state: 'visible', timeout: 15000 });
      await poTitleInput.fill(`PO Lifecycle Test ${Date.now()}`);

      // Select Vendor - Jacksonville Roofing USA
      const vendorInput = page.getByRole('textbox', { name: 'Vendor *' });
      await vendorInput.click();
      await page.waitForTimeout(1000);

      // Wait for vendor dialog and select Jacksonville Roofing USA
      const vendorRadio = page.getByRole('radio', { name: /Jacksonville Roofing USA/ });
      await vendorRadio.waitFor({ state: 'visible', timeout: 10000 });
      await vendorRadio.click();

      // Click Choose Vendor button
      const chooseVendorBtn = page.getByRole('button', { name: 'Choose Vendor' });
      await chooseVendorBtn.waitFor({ state: 'visible', timeout: 5000 });
      await chooseVendorBtn.click();
      await page.waitForTimeout(2000);

      // Fill Required By date - click and select a future date
      const requiredByInput = page.getByRole('textbox', { name: 'Required By *' });
      await requiredByInput.click();
      await page.waitForTimeout(1000);

      // Select a date ~2 weeks from now
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      const dateLabel = `${monthNames[futureDate.getMonth()]} ${futureDate.getDate()},`;
      const dateButton = page.getByRole('button', { name: dateLabel });
      await dateButton.waitFor({ state: 'visible', timeout: 5000 });
      await dateButton.click();
      await page.waitForTimeout(500);

      // Scroll down to PO Items section and click Add
      const poItemsSection = page.getByRole('button', { name: /PO Items/ });
      await poItemsSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);

      // Click the Add button inside PO Items region
      const addButton = page.getByRole('region', { name: /PO Items/ }).getByRole('button', { name: /Add/ });
      await addButton.waitFor({ state: 'visible', timeout: 10000 });
      await addButton.click();
      await page.waitForTimeout(500);

      // Click "Line Item" from dropdown menu
      const lineItemOption = page.getByRole('menuitem', { name: 'Line Item', exact: true });
      await lineItemOption.waitFor({ state: 'visible', timeout: 5000 });
      await lineItemOption.click();
      await page.waitForTimeout(2000);

      // In the catalogue, select Cleaning part checkbox
      const cleaningCheckbox = page.getByRole('checkbox', { name: '123' });
      await cleaningCheckbox.waitFor({ state: 'visible', timeout: 10000 });
      await cleaningCheckbox.click();
      await page.waitForTimeout(1000);

      // Fill Required Qty - wait for it to become enabled after checkbox selection
      const qtyInput = page.locator('#qty_0_0');
      await qtyInput.waitFor({ state: 'visible', timeout: 5000 });
      await qtyInput.click();
      await qtyInput.fill('1');

      // Click Add Item
      const addItemBtn = page.getByRole('button', { name: 'Add Item' });
      await addItemBtn.click();
      await page.waitForTimeout(2000);

      // Save as Draft - click the text element in the nav bar
      const saveDraftText = page.getByText('Save as Draft', { exact: true }).first();
      await saveDraftText.waitFor({ state: 'visible', timeout: 10000 });
      await saveDraftText.click();
      await page.waitForTimeout(1000);

      // Confirm Save as Draft in dialog
      const saveDraftBtn = page.getByRole('button', { name: 'Save as Draft' });
      await saveDraftBtn.waitFor({ state: 'visible', timeout: 10000 });
      await saveDraftBtn.click();

      // Wait for redirect to PO details page
      await page.waitForURL('**/purchase_order/*/details', { timeout: 30000 });
      poUrl = page.url();
      console.log(`✓ PO created as Draft: ${poUrl}`);
    });

    // =====================================================
    // STEP 3: Draft -> Submit
    // =====================================================
    await test.step('Submit PO (Draft -> Submitted)', async () => {
      await page.waitForTimeout(2000);
      await dismissModals(page);

      // Click "Mark as Submitted" text
      const markSubmittedText = page.getByText('Mark as Submitted', { exact: true }).first();
      await markSubmittedText.waitFor({ state: 'visible', timeout: 15000 });
      await markSubmittedText.click();
      await page.waitForTimeout(1000);

      // Confirm in dialog
      const markSubmittedBtn = page.getByRole('button', { name: 'Mark as Submitted' });
      await markSubmittedBtn.waitFor({ state: 'visible', timeout: 10000 });
      await markSubmittedBtn.click();
      await page.waitForTimeout(3000);
      console.log('✓ PO Submitted');
    });

    // =====================================================
    // STEP 4: Check More Options -> Mark as Rejected present, then Approve
    // =====================================================
    await test.step('Verify More Actions has Mark as Rejected option', async () => {
      // Click More Actions
      const moreActionsText = page.getByText('More Actions').first();
      await moreActionsText.waitFor({ state: 'visible', timeout: 10000 });
      await moreActionsText.click();
      await page.waitForTimeout(2000);

      // Assert: Mark as Rejected should be present in the dropdown menu
      const markRejected = page.getByRole('menuitem', { name: /Mark as Rejected/ });
      await expect(markRejected).toBeVisible({ timeout: 5000 });
      console.log('✓ Assert: Mark as Rejected is present in More Actions');

      // Press Escape to close the dropdown
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    });

    await test.step('Mark as Approved', async () => {
      // Click Mark as Approved text in the action bar
      const markApprovedText = page.getByText('Mark as Approved', { exact: true }).first();
      await markApprovedText.waitFor({ state: 'visible', timeout: 10000 });
      await markApprovedText.click();
      await page.waitForTimeout(1000);

      // Confirm approval in dialog
      const confirmApprovedBtn = page.getByRole('button', { name: /Mark as Approved/ });
      await confirmApprovedBtn.waitFor({ state: 'visible', timeout: 10000 });
      await confirmApprovedBtn.click();
      await page.waitForTimeout(3000);
      console.log('✓ PO Approved');
    });

    // =====================================================
    // STEP 5: Send to Vendor with email
    // =====================================================
    await test.step('Send to Vendor via email', async () => {
      // Click "Send to Vendor" button
      const sendToVendorText = page.getByText('Send to Vendor', { exact: true }).first();
      await sendToVendorText.waitFor({ state: 'visible', timeout: 15000 });
      await sendToVendorText.click();
      await page.waitForTimeout(3000);

      // Wait for email dialog to appear
      const emailField = page.getByRole('textbox', { name: 'Email *' });
      await emailField.waitFor({ state: 'visible', timeout: 15000 });

      // Fill email address - clear existing and type new
      await emailField.fill('ramanathan.m@zuper.co');

      // Fill Subject
      const subjectField = page.getByRole('textbox', { name: 'Email Subject *' });
      await subjectField.waitFor({ state: 'visible', timeout: 5000 });
      await subjectField.fill('Test');

      // Fill Body in TinyMCE rich text editor (iframe)
      const bodyFrame = page.frameLocator('iframe').last();
      const bodyElement = bodyFrame.locator('body');
      await bodyElement.click();
      await bodyElement.fill('Test');
      await page.waitForTimeout(500);

      // Assert: "Send as PDF" checkbox should be checked (enabled)
      const pdfCheckbox = page.getByRole('checkbox', { name: 'Send as PDF' });
      await expect(pdfCheckbox).toBeChecked({ timeout: 5000 });
      console.log('✓ Assert: Send as PDF checkbox is checked/enabled');

      // Click Send button
      const sendBtn = page.getByRole('button', { name: 'Send', exact: true });
      await sendBtn.click();
      await page.waitForTimeout(5000);
      console.log('✓ Email sent to vendor');
    });

    // =====================================================
    // STEP 6: Check More Options -> Edit PO available (after sent to vendor)
    // =====================================================
    await test.step('Verify Edit PO is available after sending to vendor', async () => {
      const moreActionsText = page.getByText('More Actions').first();
      await moreActionsText.waitFor({ state: 'visible', timeout: 10000 });
      await moreActionsText.click();
      await page.waitForTimeout(2000);

      // Assert: Edit PO should be available as a menu item
      const editPO = page.getByRole('menuitem', { name: /Edit PO/ });
      await expect(editPO).toBeVisible({ timeout: 5000 });
      console.log('✓ Assert: Edit PO is available (after Send to Vendor)');

      // Press Escape to close the dropdown
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    });

    // =====================================================
    // STEP 7: Mark as Vendor Accepted
    // =====================================================
    await test.step('Mark as Vendor Accepted', async () => {
      const markVendorAcceptedText = page.getByText('Mark as Vendor Accepted', { exact: true }).first();
      await markVendorAcceptedText.waitFor({ state: 'visible', timeout: 10000 });
      await markVendorAcceptedText.click();
      await page.waitForTimeout(1000);

      // Confirm in dialog
      const confirmBtn = page.getByRole('button', { name: /Mark as Vendor Accepted/ });
      await confirmBtn.waitFor({ state: 'visible', timeout: 10000 });
      await confirmBtn.scrollIntoViewIfNeeded();
      await confirmBtn.click({ timeout: 10000 });
      await page.waitForTimeout(3000);
      console.log('✓ Vendor Accepted');
    });

    // =====================================================
    // STEP 8: Check More Options -> Edit PO available (after vendor accepted)
    // =====================================================
    await test.step('Verify Edit PO is available after vendor accepted', async () => {
      const moreActionsText = page.getByText('More Actions').first();
      await moreActionsText.waitFor({ state: 'visible', timeout: 10000 });
      await moreActionsText.click();
      await page.waitForTimeout(2000);

      // Assert: Edit PO should be available as a menu item
      const editPO = page.getByRole('menuitem', { name: /Edit PO/ });
      await expect(editPO).toBeVisible({ timeout: 5000 });
      console.log('✓ Assert: Edit PO is available (after Vendor Accepted)');

      // Press Escape to close the dropdown
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    });

    // =====================================================
    // STEP 9: Receive Items
    // =====================================================
    await test.step('Receive Items with qty 1', async () => {
      // Click "Receive Items"
      const receiveItemsText = page.getByText('Receive Items', { exact: true }).first();
      await receiveItemsText.waitFor({ state: 'visible', timeout: 10000 });
      await receiveItemsText.click();
      await page.waitForTimeout(2000);

      // Fill receiving qty
      const qtyInput = page.getByPlaceholder('Eg: 2', { exact: true }).first();
      await qtyInput.waitFor({ state: 'visible', timeout: 15000 });
      await qtyInput.click();
      await qtyInput.fill('1');

      // Click Submit/Update button
      const updateBtn = page.getByRole('button', { name: 'Update' });
      await updateBtn.waitFor({ state: 'visible', timeout: 10000 });
      await updateBtn.click();
      await page.waitForTimeout(3000);
      console.log('✓ Items received with qty 1');
    });

    // =====================================================
    // STEP 10: Check More Options -> Edit PO should NOT be available
    // =====================================================
    await test.step('Verify Edit PO is NOT available after receiving items', async () => {
      const moreActionsText = page.getByText('More Actions').first();
      await moreActionsText.waitFor({ state: 'visible', timeout: 10000 });
      await moreActionsText.click();
      await page.waitForTimeout(2000);

      // Assert: Edit PO should NOT be available
      const editPO = page.getByRole('menuitem', { name: /Edit PO/ });
      await expect(editPO).not.toBeVisible({ timeout: 5000 });
      console.log('✓ Assert: Edit PO is NOT available (after Receive Items)');

      // Press Escape to close the dropdown
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    });

    // =====================================================
    // STEP 11: Mark as Invoiced
    // =====================================================
    await test.step('Mark as Invoiced', async () => {
      const markInvoicedText = page.getByText('Mark as Invoiced', { exact: true }).first();
      await markInvoicedText.waitFor({ state: 'visible', timeout: 10000 });
      await markInvoicedText.click();
      await page.waitForTimeout(1000);

      // Confirm
      const confirmBtn = page.getByRole('button', { name: 'Mark as Invoiced' });
      await confirmBtn.waitFor({ state: 'visible', timeout: 10000 });
      await confirmBtn.click();
      await page.waitForTimeout(3000);
      console.log('✓ Marked as Invoiced');
    });

    // =====================================================
    // STEP 12: Mark as Paid
    // =====================================================
    await test.step('Mark as Paid with comment', async () => {
      const markPaidText = page.getByText('Mark as Paid', { exact: true }).first();
      await markPaidText.waitFor({ state: 'visible', timeout: 10000 });
      await markPaidText.click();
      await page.waitForTimeout(1000);

      // Enter comment "payment received" in the reason field
      const reasonField = page.locator('#reason');
      await reasonField.waitFor({ state: 'visible', timeout: 10000 });
      await reasonField.fill('payment received');

      // Confirm
      const confirmBtn = page.getByRole('button', { name: 'Mark as Paid' });
      await confirmBtn.waitFor({ state: 'visible', timeout: 10000 });
      await confirmBtn.click();
      await page.waitForTimeout(3000);
      console.log('✓ Marked as Paid with comment: payment received');
    });

    // =====================================================
    // STEP 13: Close PO
    // =====================================================
    await test.step('Close PO', async () => {
      const closePOText = page.getByText('Close PO', { exact: true }).first();
      await closePOText.waitFor({ state: 'visible', timeout: 10000 });
      await closePOText.click();
      await page.waitForTimeout(1000);

      // Confirm PO closure
      const confirmBtn = page.getByRole('button', { name: 'Mark as Closed' });
      await confirmBtn.waitFor({ state: 'visible', timeout: 10000 });
      await confirmBtn.click();
      await page.waitForTimeout(3000);
      console.log('✓ PO Closed successfully');
    });

    console.log('\n✓ Complete PO Lifecycle workflow passed successfully!');
  });
});
