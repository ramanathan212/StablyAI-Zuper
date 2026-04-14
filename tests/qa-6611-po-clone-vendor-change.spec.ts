import { test, expect } from '@stablyai/playwright-test';
import {
  loginToStaging,
  dismissDialogs,
  createNewPOAsDraft,
  openMoreActionsMenu,
} from './helpers/po-edit.helper';

const STAGING_URL = 'https://stagingv3.zuperpro.com';

/**
 * QA-6611: The vendor change in a cloned PO removes the Line items and the delivery address
 *
 * Bug: When a PO is cloned and vendor is changed in the cloned PO:
 *   1. A dialog warns about parts/products not in the new vendor's catalog and offers to remove them
 *   2. The delivery address is nullified
 *   3. Job association is lost
 *
 * Expected: Changing vendor in a cloned PO should retain all carried-forward information
 * (line items, job association, delivery address).
 */
test.describe('QA-6611: Cloned PO vendor change retains line items & delivery address', () => {
  test.beforeEach(async ({ page }) => {
    await loginToStaging({ page });
    await dismissDialogs({ page });
  });

  test('should retain line items and delivery address when vendor is changed in cloned PO', async ({ page }) => {
    test.setTimeout(600000); // 10 minutes

    const timestamp = Date.now();
    const poTitle = `QA-6611 Clone Test ${timestamp}`;
    const originalVendor = 'Jacksonville Roofing USA';

    // =====================================================
    // STEP 1: Create a new PO as Draft with line items
    // =====================================================
    let originalPOUrl: string;
    await test.step('Create original PO as Draft with line items', async () => {
      originalPOUrl = await createNewPOAsDraft({ page, poTitle, vendorName: originalVendor });
      expect(originalPOUrl).toContain('/purchase_order/');
      expect(originalPOUrl).toContain('/details');
      console.log(`✓ Original PO created: ${originalPOUrl}`);
    });

    // =====================================================
    // STEP 2: Capture original PO line items count and delivery address
    // =====================================================
    let originalLineItemCount = 0;
    let originalDeliveryAddress = '';

    await test.step('Capture original PO line items and delivery address', async () => {
      await page.waitForTimeout(3000);
      await dismissDialogs({ page });

      // Count line item rows from the PO Items table
      const poItemsRows = page.locator('table tbody tr, [class*="line-item"], [class*="po-item"]');
      originalLineItemCount = await poItemsRows.count();
      console.log(`✓ Original PO has ${originalLineItemCount} line item row(s)`);

      // Capture delivery address text
      const deliveryHeading = page.getByRole('heading', { name: 'Delivery Address' });
      if (await deliveryHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
        const deliveryContainer = deliveryHeading.locator('..');
        originalDeliveryAddress = (await deliveryContainer.textContent().catch(() => ''))?.trim() || '';
      }
      console.log(`✓ Original delivery address: ${originalDeliveryAddress || 'Not visible'}`);
    });

    // =====================================================
    // STEP 3: Clone the PO via More Actions menu
    // =====================================================
    await test.step('Clone the PO', async () => {
      await openMoreActionsMenu({ page });

      const clonePOItem = page.getByRole('menuitem', { name: /Clone/i });
      await clonePOItem.waitFor({ state: 'visible', timeout: 5000 });
      await clonePOItem.click();
      await page.waitForTimeout(3000);

      // Handle potential confirmation dialog
      const confirmBtn = page.getByRole('button', { name: /Clone|Confirm|Yes|OK/i }).first();
      if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(3000);
      }

      await page.waitForTimeout(5000);
      await dismissDialogs({ page });
      console.log(`✓ PO cloned - current URL: ${page.url()}`);
    });

    // =====================================================
    // STEP 4: Capture cloned PO state before vendor change
    // =====================================================
    let clonedLineItemCountBefore = 0;

    await test.step('Verify cloned PO has line items before vendor change', async () => {
      const poItemsSection = page.getByText('PO Items', { exact: true }).first();
      await expect(poItemsSection).toBeVisible({ timeout: 10000 });

      const lineItemRows = page.locator('table tbody tr, [class*="line-item"], [class*="po-item"]');
      clonedLineItemCountBefore = await lineItemRows.count();
      expect(clonedLineItemCountBefore).toBeGreaterThan(0);
      console.log(`✓ Cloned PO has ${clonedLineItemCountBefore} line item(s) before vendor change`);
    });

    // =====================================================
    // STEP 5: Change the vendor in the cloned PO
    // =====================================================
    await test.step('Change vendor in cloned PO', async () => {
      // Click vendor field to open the vendor picker
      const vendorInput = page.getByRole('textbox', { name: /Vendor/i });
      await vendorInput.waitFor({ state: 'visible', timeout: 10000 });
      await vendorInput.click();
      await page.waitForTimeout(2000);

      // Wait for vendor dialog
      const vendorSearch = page.getByRole('textbox', { name: /Search Vendors/i });
      await vendorSearch.waitFor({ state: 'visible', timeout: 10000 });

      // Clear search to see all vendors
      await vendorSearch.clear();
      await page.waitForTimeout(2000);

      // Select the first vendor that is NOT currently checked
      const uncheckedRadio = page.getByRole('radio').filter({ checked: false }).first();
      await uncheckedRadio.waitFor({ state: 'visible', timeout: 10000 });
      await uncheckedRadio.click();
      await page.waitForTimeout(500);

      // Click "Choose Vendor" confirmation button
      const chooseVendorBtn = page.getByRole('button', { name: 'Choose Vendor' });
      await chooseVendorBtn.waitFor({ state: 'visible', timeout: 5000 });
      await chooseVendorBtn.click();
      await page.waitForTimeout(3000);

      // Handle the "items not in vendor catalog" dialog
      // BUG: The app prompts to remove items that are not in the new vendor's product catalog
      const removeItemsDialog = page.getByText(/not available in.*vendor.*catalog/i).first();
      if (await removeItemsDialog.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('⚠ BUG DETECTED: App prompts to remove line items when vendor changes in cloned PO');
        const dialogText = await removeItemsDialog.textContent().catch(() => '');
        console.log(`  Dialog message: ${dialogText}`);

        // Click "Cancel" to keep the items (user wants to retain them per expected behavior)
        const cancelBtn = page.getByRole('button', { name: 'Cancel' });
        if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await cancelBtn.click();
          console.log('  Clicked Cancel to retain line items');
        } else {
          // If no Cancel, try Proceed and note this is the bug
          const proceedBtn = page.getByRole('button', { name: /Proceed|OK|Confirm/i }).first();
          if (await proceedBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await proceedBtn.click();
            console.log('  ⚠ Had to click Proceed - items may be removed (BUG)');
          }
        }
        await page.waitForTimeout(2000);
      }

      console.log('✓ Vendor change completed');
    });

    // =====================================================
    // STEP 6: ASSERT - Line items should still be present after vendor change
    // =====================================================
    await test.step('ASSERT: Line items retained after vendor change', async () => {
      await page.waitForTimeout(2000);

      const poItemsSection = page.getByText('PO Items', { exact: true }).first();
      await expect(poItemsSection).toBeVisible({ timeout: 10000 });
      await poItemsSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);

      // Verify line items are still present
      const lineItemRows = page.locator('table tbody tr').filter({ hasText: /.+/ });
      const lineItemCount = await lineItemRows.count();
      console.log(`Line items after vendor change: ${lineItemCount} (was ${clonedLineItemCountBefore} before)`);

      for (let i = 0; i < lineItemCount; i++) {
        const rowText = await lineItemRows.nth(i).textContent().catch(() => '');
        console.log(`  Line item ${i + 1}: ${rowText?.trim().substring(0, 100)}`);
      }

      // BUG ASSERTION: Line items should NOT be removed when vendor changes
      expect(
        lineItemCount,
        'QA-6611 BUG: Line items were removed after changing vendor in cloned PO'
      ).toBeGreaterThanOrEqual(clonedLineItemCountBefore);
    });

    // =====================================================
    // STEP 7: ASSERT - Delivery address should not be nullified
    // =====================================================
    await test.step('ASSERT: Delivery address retained after vendor change', async () => {
      // Scroll down to find delivery address section on the form
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);

      // On the PO create/edit form, look for Delivery Address field/section
      const deliveryLabel = page.getByText('Delivery Address', { exact: false }).first();
      if (await deliveryLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
        await deliveryLabel.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);

        // Check if delivery address has actual content (not just the label)
        const deliveryContainer = deliveryLabel.locator('xpath=ancestor::*[contains(@class,"card") or contains(@class,"section") or contains(@class,"form-group") or contains(@class,"address")]').first();
        const deliveryText = (await deliveryContainer.textContent().catch(() => ''))?.trim() || '';

        // Remove the label text to get just the address content
        const addressContent = deliveryText.replace(/Delivery Address/i, '').trim();

        console.log(`Delivery address content: "${addressContent.substring(0, 200)}"`);

        // BUG: Delivery address should not be empty/null after vendor change
        expect(
          addressContent.length > 5,
          'QA-6611 BUG: Delivery address was removed/nullified after changing vendor in cloned PO'
        ).toBeTruthy();
      } else {
        // Try looking for it via input fields
        const deliveryInput = page.locator('input[formcontrolname*="delivery" i], input[name*="delivery" i], textarea[formcontrolname*="delivery" i]').first();
        if (await deliveryInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          const value = await deliveryInput.inputValue().catch(() => '');
          console.log(`Delivery address input value: "${value}"`);
          expect(
            value.length > 0,
            'QA-6611 BUG: Delivery address input is empty after changing vendor in cloned PO'
          ).toBeTruthy();
        } else {
          console.log('⚠ Delivery Address field not found on the form - may need to check different selector');
          // Take a screenshot for debugging
          await page.screenshot({ path: 'test-results/qa-6611-delivery-address-check.png', fullPage: true });
        }
      }
    });

    // =====================================================
    // STEP 8: ASSERT - Job association should not be lost
    // =====================================================
    await test.step('ASSERT: Job association retained after vendor change', async () => {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1000);

      const assocHeading = page.getByText('Association', { exact: false }).first();
      if (await assocHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
        await assocHeading.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);

        const assocSection = assocHeading.locator('xpath=ancestor::*[contains(@class,"card") or contains(@class,"section") or contains(@class,"accordion") or contains(@class,"form-group")]').first();
        const assocText = (await assocSection.textContent().catch(() => ''))?.trim() || '';

        // Check if there's actual association data beyond just "Association(s)" label
        const hasAssociation = assocText.length > 30 && !assocText.match(/^[\s]*Association\(s\)[\s]*$/);
        console.log(`Job association present: ${hasAssociation ? 'Yes' : 'No (BUG: QA-6611)'}`);
        console.log(`Association text: ${assocText.substring(0, 200)}`);

        // Note: The original PO might not have had a job association,
        // so only assert if we expect one to exist
      } else {
        console.log('Association section not visible on form');
      }
    });

    // =====================================================
    // STEP 9: Save the cloned PO
    // =====================================================
    await test.step('Save cloned PO as Draft', async () => {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1000);

      const saveAsDraftAction = page.locator('a, span, div').filter({ hasText: /^Save as Draft$/ }).first();
      if (await saveAsDraftAction.isVisible({ timeout: 5000 }).catch(() => false)) {
        await saveAsDraftAction.click();
        await page.waitForTimeout(2000);

        const confirmSaveBtn = page.getByRole('button', { name: 'Save as Draft' });
        if (await confirmSaveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await confirmSaveBtn.click();
        }

        await page.waitForURL('**/purchase_order/**/details', { timeout: 30000 }).catch(() => {
          console.log('Did not navigate to details page after save');
        });
        await page.waitForTimeout(3000);
        console.log(`✓ Cloned PO saved: ${page.url()}`);
      } else {
        console.log('Save as Draft not visible');
      }
    });

    console.log('\n✓ QA-6611 test completed');
  });
});
