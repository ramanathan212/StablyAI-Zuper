export class PurchaseOrderPage {
  constructor(page) {
    this.page = page;
    this.notificationDenyButton = page.getByRole('button', { name: 'No, thanks' });
    this.markSubmittedButton = page.getByRole('button', { name: 'Mark as Submitted' });
    this.moreActionsLink = page.locator('a').filter({ hasText: 'More Actions' });
    this.markSentToVendorMenuItem = page.locator("span:has-text('Send to Vendor'), //span[normalize-space(text())='Mark as Sent to Vendor']").first();
    this.markSentToVendorButton = page.getByRole('button', { name: 'Mark as Sent to Vendor' });
    this.markVendorAcceptedButton = page.getByRole('button', { name: 'Mark as Vendor Accepted' });
    this.updateButton = page.getByRole('button', { name: 'Update' });
    this.markAsInvoicedButton = page.locator('a:has-text("Mark as Invoiced")');
    this.confirmMarkAsInvoicedButton = page.getByRole('button', { name: 'Mark as Invoiced' });
    this.markAsPaidLocator = page.locator('a:has-text("Mark as Paid")');
    this.markAsPaidButton = page.locator('span.ng-tns-c3121319209-153.ng-star-inserted');
    this.confirmMarkAsPaidButton = page.getByRole('button', { name: 'Mark as Paid' });
    this.markClosedButton = page.locator('span:has-text("Close PO")');
    this.confirmPOClosureButton = page.getByRole('button', { name: 'Mark as Closed' });
  }

  async _dismissNotificationDialog() {
    try {
      if (await this.notificationDenyButton.isVisible({ timeout: 3000 })) {
        await this.notificationDenyButton.click();
        console.log('✓ Dismissed notification dialog');
      }
    } catch (_) {}

    // Dismiss "Trial Period Ending Soon" modal via X button
    try {
      const closeButton = this.page.locator('.cdk-overlay-container button.close, .cdk-overlay-container .close, .cdk-overlay-container [aria-label="Close"]').first();
      if (await closeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeButton.click();
        await this.page.waitForTimeout(500);
        console.log('✓ Trial modal dismissed');
      }
    } catch (_) {}

    // Dismiss any remaining backdrop by pressing Escape
    try {
      const backdrop = this.page.locator('.cdk-overlay-backdrop');
      if (await backdrop.isVisible({ timeout: 2000 }).catch(() => false)) {
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(500);
      }
    } catch (_) {}
  }

  async markAsSubmitted() {
    await this.page.waitForLoadState('load');
    await this._dismissNotificationDialog();
    const markAsSubmittedSpan = this.page.locator("//span[normalize-space(text())='Mark as Submitted']");
    await markAsSubmittedSpan.waitFor({ state: 'visible', timeout: 15000 });
    await markAsSubmittedSpan.click();
    await this.markSubmittedButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.markSubmittedButton.click();
    await this.page.waitForLoadState('load');
  }

  async markAsSentToVendor() {
    // Wait for page to load and More Actions link to be visible
    await this.page.waitForLoadState('load');
    await this._dismissNotificationDialog();
    await this.page.waitForTimeout(1500);

    // Re-query the locator right before clicking to avoid stale DOM reference
    await this.page.locator('a').filter({ hasText: 'More Actions' }).first().waitFor({ state: 'visible', timeout: 10000 });
    await this.page.locator('a').filter({ hasText: 'More Actions' }).first().click();

    // Wait for dropdown menu to appear
    await this.page.waitForTimeout(2000);

    // Try multiple selectors for "Send to Vendor" / "Mark as Sent to Vendor" menu item
    const sentToVendorSelectors = [
      "//span[normalize-space(text())='Mark as Sent to Vendor']",
      "span:has-text('Mark as Sent to Vendor')",
    ];

    let clicked = false;
    for (const selector of sentToVendorSelectors) {
      try {
        const el = this.page.locator(selector).first();
        if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
          await el.scrollIntoViewIfNeeded();
          await el.click();
          clicked = true;
          console.log(`✓ Clicked Sent to Vendor using: ${selector}`);
          break;
        }
      } catch (_) { continue; }
    }

    if (!clicked) {
      // Debug: log what's visible in the dropdown
      const allMenuItems = await this.page.locator('span, a, li').filter({ hasText: /Vendor|Sent|Submitted/ }).allTextContents().catch(() => []);
      console.log('Available menu items:', allMenuItems.slice(0, 10));
      throw new Error('Could not find Mark as Sent to Vendor menu item');
    }

    // Wait for confirmation dialog
    await this.page.waitForTimeout(1000);

    // Wait for confirmation button to be visible
    await this.markSentToVendorButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.markSentToVendorButton.click();
    await this.page.waitForLoadState('load');
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    console.log('✓ Marked as Sent to Vendor');
  }

  async markAsVendorAccepted() {
    

    // // Close any blocking dialog from previous action
    // const closeButton = this.page.locator('.rounded-full.flex.justify-center.items-center.cursor-pointer');
    // if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    //   await closeButton.click();
    //   await this.page.waitForTimeout(500);
    //   console.log('Closed blocking dialog');
    // }

    // Find and click the vendor accepted span/link with multiple strategies
    try {
      console.log('Trying Strategy 1: has-text selector...');
      const markAsVendorAcceptedSpan = this.page.locator("span:has-text('Mark as Vendor Accepted')").first();
      await markAsVendorAcceptedSpan.waitFor({ state: 'visible', timeout: 10000 });
      await markAsVendorAcceptedSpan.click();
      console.log('✓ Strategy 1 succeeded - clicked using has-text');
    } catch (error1) {
      try {
        console.log('Strategy 1 failed, trying Strategy 2: XPath locator...');
        const markAsVendorAcceptedSpan = this.page.locator("//span[@class='primary-font text-base mt-0.5 ml-2']");
        await markAsVendorAcceptedSpan.waitFor({ state: 'visible', timeout: 10000 });
        await markAsVendorAcceptedSpan.click();
        console.log('✓ Strategy 2 succeeded - clicked using XPath');
      } catch (error2) {
        try {
          console.log('Strategy 2 failed, trying Strategy 3: XPath with text...');
          const markAsVendorAcceptedSpan = this.page.locator("//span[normalize-space(text())='Mark as Vendor Accepted']");
          await markAsVendorAcceptedSpan.waitFor({ state: 'visible', timeout: 10000 });
          await markAsVendorAcceptedSpan.click();
          console.log('✓ Strategy 3 succeeded - clicked using XPath with text');
        } catch (error3) {
          console.error('❌ All strategies failed to click Mark as Vendor Accepted link');
          throw new Error(`Failed to click Mark as Vendor Accepted: ${error3.message}`);
        }
      }
    }

    // Wait for dialog/modal to appear
    await this.page.waitForTimeout(1500);

    // Try multiple strategies to click the button
    try {
      // Strategy 1: Try the button locator with force click
      console.log('Trying Strategy 1: getByRole button...');
      await this.markVendorAcceptedButton.waitFor({ state: 'visible', timeout: 10000 });
      await this.markVendorAcceptedButton.scrollIntoViewIfNeeded();
      await this.markVendorAcceptedButton.click({ force: true });
      console.log('Strategy 1 succeeded');
    } catch (error1) {
      try {
        // Strategy 2: Try finding button with has-text selector
        console.log('Strategy 1 failed, trying Strategy 2: has-text button...');
        const buttonElement = this.page.locator('button:has-text("Mark as Vendor Accepted")');
        await buttonElement.waitFor({ state: 'visible', timeout: 10000 });
        await buttonElement.scrollIntoViewIfNeeded();
        await buttonElement.click({ force: true });
        console.log('Strategy 2 succeeded');
      } catch (error2) {
        try {
          // Strategy 3: Try JavaScript click
          console.log('Strategy 2 failed, trying Strategy 3: JavaScript click...');
          await this.markVendorAcceptedButton.evaluate(el => el.click());
          console.log('Strategy 3 succeeded');
        } catch (error3) {
          // Strategy 4: Last resort - find any button in dialog with primary class
          console.log('Strategy 3 failed, trying Strategy 4: primary button...');
          const primaryButton = this.page.locator('button.bg-primary, button[type="submit"]').last();
          await primaryButton.waitFor({ state: 'visible', timeout: 8000 });
          await primaryButton.click({ force: true });
          console.log('Strategy 4 succeeded');
        }
      }
    }

    await this.page.waitForLoadState('load');
    console.log('✓ Marked as Vendor Accepted');
  }

  async updateReceivedQuantities(items) {
    // Wait for page to stabilize first
    try {
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });
    } catch (error) {
      console.log('⚠️  Page networkidle timeout, continuing with load state...');
      await this.page.waitForLoadState('load');
    }
    await this.page.waitForTimeout(2000);

    // Try to find and click "Receive Items" button/link
    let receiveItemsClicked = false;

    // Strategy 1: Try common selectors for receive items
    const receiveItemsSelectors = [
      "//span[contains(text(), 'Receive Items')]",
      "//a[contains(text(), 'Receive Items')]",
      "button:has-text('Receive Items')",
      "a:has-text('Receive Items')",
      ".receive-items, [class*='receive']"
    ];

    for (const selector of receiveItemsSelectors) {
      try {
        const receiveItemsElement = this.page.locator(selector).first();
        if (await receiveItemsElement.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log(`✓ Found Receive Items using selector: ${selector}`);
          await receiveItemsElement.scrollIntoViewIfNeeded();
          await receiveItemsElement.click();
          receiveItemsClicked = true;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!receiveItemsClicked) {
      console.log('⚠️  Receive Items button not found, assuming form is already open');
    }

    // Wait for the receive quantities form/dialog to load
    // Using 'load' instead of 'networkidle' to avoid timeout issues
    try {
      await this.page.waitForLoadState('load', { timeout: 15000 });
    } catch (error) {
      console.log('⚠️  Page load timeout, continuing anyway...');
    }
    await this.page.waitForTimeout(1500);

    for (const item of items) {
      console.log(`Updating quantities for product: ${item.product}`);

      // Use a flexible regex pattern that matches the product identifier at the start of the row name
      // Row name format: "#001 - Monitor M94 1 No" where we match "#001 - Monitor"
      const row = this.page.getByRole('row', { name: new RegExp(item.product.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });

      // Wait for quantity input to be visible and ready
      const quantityInput = row.getByPlaceholder('Eg: 2', { exact: true });
      await quantityInput.waitFor({ state: 'visible', timeout: 50000 });
      await quantityInput.scrollIntoViewIfNeeded();
      await quantityInput.click();
      await quantityInput.clear();
      await quantityInput.fill(item.quantity);

      // Wait for remarks input to be visible and ready
      const remarksInput = row.getByPlaceholder('Remarks');
      await remarksInput.waitFor({ state: 'visible', timeout: 10000 });
      await remarksInput.scrollIntoViewIfNeeded();
      await remarksInput.click();
      await remarksInput.clear();
      await remarksInput.fill(item.remarks);

      console.log(`✓ Updated ${item.product}: Qty=${item.quantity}, Remarks=${item.remarks}`);
    }
  }

  async clickUpdateButton() {
    // Wait for page to stabilize 
    await this.page.waitForTimeout(1000);

    // Wait for update button to be visible and enabled
    await this.updateButton.waitFor({ state: 'visible', timeout: 15000 });
    await this.updateButton.scrollIntoViewIfNeeded();

    // Ensure button is enabled before clicking
    const isEnabled = await this.updateButton.isEnabled();
    if (!isEnabled) {
      console.log('Update button is disabled, waiting for it to be enabled...');
      await this.page.waitForTimeout(2000);
    }

    // Click update button
    await this.updateButton.click();
    await this.page.waitForLoadState('load');
    console.log('✓ Update button clicked successfully');
  }

  async markAsInvoiced() {
    await this.page.waitForTimeout(1500);

    // Click "Mark as Invoiced" span/link
    await this.markAsInvoicedButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.markAsInvoicedButton.click();

    // Wait for confirmation dialog
    // await this.page.waitForLoadState('networkidle');

    // Click the confirmation button
    await this.confirmMarkAsInvoicedButton.waitFor({ state: 'visible', timeout: 25000 });
    await this.confirmMarkAsInvoicedButton.click();

    await this.page.waitForLoadState('load');
    console.log('✓ Marked as Invoiced');
  }

  async markAsPaid() {
    await this.page.waitForLoadState('load');

    // Click the mark as paid span/link
    await this.markAsPaidLocator.waitFor({ state: 'visible', timeout: 10000 });
    await this.markAsPaidLocator.scrollIntoViewIfNeeded();
    await this.markAsPaidLocator.click();

    // Wait for dialog to appear
    await this.page.waitForTimeout(1000);

    // Enter remark "Payment confirmed" in the reason field
    const reasonField = this.page.locator('#reason');
    await reasonField.waitFor({ state: 'visible', timeout: 10000 });
    await reasonField.scrollIntoViewIfNeeded();
    await reasonField.click();
    await reasonField.fill('Payment confirmed');

    // Click the Mark as Paid confirmation button
    await this.confirmMarkAsPaidButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.confirmMarkAsPaidButton.scrollIntoViewIfNeeded();
    await this.confirmMarkAsPaidButton.click();

    await this.page.waitForLoadState('load');
    console.log('✓ Marked as Paid with remark: Payment confirmed');
  } 

  async markAsClosed() {
    await this.page.waitForLoadState('load');
    await this.markClosedButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.markClosedButton.scrollIntoViewIfNeeded();
    await this.markClosedButton.click();
    //Confirm PO close button 
    await this.confirmPOClosureButton.waitFor({ state: 'visible', timeout: 25000 });
    await this.confirmPOClosureButton.click();
    await this.page.waitForLoadState('load');
    console.log('✓ PO Closed successfully');
  }

  async getPONumber() {
    const titleElement = this.page.locator('h1, .po-title');
    await titleElement.waitFor({ state: 'visible', timeout: 10000 });
    const poNumber = await titleElement.textContent();
    console.log(`📄 Purchase Order Number: ${poNumber}`);
    return poNumber;
  }

  async getStatus() {
    const statusElement = this.page.locator('.status, .po-status');
    await statusElement.waitFor({ state: 'visible', timeout: 10000 });
    const status = await statusElement.textContent();
    console.log(`📊 Purchase Order Status: ${status}`);
    return status;
  }

  async openLinkedMR() {
    const page2Promise = this.page.waitForEvent('popup');

    // Find MR link by role (works regardless of exact MR title prefix)
    const mrLink = this.page.getByRole('link', { name: /^MR/, exact: false });
    await mrLink.first().waitFor({ state: 'visible', timeout: 10000 });
    await mrLink.first().click();

    const page2 = await page2Promise;

    // Use 'load' instead of 'networkidle' to avoid timeout
    try {
      await page2.waitForLoadState('load', { timeout: 30000 });
      await page2.waitForTimeout(2000); // Additional buffer
    } catch (error) {
      console.log('⚠️  MR page load timeout, continuing anyway...');
    }

    // Get and print MR status
    await this.getMRStatus(page2);

    return page2;
  }

  async getMRStatus(mrPage) {
    try {
      // Try to find MR status element
      const statusElement = mrPage.locator('.status, .mr-status, [class*="status"]');
      await statusElement.first().waitFor({ state: 'visible', timeout: 5000 });
      const status = await statusElement.first().textContent();
      console.log(`📋 Material Request Status: ${status.trim()}`);
      return status.trim();
    } catch (error) {
      console.log('⚠️  Could not retrieve MR status');
      return null;
    }
  }

  async getMRNumber(mrPage) {
    try {
      // Try to find MR number/title element
      const titleElement = mrPage.locator('h1, .mr-title, [class*="title"]');
      await titleElement.first().waitFor({ state: 'visible', timeout: 5000 });
      const mrNumber = await titleElement.first().textContent();
      console.log(`📋 Material Request Number: ${mrNumber.trim()}`);
      return mrNumber.trim();
    } catch (error) {
      console.log('⚠️  Could not retrieve MR number');
      return null;
    }
  }
}
