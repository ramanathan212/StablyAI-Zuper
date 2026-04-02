import { test, expect } from '@stablyai/playwright-test';

test.describe('Jobs - Update All Fields via Bulk Update', () => {
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
   */
  test('should iterate through all Update Fields and update each one for selected jobs', async ({
    page,
    agent,
  }) => {
    test.setTimeout(2700000); // 45 minutes

    // ── Helper: dismiss popup if present ──
    const dismissPopup = async (buttonName: string) => {
      try {
        const btn = page.getByRole('button', { name: buttonName });
        await btn.waitFor({ state: 'visible', timeout: 5000 });
        await btn.click();
      } catch {
        /* not present */
      }
    };

    // ── Helper: select a field in the Update Field dropdown ──
    const selectFieldInDialog = async (
      fieldName: string,
      groupName: string,
      isDuplicate: boolean,
    ) => {
      const searchBox = page.getByRole('textbox', { name: 'Search' });
      await searchBox.waitFor({ state: 'visible', timeout: 5000 });
      await searchBox.fill(fieldName);
      await page
        .getByRole('button', { name: fieldName, exact: true })
        .first()
        .waitFor({ state: 'visible', timeout: 5000 });

      if (!isDuplicate) {
        await page.getByRole('button', { name: fieldName, exact: true }).click();
      } else {
        const resultsContainer = searchBox.locator(
          'xpath=ancestor::*[2]/following-sibling::*[1]',
        );
        const groupHeader = resultsContainer
          .locator('div.sticky')
          .filter({ hasText: groupName });
        await groupHeader.locator('xpath=following-sibling::*[1]').click();
      }
    };

    // ── Value fill handlers by input type ──

    const fillByClick = async (optionName: string) => {
      // Try button first
      const btn = page.getByRole('button', { name: optionName, exact: true });
      try {
        await btn.waitFor({ state: 'visible', timeout: 3000 });
        await btn.click();
        return;
      } catch { /* not a button */ }
      // Try checkbox (e.g. Yes/No checkboxes)
      const cb = page.getByRole('checkbox', { name: optionName });
      try {
        await cb.waitFor({ state: 'visible', timeout: 3000 });
        await cb.click();
        return;
      } catch { /* not a checkbox */ }
      // Fallback: click element with exact text
      await page.getByText(optionName, { exact: true }).first().click();
    };

    const fillByText = async (value: string) => {
      // Try "Field Value" named textbox first
      const fieldValueInput = page.getByRole('textbox', { name: 'Field Value' });
      try {
        await fieldValueInput.waitFor({ state: 'visible', timeout: 3000 });
        await fieldValueInput.fill(value);
        return;
      } catch { /* no "Field Value" textbox */ }
      // Fallback: look for any visible textbox/input that's not the Search box
      const dialog = page.locator('.cdk-overlay-pane, [role="dialog"], mat-dialog-container').first();
      const inputs = dialog.locator('input[type="text"], input[type="number"], input:not([type])');
      const count = await inputs.count();
      for (let t = 0; t < count; t++) {
        const input = inputs.nth(t);
        if (await input.isVisible()) {
          const placeholder = await input.getAttribute('placeholder') || '';
          const ariaLabel = await input.getAttribute('aria-label') || '';
          if (!placeholder.match(/search/i) && !ariaLabel.match(/search/i)) {
            await input.fill(value);
            return;
          }
        }
      }
      // Try textarea
      const textarea = dialog.locator('textarea').first();
      try {
        await textarea.waitFor({ state: 'visible', timeout: 2000 });
        await textarea.fill(value);
        return;
      } catch { /* no textarea */ }
      // Last resort: if a "Select Value" dropdown is present, click it and pick first option
      const selectValueBtn = page.locator('button:has-text("Select Value")');
      try {
        await selectValueBtn.waitFor({ state: 'visible', timeout: 2000 });
        await selectValueBtn.click();
        await page.waitForTimeout(500);
        // Click the first option in the overlay
        const overlayOption = page.locator('.cdk-overlay-pane button').first();
        await overlayOption.waitFor({ state: 'visible', timeout: 3000 });
        await overlayOption.click();
        return;
      } catch { /* no dropdown either */ }
      throw new Error('fillByText: Could not find any input for value: ' + value);
    };

    const fillByRichtext = async (text: string) => {
      const frame = page.frameLocator('iframe[title*="Rich Text"]');
      const body = frame.locator('body');
      await body.click();
      await body.fill(text);
    };

    const fillByDate = async (dateLabel: string) => {
      const dateBtn = page.getByRole('button', { name: dateLabel });
      await dateBtn.waitFor({ state: 'visible', timeout: 5000 });
      await dateBtn.click();
    };

    const fillByCombobox = async (searchText: string) => {
      const combobox = page.getByRole('combobox');
      const input = combobox.locator('input');
      await input.waitFor({ state: 'visible', timeout: 5000 });
      await input.fill(searchText);
      const option = page.getByRole('option').first();
      await option.waitFor({ state: 'visible', timeout: 5000 });
      await option.click();
    };

    const fillByRadio = async () => {
      const radio = page.getByRole('radio').first();
      await radio.waitFor({ state: 'visible', timeout: 5000 });
      await radio.click();
    };

    const fillByCheckbox = async () => {
      // Target checkboxes with "option" in name (inside dialog, not table)
      const optionCheckbox = page.getByRole('checkbox', { name: /option/i }).first();
      try {
        await optionCheckbox.waitFor({ state: 'visible', timeout: 3000 });
        await optionCheckbox.click();
      } catch {
        // Fallback: any checkbox that isn't "Select all" or "Select row"
        const allCheckboxes = page.getByRole('checkbox');
        const count = await allCheckboxes.count();
        for (let c = 0; c < count; c++) {
          const name = await allCheckboxes.nth(c).getAttribute('aria-label') || '';
          if (!name.match(/select/i)) {
            await allCheckboxes.nth(c).click();
            break;
          }
        }
      }
    };

    const fillByTime = async (_fieldName: string, timeStr: string) => {
      // Parse timeStr like "02:00 PM"
      const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) throw new Error(`Invalid time format: ${timeStr}`);
      const [, hour, minute, ampm] = match;

      // The time picker widget appears as a menu with hour/minute textboxes
      const menu = page.getByRole('menu');
      await menu.waitFor({ state: 'visible', timeout: 5000 });

      const hourInput = menu.getByRole('textbox').first();
      const minuteInput = menu.getByRole('textbox').nth(1);

      // Fill hour - triple click to select all, then type
      await hourInput.click({ clickCount: 3 });
      await hourInput.fill(hour.padStart(2, '0'));

      // Fill minute
      await minuteInput.click({ clickCount: 3 });
      await minuteInput.fill(minute);

      // Set AM/PM
      const ampmButton = menu.getByRole('button', { name: /^(AM|PM)$/i });
      const currentAmpm = (await ampmButton.textContent())?.trim().toUpperCase();
      if (currentAmpm !== ampm.toUpperCase()) {
        await ampmButton.click();
      }

      // Click OK
      await menu.getByRole('button', { name: 'OK' }).click();
    };

    const fillByDatetime = async (
      _fieldName: string,
      dateLabel: string,
      timeStr: string,
    ) => {
      // First: select the date from the calendar
      const dateBtn = page.getByRole('button', { name: dateLabel });
      await dateBtn.waitFor({ state: 'visible', timeout: 5000 });
      await dateBtn.click();

      // Then: fill the time using the time picker
      await fillByTime(_fieldName, timeStr);
    };

    const fillByMultiline = async (text: string) => {
      // Try "Field Value" textbox first, then generic textarea
      const fieldValue = page.getByRole('textbox', { name: 'Field Value' });
      try {
        await fieldValue.waitFor({ state: 'visible', timeout: 3000 });
        await fieldValue.fill(text);
      } catch {
        const textarea = page.locator('textarea').first();
        await textarea.waitFor({ state: 'visible', timeout: 3000 });
        await textarea.fill(text);
      }
    };

    // ══════════════════════════════════════
    // STEP 1: Login
    // ══════════════════════════════════════
    const companyName = 'zuper-pro';
    const userName = 'ragupathy.s@zuper.co';
    const userPassword = 'Test@1234';

    await page.goto('https://uat.zuperpro.com/login');

    // Check if already logged in (redirected to dashboard)
    const isAlreadyLoggedIn = page.url().includes('/dashboard');
    if (!isAlreadyLoggedIn) {
      // Wait for any visible input on the login page
      await page
        .getByRole('textbox')
        .first()
        .waitFor({ state: 'visible', timeout: 30000 });

      const companyNameField = page.getByRole('textbox', { name: 'Company Name' });
      const switchCompanyLink = page.getByText('Switch Company');
      const isCompanyStep = await companyNameField.isVisible().catch(() => false);

      if (!isCompanyStep) {
        if (await switchCompanyLink.isVisible().catch(() => false)) {
          await switchCompanyLink.click();
          await companyNameField.waitFor({ state: 'visible', timeout: 10000 });
        }
      }
      if (await companyNameField.isVisible().catch(() => false)) {
        await companyNameField.fill(companyName);
        await page.getByRole('button', { name: 'Continue' }).click();
      }

      await page.getByRole('textbox', { name: 'Email address' }).waitFor({ state: 'visible', timeout: 10000 });
      await page.getByRole('textbox', { name: 'Email address' }).fill(userName);
      await page.getByRole('textbox', { name: 'Password Forgot password?' }).fill(userPassword);
      await page.getByRole('button', { name: 'Login', exact: true }).click();
      await page.waitForURL('**/dashboard', { timeout: 30000 });
    }

    // ══════════════════════════════════════
    // STEP 2: Dismiss popups
    // ══════════════════════════════════════
    await dismissPopup('Cancel');
    await dismissPopup('No, thanks');

    // ══════════════════════════════════════
    // STEP 3: Navigate to Jobs
    // ══════════════════════════════════════
    await page.goto('https://uat.zuperpro.com/jobs');
    await page.getByRole('checkbox', { name: 'Select all' }).waitFor({ state: 'visible', timeout: 30000 });
    await dismissPopup('Cancel');
    await dismissPopup('No, thanks');

    // ══════════════════════════════════════
    // STEP 4: Field definitions
    // ══════════════════════════════════════
    type FieldType =
      | 'click'
      | 'text'
      | 'richtext'
      | 'date'
      | 'combobox'
      | 'radio'
      | 'checkbox'
      | 'time'
      | 'datetime'
      | 'multiline';

    interface FieldDef {
      name: string;
      group: string;
      isDuplicate: boolean;
      type: FieldType;
      value: string;
      value2?: string;
    }

    const fields: FieldDef[] = [
      // ── Default (Standard) ──
      { name: 'Job Priority', group: 'Default', isDuplicate: false, type: 'click', value: 'Medium' },
      { name: 'Job Description', group: 'Default', isDuplicate: false, type: 'richtext', value: 'Test bulk update description' },
      { name: 'Due Date', group: 'Default', isDuplicate: false, type: 'date', value: 'April 30, 2026' },
      { name: 'Job Tags', group: 'Default', isDuplicate: false, type: 'combobox', value: 'AC' },
      { name: 'Lead Source', group: 'Default', isDuplicate: false, type: 'combobox', value: 'W' },

      // ── Custom fields - Default ──
      { name: 'Accounts Notification', group: 'Custom fields - Default', isDuplicate: false, type: 'click', value: 'No' },
      { name: 'Number Of Days Elapsed', group: 'Custom fields - Default', isDuplicate: false, type: 'text', value: '10' },
      { name: 'Time', group: 'Custom fields - Default', isDuplicate: true, type: 'time', value: '02:00 PM' },
      { name: 'Freshdesk Id', group: 'Custom fields - Default', isDuplicate: false, type: 'text', value: 'FD-12345' },
      { name: 'Workflow Test', group: 'Custom fields - Default', isDuplicate: false, type: 'click', value: 'Yes' },
      { name: 'Total Contract Value', group: 'Custom fields - Default', isDuplicate: false, type: 'text', value: '5000' },
      { name: 'Zoho Projects Task Id', group: 'Custom fields - Default', isDuplicate: false, type: 'text', value: 'ZP-001' },
      { name: 'Order Number', group: 'Custom fields - Default', isDuplicate: false, type: 'text', value: 'ORD-12345' },
      { name: 'Wom Id', group: 'Custom fields - Default', isDuplicate: false, type: 'text', value: 'WOM-001' },
      { name: 'Equipment', group: 'Custom fields - Default', isDuplicate: false, type: 'click', value: 'Interface (Recording)' },
      { name: 'Region', group: 'Custom fields - Default', isDuplicate: false, type: 'click', value: 'North' },
      { name: 'Zuper Status', group: 'Custom fields - Default', isDuplicate: false, type: 'click', value: 'To Do' },
      { name: 'Code', group: 'Custom fields - Default', isDuplicate: false, type: 'text', value: 'CODE-001' },
      { name: 'Delivery Records', group: 'Custom fields - Default', isDuplicate: false, type: 'text', value: 'DR-001' },
      { name: 'Single Selection', group: 'Custom fields - Default', isDuplicate: true, type: 'radio', value: '' },
      { name: 'Multi Selection', group: 'Custom fields - Default', isDuplicate: true, type: 'checkbox', value: '' },
      { name: 'Dropdown', group: 'Custom fields - Default', isDuplicate: true, type: 'click', value: 'option 1' },
      { name: 'Single Line Text For Num', group: 'Custom fields - Default', isDuplicate: false, type: 'text', value: '12345' },
      { name: 'Single Line Text For Mail', group: 'Custom fields - Default', isDuplicate: false, type: 'text', value: 'test@example.com' },
      { name: 'Single Line Text For Phone No', group: 'Custom fields - Default', isDuplicate: false, type: 'text', value: '1234567890' },
      { name: 'Single Line Text For Address', group: 'Custom fields - Default', isDuplicate: false, type: 'text', value: '123 Test Street' },

      // ── Custom fields - Demo ──
      { name: 'Text Input', group: 'Custom fields - Demo', isDuplicate: true, type: 'text', value: 'Demo Text Input' },
      { name: '2', group: 'Custom fields - Demo', isDuplicate: false, type: 'text', value: '2' },
      { name: 'Single Selection', group: 'Custom fields - Demo', isDuplicate: true, type: 'radio', value: '' },
      { name: 'Multi Selection', group: 'Custom fields - Demo', isDuplicate: true, type: 'checkbox', value: '' },
      { name: 'Dropdown', group: 'Custom fields - Demo', isDuplicate: true, type: 'click', value: 'option 1' },

      // ── Custom fields - UAT Test Custom Fields ──
      { name: 'Date', group: 'Custom fields - UAT Test Custom Fields', isDuplicate: true, type: 'date', value: 'April 30, 2026' },
      { name: 'Time - Default', group: 'Custom fields - UAT Test Custom Fields', isDuplicate: false, type: 'time', value: '02:00 PM' },
      { name: 'Time - 5', group: 'Custom fields - UAT Test Custom Fields', isDuplicate: false, type: 'time', value: '03:00 PM' },
      { name: 'Date & Time - Default', group: 'Custom fields - UAT Test Custom Fields', isDuplicate: false, type: 'datetime', value: 'April 30, 2026', value2: '02:00 PM' },
      { name: 'Date & Time - 5', group: 'Custom fields - UAT Test Custom Fields', isDuplicate: false, type: 'datetime', value: 'April 30, 2026', value2: '03:00 PM' },

      // ── Custom fields - Chitti 3.0 ──
      { name: 'Single Line Text', group: 'Custom fields - Chitti 3.0', isDuplicate: true, type: 'text', value: 'Chitti Test' },
      { name: 'Multi Line Text 2.0', group: 'Custom fields - Chitti 3.0', isDuplicate: false, type: 'multiline', value: 'Multi line test content' },
      { name: 'Date', group: 'Custom fields - Chitti 3.0', isDuplicate: true, type: 'date', value: 'April 30, 2026' },
      { name: 'Time', group: 'Custom fields - Chitti 3.0', isDuplicate: true, type: 'time', value: '02:00 PM' },
      { name: 'Date & Time', group: 'Custom fields - Chitti 3.0', isDuplicate: true, type: 'datetime', value: 'April 30, 2026', value2: '02:00 PM' },
      { name: 'Single Selection', group: 'Custom fields - Chitti 3.0', isDuplicate: true, type: 'radio', value: '' },

      // ── Custom fields - QATest ──
      { name: 'Single Selection', group: 'Custom fields - QATest', isDuplicate: true, type: 'radio', value: '' },
      { name: 'Multi Selection', group: 'Custom fields - QATest', isDuplicate: true, type: 'checkbox', value: '' },

      // ── Custom fields - Electrical ──
      { name: 'Text Input', group: 'Custom fields - Electrical', isDuplicate: true, type: 'text', value: 'Electrical Test' },
      { name: 'Group Select', group: 'Custom fields - Electrical', isDuplicate: false, type: 'click', value: '' },

      // ── Custom fields - QAQA ──
      { name: 'Time', group: 'Custom fields - QAQA', isDuplicate: true, type: 'time', value: '02:00 PM' },
      { name: 'Time -5', group: 'Custom fields - QAQA', isDuplicate: false, type: 'time', value: '03:00 PM' },
      { name: 'Date & Time', group: 'Custom fields - QAQA', isDuplicate: true, type: 'datetime', value: 'April 30, 2026', value2: '02:00 PM' },
      { name: 'Time15', group: 'Custom fields - QAQA', isDuplicate: false, type: 'time', value: '04:00 PM' },
      { name: 'Date & Time15', group: 'Custom fields - QAQA', isDuplicate: false, type: 'datetime', value: 'April 30, 2026', value2: '04:00 PM' },
      { name: 'Single Line Text', group: 'Custom fields - QAQA', isDuplicate: true, type: 'text', value: 'QAQA Test' },
    ];

    // ══════════════════════════════════════
    // STEP 5: Iterate through all fields
    // ══════════════════════════════════════
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];

      // 1. Ensure Select all is clicked
      const selectAllCheckbox = page.getByRole('checkbox', { name: 'Select all' });
      await selectAllCheckbox.waitFor({ state: 'visible', timeout: 15000 });
      if (await selectAllCheckbox.isChecked()) {
        await selectAllCheckbox.click();
      }
      await selectAllCheckbox.click();

      // 2. Click Update Field
      const updateFieldBtn = page.getByRole('button', { name: 'Update Field' });
      await updateFieldBtn.waitFor({ state: 'visible', timeout: 10000 });
      await updateFieldBtn.click();

      // 3. Wait for dialog
      await page.getByText('Choose Field to be Updated').waitFor({ state: 'visible', timeout: 10000 });

      // 4. Select the field
      await selectFieldInDialog(field.name, field.group, field.isDuplicate);

      // 5. Fill value based on type
      switch (field.type) {
        case 'click':
          if (field.value) {
            await fillByClick(field.value);
          } else {
            await agent.act(
              `A dropdown is showing options for "${field.name}". Click the first available option. STOP after clicking.`,
              { page, maxCycles: 3 },
            );
          }
          break;
        case 'text':
          await fillByText(field.value);
          break;
        case 'richtext':
          await fillByRichtext(field.value);
          break;
        case 'date':
          await fillByDate(field.value);
          break;
        case 'combobox':
          await fillByCombobox(field.value);
          break;
        case 'radio':
          await fillByRadio();
          break;
        case 'checkbox':
          await fillByCheckbox();
          break;
        case 'time':
          await fillByTime(field.name, field.value);
          break;
        case 'datetime':
          await fillByDatetime(field.name, field.value, field.value2 || '02:00 PM');
          break;
        case 'multiline':
          await fillByMultiline(field.value);
          break;
      }

      // 6. Close overlays only for field types that have them
      //    (date picker calendar, time picker widget, combobox dropdown)
      if (['date', 'combobox'].includes(field.type)) {
        await page.keyboard.press('Escape');
      }
      // Time/datetime overlays are handled within their agent.act() + OK button

      // 7. Click Update button
      const updateBtn = page.getByRole('button', { name: 'Update' });
      await updateBtn.waitFor({ state: 'visible', timeout: 5000 });
      await updateBtn.click();

      // 8. Verify success toast (flexible regex to handle variations)
      await expect(
        page.getByText(/updated.*successfully/i).first(),
      ).toBeVisible({ timeout: 15000 });

      // 9. Wait for toast to disappear
      await page
        .getByText(/updated.*successfully/i)
        .first()
        .waitFor({ state: 'hidden', timeout: 10000 })
        .catch(() => {});
    }
  });
});
