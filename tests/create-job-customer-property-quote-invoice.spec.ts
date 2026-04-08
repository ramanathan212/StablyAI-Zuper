import { test, expect } from '@stablyai/playwright-test';

test.describe('Create Job, Customer, Property, Quote, and Invoice', () => {
  /**
   * User Prompt:
   * - Launch -> https://uat.zuperpro.com/login
   * - company name : zuper-pro
   * - username : ragupathy.s@zuper.co
   * - password : Test@1234
   * - After logged in cancel the pop ups in the Dashboard page
   * - Go to the Jobs module and create new job with mandatory fields. Job Name: AprilUATJob
   * - Go to the customer module and create new customer with mandatory fields. Customer Name: AprilUATCustomer
   * - Go to the Property module and create new property with mandatory fields. Property Name: AprilUATProperty
   * - Go to the Quote module and create new quote with mandatory fields. Quote Name: AprilUATQuote
   * - Go to the Invoice module and create new invoice with mandatory fields. Invoice Name: AprilUATInvoice
   */
  test('should create entities across Jobs, Customers, Properties, Quotes, and Invoices', async ({ page }) => {
    test.setTimeout(600000); // 10 minutes

    // Generate unique suffix for all entity names to ensure idempotency
    const uid = Date.now().toString().slice(-6);
    const jobName = `AprilUATJob_${uid}`;
    const customerName = `AprilUATCustomer_${uid}`;
    const customerEmail = `apriluatcustomer_${uid}@test.com`;
    const propertyNameVal = `AprilUATProperty_${uid}`;
    const quoteName = `AprilUATQuote_${uid}`;
    const invoiceName = `AprilUATInvoice_${uid}`;

    // ===== HELPER: Dismiss notification & timezone popups =====
    async function dismissPopups() {
      // Dismiss "No, thanks" notification popup
      try {
        const noThanksBtn = page.getByRole('button', { name: 'No, thanks' });
        if (await noThanksBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await noThanksBtn.click();
          await page.waitForTimeout(500);
        }
      } catch (_) { /* ignore */ }

      // Dismiss timezone "Cancel" popup
      try {
        const tzHeading = page.getByRole('heading', { name: 'Your timezone has changed' });
        if (await tzHeading.isVisible({ timeout: 1000 }).catch(() => false)) {
          const cancelBtn = page.getByRole('button', { name: 'Cancel' });
          await cancelBtn.click();
          await page.waitForTimeout(500);
        }
      } catch (_) { /* ignore */ }

      // Remove any CDK overlay backdrops and overlay containers via JS
      await page.evaluate(() => {
        document.querySelectorAll('.cdk-overlay-backdrop').forEach(el => el.remove());
        document.querySelectorAll('.cdk-overlay-container').forEach(container => {
          container.querySelectorAll('.cdk-overlay-pane').forEach(pane => {
            if (pane.querySelector('[class*="notification"], [class*="permission"]')) {
              pane.remove();
            }
          });
        });
      });
      await page.waitForTimeout(300);
    }

    // ===== HELPER: Aggressively dismiss popups with multiple retries =====
    async function aggressiveDismissPopups(retries = 3) {
      for (let i = 0; i < retries; i++) {
        await dismissPopups();
        await page.waitForTimeout(1000);
      }
    }

    // ===== HELPER: Click a header action link reliably =====
    async function clickHeaderAction(linkText: string) {
      // Scroll to top to ensure header buttons are in viewport
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
      // Remove ALL CDK overlays aggressively
      await page.evaluate(() => {
        document.querySelectorAll('.cdk-overlay-backdrop').forEach(el => el.remove());
        document.querySelectorAll('.cdk-overlay-container .cdk-overlay-pane').forEach(el => el.remove());
      });
      await page.waitForTimeout(500);
      // Click the link — try Playwright click first, fall back to mouse.click via boundingBox
      const btn = page.locator('a').filter({ hasText: linkText }).first();
      await btn.waitFor({ state: 'visible', timeout: 10000 });
      try {
        await btn.click({ timeout: 5000 });
      } catch {
        // CDK overlay may have re-appeared, try mouse.click as fallback
        await page.evaluate(() => {
          document.querySelectorAll('.cdk-overlay-backdrop').forEach(el => el.remove());
          document.querySelectorAll('.cdk-overlay-container .cdk-overlay-pane').forEach(el => el.remove());
        });
        const box = await btn.boundingBox();
        if (box) {
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        }
      }
    }

    // ===== LOGIN =====
    await page.goto('https://uat.zuperpro.com/login');
    await page.getByRole('textbox', { name: 'Company Name' }).waitFor({ state: 'visible', timeout: 30000 });
    await page.getByRole('textbox', { name: 'Company Name' }).fill('zuper-pro');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Continue');
      if (btn) btn.click();
    });
    await page.getByRole('textbox', { name: 'Email address' }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByRole('textbox', { name: 'Email address' }).fill('ragupathy.s@zuper.co');
    await page.getByRole('textbox', { name: 'Password Forgot password?' }).fill('Test@1234');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Login');
      if (btn) btn.click();
    });
    await page.waitForURL('**/dashboard', { timeout: 30000 });

    // ===== DISMISS DASHBOARD POPUPS =====
    await page.waitForTimeout(3000);
    await dismissPopups();

    // ============================================================
    // 1. CREATE NEW JOB
    // ============================================================
    await page.goto('https://uat.zuperpro.com/jobs/new');
    await page.getByRole('textbox', { name: 'Job Title *' }).waitFor({ state: 'visible', timeout: 30000 });
    // Aggressively dismiss popups — the notification popup appears with variable timing
    await aggressiveDismissPopups(4);

    // Fill Job Title
    await page.getByRole('textbox', { name: 'Job Title *' }).fill(jobName);

    // Dismiss again right before dropdown interaction
    await dismissPopups();

    // Select Job Category — find the first combobox in Primary Details region
    // The combobox is unnamed when collapsed; only gets "Choose a Job Category" name when expanded
    const primaryDetailsRegion = page.getByRole('region', { name: /Primary Details/ });
    const jobCategoryDropdown = primaryDetailsRegion.getByRole('combobox').first();
    await jobCategoryDropdown.waitFor({ state: 'visible', timeout: 10000 });
    await jobCategoryDropdown.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(700);
    const fixesOption = page.getByRole('option', { name: 'Fixes' });
    await fixesOption.waitFor({ state: 'visible', timeout: 10000 });
    await fixesOption.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(500);

    // Select Due Date — click the due date input and pick tomorrow
    await dismissPopups();
    const dueDateInput = page.getByRole('textbox', { name: 'Due Date' });
    await dueDateInput.waitFor({ state: 'visible', timeout: 10000 });
    await dueDateInput.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(500);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const dueDateLabel = `${monthNames[tomorrow.getMonth()]} ${tomorrow.getDate()},`;
    const dateButton = page.getByRole('button', { name: dueDateLabel }).first();
    await dateButton.waitFor({ state: 'visible', timeout: 5000 });
    await dateButton.click();
    await page.waitForTimeout(500);

    // Add Organization — click "Add Organization", pick "ACME Corporation", confirm
    await dismissPopups();
    // Use JS to find and click the "Add Organization" link via Angular-friendly event dispatch
    await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (const link of links) {
        if (link.textContent?.trim() === 'Add Organization') {
          link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          break;
        }
      }
    });
    // Wait for org picker slide-out to fully load
    await page.getByRole('heading', { name: 'Choose Organization', level: 2 }).waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(2000);
    // Click the org radio via JS to bypass overlapping data-picker elements
    const acmeRadio = page.getByRole('radio', { name: 'ACME Corporation' });
    await acmeRadio.waitFor({ state: 'visible', timeout: 10000 });
    await acmeRadio.evaluate((el: HTMLInputElement) => el.click());
    await page.waitForTimeout(500);
    const chooseOrgBtn = page.getByRole('button', { name: 'Choose Organization' });
    await expect(chooseOrgBtn).toBeEnabled({ timeout: 5000 });
    await chooseOrgBtn.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(1000);

    // Fill mandatory custom field "Text Input" under Demo section
    const demoTextInput = page.getByRole('textbox', { name: 'Text Input *' });
    if (await demoTextInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await demoTextInput.scrollIntoViewIfNeeded();
      await demoTextInput.fill(jobName);
    }

    // Click Create Job button
    await clickHeaderAction('Create Job');
    await page.waitForTimeout(2000);

    // Confirm creation in dialog — use exact match to avoid matching Tasks expansion panel
    const createConfirmBtn = page.getByRole('button', { name: 'Create', exact: true });
    await createConfirmBtn.waitFor({ state: 'visible', timeout: 10000 });
    await createConfirmBtn.click();

    // Verify job created — should redirect to job details page
    await expect(page).toHaveURL(/\/jobs\/.*\/details/, { timeout: 30000 });
    const jobTitleEl = page.locator('p').filter({ hasText: jobName }).first();
    await expect(jobTitleEl).toBeVisible({ timeout: 15000 });

    // ============================================================
    // 2. CREATE NEW CUSTOMER
    // ============================================================
    await page.goto('https://uat.zuperpro.com/customers/new');
    await page.getByRole('textbox', { name: 'First Name *' }).waitFor({ state: 'visible', timeout: 30000 });
    await dismissPopups();

    // Fill First Name
    await page.getByRole('textbox', { name: 'First Name *' }).fill(customerName);

    // Fill Email
    await page.getByRole('textbox', { name: 'Email *' }).fill(customerEmail);

    // Select Account Manager — click to open dropdown and pick first option from the listbox
    const accountMgrCombobox = page.locator('ng-select').filter({ hasText: 'Choose account manager' }).locator('input[type="text"]');
    await accountMgrCombobox.scrollIntoViewIfNeeded();
    await accountMgrCombobox.click();
    await page.waitForTimeout(1000);
    // Scope to the ng-select "Options list" listbox to avoid hidden pagination options
    const firstAccountMgr = page.getByRole('listbox', { name: 'Options list' }).getByRole('option').first();
    await firstAccountMgr.waitFor({ state: 'visible', timeout: 5000 });
    await firstAccountMgr.click();
    await page.waitForTimeout(500);

    // Fill Service Address — Street Address (uses Google Places autocomplete)
    const streetAddressInput = page.getByRole('textbox', { name: 'Flat / House No, Street / Locality' }).first();
    await streetAddressInput.scrollIntoViewIfNeeded();
    await streetAddressInput.click();
    await streetAddressInput.fill('Chennai');
    await page.waitForTimeout(2000);
    // Select first autocomplete suggestion using keyboard
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Check "Same As Service Address" for Billing Address via JS to bypass CDK overlay
    await dismissPopups();
    const sameAsServiceCb = page.getByRole('checkbox', { name: 'Same As Service Address' });
    if (await sameAsServiceCb.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sameAsServiceCb.evaluate((el: HTMLInputElement) => el.click());
      await page.waitForTimeout(1000);
    }

    // Click Save Contact
    await clickHeaderAction('Save Contact');
    await page.waitForTimeout(3000);

    // Handle confirmation dialog: "Do you want to create contact?"
    const createContactConfirm = page.locator('.cdk-overlay-pane').getByRole('button', { name: 'Create' });
    if (await createContactConfirm.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createContactConfirm.click();
    }

    // Verify customer created — should redirect to customer details page
    await expect(page).toHaveURL(/\/customers\/.*\/details/, { timeout: 30000 });
    const customerNameEl = page.getByText(customerName).first();
    await expect(customerNameEl).toBeVisible({ timeout: 15000 });

    // ============================================================
    // 3. CREATE NEW PROPERTY
    // ============================================================
    await page.goto('https://uat.zuperpro.com/property/new');
    await page.getByRole('textbox', { name: 'Property Name *' }).waitFor({ state: 'visible', timeout: 30000 });
    await dismissPopups();

    // Fill Property Name
    await page.getByRole('textbox', { name: 'Property Name *' }).fill(propertyNameVal);

    // Fill Street Address (uses Google Places autocomplete)
    const propertyStreetAddress = page.getByRole('textbox', { name: 'Flat / House No, Street / Locality' });
    await propertyStreetAddress.scrollIntoViewIfNeeded();
    await propertyStreetAddress.click();
    await propertyStreetAddress.fill('Chennai');
    await page.waitForTimeout(2000);
    // Select first autocomplete suggestion using keyboard
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000); // Extra wait for Angular to process address data

    // Click Save Property
    await clickHeaderAction('Save Property');
    await page.waitForTimeout(3000);

    // Handle confirmation dialog: "Do you want to create property?"
    const createPropertyConfirm = page.locator('.cdk-overlay-pane').getByRole('button', { name: 'Create' });
    if (await createPropertyConfirm.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createPropertyConfirm.click();
    }

    // Verify property created — should redirect to property details page
    await expect(page).toHaveURL(/\/property\/.*\/details/, { timeout: 30000 });
    const propertyNameEl = page.getByText(propertyNameVal).first();
    await expect(propertyNameEl).toBeVisible({ timeout: 15000 });

    // ============================================================
    // 4. CREATE NEW QUOTE
    // ============================================================
    // Navigate directly to New Quote page
    await page.goto('https://uat.zuperpro.com/estimates/new');
    await page.waitForTimeout(3000);
    await dismissPopups();

    // Expand Quote Details section and fill Quote Title
    const quoteDetailsBtn = page.getByRole('button', { name: 'Quote Details' });
    await quoteDetailsBtn.scrollIntoViewIfNeeded();
    await quoteDetailsBtn.click();
    await page.waitForTimeout(500);

    const quoteTitleInput = page.getByRole('textbox', { name: 'Quote Title' });
    await quoteTitleInput.waitFor({ state: 'visible', timeout: 5000 });
    await quoteTitleInput.fill(quoteName);

    // Quote Date and Expiry Date should be pre-filled; save as draft
    await clickHeaderAction('Save as Draft');
    await page.waitForTimeout(3000);

    // Confirm Save as Draft in dialog if it appears
    const saveDraftConfirm = page.getByRole('button', { name: 'Save as Draft' });
    if (await saveDraftConfirm.isVisible({ timeout: 5000 }).catch(() => false)) {
      await saveDraftConfirm.click();
    }

    // Verify quote created — should redirect to quote details page
    await expect(page).toHaveURL(/estimates\/.*\/details/, { timeout: 30000 });
    await expect(page.getByText(quoteName)).toBeVisible({ timeout: 15000 });

    // ============================================================
    // 5. CREATE NEW INVOICE
    // ============================================================
    // Navigate directly to New Invoice page
    await page.goto('https://uat.zuperpro.com/invoices/new');
    await page.waitForTimeout(3000);
    await dismissPopups();

    // Expand Invoice Details and fill Reference Number as the invoice name
    const invoiceDetailsBtn = page.getByRole('button', { name: 'Invoice Details' });
    await invoiceDetailsBtn.scrollIntoViewIfNeeded();
    await invoiceDetailsBtn.click();
    await page.waitForTimeout(500);

    const refNumberInput = page.getByRole('textbox', { name: 'Reference Number' });
    await refNumberInput.waitFor({ state: 'visible', timeout: 5000 });
    await refNumberInput.fill(invoiceName);

    // Invoice Date, Payment Term, Due Date, Invoice Template are pre-filled
    // Save as Draft
    await clickHeaderAction('Save as Draft');
    await page.waitForTimeout(3000);

    // Handle "Save as Draft" confirmation dialog
    const saveDraftInvoiceConfirm = page.getByRole('button', { name: 'Save as Draft' });
    if (await saveDraftInvoiceConfirm.isVisible({ timeout: 5000 }).catch(() => false)) {
      await saveDraftInvoiceConfirm.click();
    }

    // Verify invoice created — should redirect to invoice details page
    await expect(page).toHaveURL(/invoices\/.*\/details/, { timeout: 30000 });
    await expect(page.getByText(invoiceName)).toBeVisible({ timeout: 15000 });
  });
});
