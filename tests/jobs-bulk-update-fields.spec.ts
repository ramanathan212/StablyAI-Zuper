import { test, expect } from '@stablyai/playwright-test';

test.describe('Jobs Bulk Update Fields', () => {
  /**
   * User Prompt:
   * - Launch -> https://uat.zuperpro.com/login
   * - company name : zuper-pro
   * - username : ragupathy.s@zuper.co
   * - password : Test@1234
   * - After logged in cancel the pop ups in the Dashboard page
   * - Go to the Jobs module Click on the select all checkbox
   * - Click on the UpdateField button
   * - Select the field and provide the value
   * - Click on the update button
   * - Again click on the select all checkbox
   * - Click on the UpdateField button
   * - Select the field and provide the value
   * - Click on the update button.
   * - This will do untill all the fields from "update fields" list update
   * - Note: Update below mentioned fields
   * - Field name: Job Priotity, Value: Low
   * - Job Description, Value: QAUAT Description
   * - Due Date: Value: Select Current Date
   * - Tags, Value: Name contains "AC"
   * - Account Notification, Value: No
   * - Number Of Days Elapsed, Value: 11
   * - Time, Value: Current Time
   * - Default Custom Field group: Single Selection, Value: Option 1
   * - Default Custom Field group: Multi Selection, Value: Option1, Option2
   * - Default Custom Field group: Dropdown, Value: Option1
   * - Default Custom Field group: Single Line Text For Num, Value: 1
   * - Default Custom Field group: Single Line Text For Mail, Value: q@quat
   * - Default Custom Field group: Single Line Text For Phone No, Value: 9876543210
   * - Note: Cancel the Notification pop ups if it is asking any pages/areas
   */
  test('should bulk update all specified fields for selected jobs', async ({ page }) => {
    test.setTimeout(600000); // 10 minutes for this complex multi-step test

    // ===== HELPER: Dismiss notification & timezone popups via JS =====
    async function dismissPopups() {
      // Dismiss "No, thanks" notification popup
      try {
        const noThanksBtn = page.getByRole('button', { name: 'No, thanks' });
        if (await noThanksBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await noThanksBtn.click();
          await page.waitForTimeout(500);
        }
      } catch (_) { /* ignore */ }

      // Dismiss timezone "Cancel" popup
      try {
        const tzHeading = page.getByRole('heading', { name: 'Your timezone has changed' });
        if (await tzHeading.isVisible({ timeout: 1000 }).catch(() => false)) {
          // Find the Cancel button in the timezone dialog
          const cancelBtn = page.getByRole('button', { name: 'Cancel' });
          await cancelBtn.click();
          await page.waitForTimeout(500);
        }
      } catch (_) { /* ignore */ }

      // Remove any lingering CDK overlay backdrops via JS
      await page.evaluate(() => {
        document.querySelectorAll('.cdk-overlay-backdrop').forEach(el => el.remove());
      });
      await page.waitForTimeout(300);
    }

    // ===== HELPER: Select all → Update Field → pick field =====
    async function selectAllAndChooseField(fieldName: string) {
      // Dismiss any popups first
      await dismissPopups();

      // Click Select all checkbox
      const selectAllCb = page.getByRole('checkbox', { name: 'Select all' });
      await selectAllCb.waitFor({ state: 'visible', timeout: 15000 });
      await selectAllCb.click();
      await page.waitForTimeout(700);

      // Click Update Field button
      const updateFieldBtn = page.getByRole('button', { name: 'Update Field' });
      await updateFieldBtn.waitFor({ state: 'visible', timeout: 10000 });
      await updateFieldBtn.click();

      // Wait for the dialog heading
      await page.getByRole('heading', { name: 'Update Field' }).waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForTimeout(500);

      // Dismiss any popups that may have appeared over the dialog
      await dismissPopups();

      // The field search/list dropdown is auto-expanded
      // Type field name in search to filter
      const searchBox = page.getByRole('textbox', { name: 'Search' });
      if (await searchBox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchBox.fill(fieldName);
        await page.waitForTimeout(700);
      }

      // Click the matching field button from the dropdown list
      // Use getByRole to precisely target the button
      const fieldBtn = page.getByRole('button', { name: fieldName, exact: true }).first();
      await fieldBtn.waitFor({ state: 'visible', timeout: 5000 });
      await fieldBtn.click();
      await page.waitForTimeout(1000);
    }

    // ===== HELPER: Click dialog Update button & verify success =====
    async function clickUpdateAndVerify() {
      // Remove any CDK overlays that might be intercepting clicks
      await page.evaluate(() => {
        document.querySelectorAll('.cdk-overlay-backdrop').forEach(el => el.remove());
      });
      await page.waitForTimeout(300);

      // Click the Update submit button in the dialog
      const updateBtn = page.getByRole('button', { name: 'Update', exact: true });
      await updateBtn.waitFor({ state: 'visible', timeout: 5000 });
      await updateBtn.click();

      // Wait for success toast message
      const successMsg = page.getByText(/updated.*successfully/i).first();
      await expect(successMsg).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(2000); // Wait for toast to clear
    }

    // ===== LOGIN =====
    await page.goto('https://uat.zuperpro.com/login');
    await page.getByRole('textbox', { name: 'Company Name' }).waitFor({ state: 'visible', timeout: 30000 });
    await page.getByRole('textbox', { name: 'Company Name' }).fill('zuper-pro');
    // Use JS click to bypass any banner overlay
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

    // ===== NAVIGATE TO JOBS =====
    await page.goto('https://uat.zuperpro.com/jobs');
    await page.getByRole('checkbox', { name: 'Select all' }).waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(2000);
    await dismissPopups();

    // ===== 1. JOB PRIORITY → Low =====
    await selectAllAndChooseField('Job Priority');
    // Value dropdown auto-expands after field selection
    await page.getByRole('button', { name: 'Low', exact: true }).waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('button', { name: 'Low', exact: true }).click();
    await page.waitForTimeout(300);
    await clickUpdateAndVerify();

    // ===== 2. JOB DESCRIPTION → QA Description =====
    await selectAllAndChooseField('Job Description');
    const richTextFrame = page.locator('iframe[title="Rich Text Area"]').contentFrame();
    await richTextFrame.getByLabel('Rich Text Area. Press ALT-0').waitFor({ state: 'visible', timeout: 10000 });
    await richTextFrame.getByLabel('Rich Text Area. Press ALT-0').click();
    await page.keyboard.type('QAUAT Description');
    await clickUpdateAndVerify();

    // ===== 3. DUE DATE → Current Date =====
    await selectAllAndChooseField('Due Date');
    // Calendar auto-opens; click today's date
    const today = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const todayLabel = `${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
    await page.getByRole('button', { name: todayLabel }).click();
    await page.waitForTimeout(300);
    await clickUpdateAndVerify();

    // ===== 4. TAGS → Name contains "AC" =====
    await selectAllAndChooseField('Job Tags');
    // Tags field uses ng-select combobox; type to search, then pick first AC option
    const tagInput = page.locator('ng-select input[type="text"]');
    await tagInput.waitFor({ state: 'visible', timeout: 5000 });
    await tagInput.click();
    await tagInput.type('AC');
    await page.waitForTimeout(1500);
    const firstACOption = page.getByRole('option').filter({ hasText: /AC/ }).first();
    await firstACOption.waitFor({ state: 'visible', timeout: 5000 });
    await firstACOption.click();
    await page.waitForTimeout(300);
    // Close ng-select dropdown so Update button is clickable
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await clickUpdateAndVerify();

    // ===== 5. ACCOUNT NOTIFICATION → No =====
    await selectAllAndChooseField('Accounts Notification');
    await page.getByRole('button', { name: 'No', exact: true }).waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('button', { name: 'No', exact: true }).click();
    await page.waitForTimeout(300);
    await clickUpdateAndVerify();

    // ===== 6. NUMBER OF DAYS ELAPSED → 11 =====
    await selectAllAndChooseField('Number Of Days Elapsed');
    const daysInput = page.getByRole('textbox', { name: 'Field Value' });
    await daysInput.waitFor({ state: 'visible', timeout: 5000 });
    await daysInput.fill('11');
    await clickUpdateAndVerify();

    // ===== 7. TIME → Current Time =====
    await selectAllAndChooseField('Time');
    // The time picker auto-opens with a CDK overlay when the Time field is selected.
    // We must interact via JS because the overlay blocks normal Playwright clicks.
    await page.waitForTimeout(1000);

    // Compute current time
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const hourStr = hours.toString().padStart(2, '0');
    const minuteStr = minutes.toString().padStart(2, '0');

    // Set hour, minute, and AM/PM via JS to bypass the CDK overlay
    await page.evaluate(({ h, m, period }) => {
      // Find the hour and minute inputs inside the time picker table
      const inputs = document.querySelectorAll('table input[type="text"]');
      if (inputs.length >= 2) {
        const hourInput = inputs[0] as HTMLInputElement;
        const minuteInput = inputs[1] as HTMLInputElement;

        // Set hour
        const nativeHourSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        )!.set!;
        nativeHourSetter.call(hourInput, h);
        hourInput.dispatchEvent(new Event('input', { bubbles: true }));
        hourInput.dispatchEvent(new Event('change', { bubbles: true }));

        // Set minute
        nativeHourSetter.call(minuteInput, m);
        minuteInput.dispatchEvent(new Event('input', { bubbles: true }));
        minuteInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Toggle AM/PM if needed
      const ampmBtn = Array.from(document.querySelectorAll('table button')).find(
        b => b.textContent?.trim() === 'AM' || b.textContent?.trim() === 'PM'
      ) as HTMLButtonElement | undefined;
      if (ampmBtn && ampmBtn.textContent?.trim() !== period) {
        ampmBtn.click();
      }
    }, { h: hourStr, m: minuteStr, period: ampm });
    await page.waitForTimeout(500);

    // Click OK to confirm the time selection via JS (CDK overlay blocks normal click)
    await page.evaluate(() => {
      const okBtn = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent?.trim() === 'OK'
      ) as HTMLButtonElement | undefined;
      if (okBtn) okBtn.click();
    });
    await page.waitForTimeout(500);
    await clickUpdateAndVerify();

    // ===== 8. SINGLE SELECTION → option 1 =====
    await selectAllAndChooseField('Single Selection');
    // Single Selection renders as radio buttons with lowercase labels
    const radio1 = page.getByRole('radio', { name: 'option 1' });
    await radio1.waitFor({ state: 'visible', timeout: 5000 });
    await radio1.click();
    await page.waitForTimeout(300);
    await clickUpdateAndVerify();

    // ===== 9. MULTI SELECTION → option 1, option 2 =====
    await selectAllAndChooseField('Multi Selection');
    // Multi Selection renders as checkboxes with lowercase labels
    const cb1 = page.getByRole('checkbox', { name: 'option 1' });
    await cb1.waitFor({ state: 'visible', timeout: 5000 });
    await cb1.check();
    await page.waitForTimeout(300);
    const cb2 = page.getByRole('checkbox', { name: 'option 2' });
    await cb2.check();
    await page.waitForTimeout(300);
    await clickUpdateAndVerify();

    // ===== 10. DROPDOWN → option 1 =====
    await selectAllAndChooseField('Dropdown');
    // Dropdown renders as buttons in a CDK overlay with lowercase labels
    const dropOpt = page.getByRole('button', { name: 'option 1', exact: true });
    await dropOpt.waitFor({ state: 'visible', timeout: 5000 });
    await dropOpt.click();
    await page.waitForTimeout(300);
    await clickUpdateAndVerify();

    // ===== 11. SINGLE LINE TEXT FOR NUM → 1 =====
    await selectAllAndChooseField('Single Line Text For Num');
    // Number field renders as a spinbutton without accessible name; use placeholder selector
    const numInput = page.locator('input[placeholder="Field Value"]');
    await numInput.waitFor({ state: 'visible', timeout: 5000 });
    await numInput.fill('1');
    await clickUpdateAndVerify();

    // ===== 12. SINGLE LINE TEXT FOR MAIL → q@q =====
    await selectAllAndChooseField('Single Line Text For Mail');
    // Email field also uses placeholder-based input
    const mailInput = page.locator('input[placeholder="Field Value"]');
    await mailInput.waitFor({ state: 'visible', timeout: 5000 });
    await mailInput.fill('q@quat');
    await clickUpdateAndVerify();

    // ===== 13. SINGLE LINE TEXT FOR PHONE NO → 9876543210 =====
    await selectAllAndChooseField('Single Line Text For Phone No');
    // Phone field also uses placeholder-based input
    const phoneInput = page.locator('input[placeholder="Field Value"]');
    await phoneInput.waitFor({ state: 'visible', timeout: 5000 });
    await phoneInput.fill('9876543210');
    await clickUpdateAndVerify();
  });
});
