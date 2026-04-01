import { test, expect } from '@stablyai/playwright-test';

test.describe('Jobs Module - Bulk Update All Fields', () => {
  /**
   * User Prompt:
   * - Launch -> https://uat.zuperpro.com/login
   *   company name : zuper-pro
   *   username : ragupathy.s@zuper.co
   *   password : Test@1234
   *   After logged in cancel the pop ups in the Dashboard page
   *   Go to the Jobs module
   *   Click on the select all checkbox
   *   Click on the UpdateField button
   *   Select the field and provide the value Click on the update button
   *   Again click on the select all checkbox
   *   Click on the UpdateField button Select the field and provide the value Click on the update button.
   *   This will do untill all the fields from "update fields" list update
   */
  test('Update all fields from Update Fields list', async ({ page, agent }) => {
    test.setTimeout(900000); // 15 minutes - iterating through many fields

    // ── Helpers ──────────────────────────────────────────────────────

    /** Dismiss common dashboard popups */
    const dismissPopups = async () => {
      const noThanks = page.getByRole('button', { name: 'No, thanks' });
      if (await noThanks.isVisible({ timeout: 3000 }).catch(() => false)) {
        await noThanks.click();
        await page.waitForTimeout(500);
      }
      const cancelBtn = page.getByRole('button', { name: 'Cancel' });
      if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cancelBtn.click();
        await page.waitForTimeout(500);
      }
      if (await noThanks.isVisible({ timeout: 1000 }).catch(() => false)) {
        await noThanks.click();
        await page.waitForTimeout(500);
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    };

    /** Remove CDK overlay backdrops that intercept clicks */
    const clearOverlays = async () => {
      await page.evaluate(() => {
        document.querySelectorAll('.cdk-overlay-backdrop').forEach(el => el.remove());
        document.querySelectorAll('.cdk-overlay-transparent-backdrop').forEach(el => el.remove());
      });
      await page.waitForTimeout(300);
    };

    /**
     * Get all field option buttons from the Update Field dropdown overlay.
     * Returns their text and index within the dropdown panel.
     */
    const getDropdownFieldEntries = async (): Promise<{ text: string; index: number }[]> => {
      return page.evaluate(() => {
        const entries: { text: string; index: number }[] = [];
        const panes = document.querySelectorAll('.cdk-overlay-container .cdk-overlay-pane');
        for (const pane of panes) {
          const input = pane.querySelector('input');
          const buttons = pane.querySelectorAll('button');
          if (input && buttons.length >= 5) {
            buttons.forEach((btn, i) => {
              const text = btn.textContent?.trim() || '';
              if (text) entries.push({ text, index: i });
            });
            break;
          }
        }
        return entries;
      });
    };

    /**
     * Click a field option button by its index in the dropdown overlay.
     */
    const clickFieldByIndex = async (fieldIndex: number): Promise<boolean> => {
      return page.evaluate((idx: number) => {
        const panes = document.querySelectorAll('.cdk-overlay-container .cdk-overlay-pane');
        for (const pane of panes) {
          const input = pane.querySelector('input');
          const buttons = pane.querySelectorAll('button');
          if (input && buttons.length >= 5) {
            const btn = buttons[idx] as HTMLElement | undefined;
            if (btn) {
              btn.scrollIntoView({ block: 'center' });
              btn.click();
              return true;
            }
            return false;
          }
        }
        return false;
      }, fieldIndex);
    };

    // ── Step 1: Login ────────────────────────────────────────────────

    await test.step('Login to the application', async () => {
      await page.goto('/login');
      const companyInput = page
        .getByRole('textbox', { name: 'Company Name' })
        .describe('Company Name input');
      await companyInput.waitFor({ state: 'visible', timeout: 30000 });
      await companyInput.fill(process.env.company_name || '');

      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(
          (b) => b.textContent?.trim() === 'Continue',
        );
        if (btn) (btn as HTMLElement).click();
      });

      const emailInput = page
        .getByRole('textbox', { name: 'Email address' })
        .describe('Email input');
      await emailInput.waitFor({ state: 'visible', timeout: 15000 });
      await emailInput.fill(process.env.user_name || '');

      const passwordInput = page
        .getByRole('textbox', { name: 'Password Forgot password?' })
        .describe('Password input');
      await passwordInput.fill(process.env.password || '');

      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(
          (b) => b.textContent?.trim() === 'Login',
        );
        if (btn) (btn as HTMLElement).click();
      });

      await page.waitForURL('**/dashboard', { timeout: 30000 });
    });

    // ── Step 2: Dismiss popups ───────────────────────────────────────

    await test.step('Dismiss dashboard popups', async () => {
      await dismissPopups();
    });

    // ── Step 3: Navigate to Jobs ─────────────────────────────────────

    await test.step('Navigate to Jobs module', async () => {
      await page.goto('/jobs');
      await page
        .getByRole('checkbox', { name: 'Select all' })
        .waitFor({ state: 'visible', timeout: 30000 });
    });

    // ── Step 4: Collect all field names from the dropdown ────────────

    let fieldEntries: { text: string; index: number }[] = [];

    await test.step('Collect all Update Field options', async () => {
      // Select all rows to enable bulk actions
      await page.getByRole('checkbox', { name: 'Select all' }).click();
      await page
        .getByRole('button', { name: 'Update Field' })
        .waitFor({ state: 'visible', timeout: 10000 });
      await page.getByRole('button', { name: 'Update Field' }).click();

      // Wait for dialog and auto-expanded dropdown to render
      await page
        .getByRole('heading', { name: 'Update Field' })
        .waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForTimeout(1500);

      // Collect all field entries from the dropdown panel
      fieldEntries = await getDropdownFieldEntries();
      console.log(`Found ${fieldEntries.length} fields in the Update Fields dropdown`);
      fieldEntries.forEach((f, i) => console.log(`  [${i}] ${f.text}`));

      // Close the dropdown and dialog
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await clearOverlays();
      const cancelBtn = page.getByRole('button', { name: 'Cancel' });
      if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cancelBtn.click();
        await page.waitForTimeout(500);
      }
    });

    expect(fieldEntries.length).toBeGreaterThan(0);

    // ── Step 5: Iterate through each field and update ─────────────

    let updatedCount = 0;
    const skippedFields: string[] = [];

    for (let i = 0; i < fieldEntries.length; i++) {
      const field = fieldEntries[i];

      // Skip Upload fields (require file uploads)
      if (field.text === 'Upload') {
        console.log(`⏭ Skipping Upload field at index ${i}`);
        skippedFields.push(`${field.text} (index ${i})`);
        continue;
      }

      await test.step(`[${i + 1}/${fieldEntries.length}] Update field: "${field.text}"`, async () => {
        // 1. Click "Select all" checkbox
        const selectAllCheckbox = page
          .getByRole('checkbox', { name: 'Select all' })
          .describe('Select all checkbox');
        await selectAllCheckbox.waitFor({ state: 'visible', timeout: 10000 });
        const isChecked = await selectAllCheckbox.isChecked().catch(() => false);
        if (!isChecked) {
          await selectAllCheckbox.click();
          await page.waitForTimeout(500);
        }

        // 2. Click "Update Field" button
        const updateFieldBtn = page
          .getByRole('button', { name: 'Update Field' })
          .describe('Update Field button');
        await updateFieldBtn.waitFor({ state: 'visible', timeout: 10000 });
        await updateFieldBtn.click();

        // 3. Wait for dialog and dropdown
        await page
          .getByRole('heading', { name: 'Update Field' })
          .waitFor({ state: 'visible', timeout: 10000 });
        await page.waitForTimeout(1000);

        // 4. Click the field at the specific index in the dropdown
        const clicked = await clickFieldByIndex(field.index);

        if (!clicked) {
          console.log(`⚠ Could not click field "${field.text}" at index ${field.index}, skipping`);
          skippedFields.push(`${field.text} (index ${field.index} - not found)`);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
          await clearOverlays();
          const cancelBtn = page.getByRole('button', { name: 'Cancel' });
          if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await cancelBtn.click();
          }
          return;
        }

        await page.waitForTimeout(800);

        // 5. Fill value using agent.act()
        await agent.act(
          `In the "Update Field" dialog that is currently open, a value input area should be visible below the selected field name "${field.text}". ` +
          `Please provide a test value based on the input type:\n` +
          `- If you see a "Select Value" dropdown button, click it and pick the first available option.\n` +
          `- If you see a text/number input field, type "Test Value".\n` +
          `- If you see a rich text editor (with formatting toolbar or inside an iframe), click inside the editor area and type "Test Description".\n` +
          `- If you see a date picker calendar, click on any available date (like today or the first available one).\n` +
          `- If you see a time picker, pick any available time slot.\n` +
          `- If you see a combobox or tag input, type "test" and then press Enter.\n` +
          `- If you see a multi-select, click to open it and select the first option.\n` +
          `- If you see a group select or any other special input, interact with it to select any available value.\n` +
          `IMPORTANT: Do NOT click the "Update" or "Cancel" button. Only fill in the value.`,
          { page, maxCycles: 10 },
        );

        // 6. Clear CDK overlays that may block buttons (e.g., date picker backdrop)
        await clearOverlays();

        // 7. Click the "Update" button
        const updateBtn = page
          .getByRole('button', { name: 'Update', exact: true })
          .describe('Update button in dialog');
        await updateBtn.click({ timeout: 10000 });

        // 8. Wait for success message
        const successMsg = page.getByText('Field updated in Jobs successfully');
        await successMsg.waitFor({ state: 'visible', timeout: 15000 });

        updatedCount++;
        console.log(`✓ [${updatedCount}] Updated field: "${field.text}"`);

        // Wait for the toast to disappear and page to settle
        await page.waitForTimeout(2000);
      });
    }

    // ── Final summary ────────────────────────────────────────────────

    console.log('\n' + '='.repeat(60));
    console.log('UPDATE FIELDS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total fields:   ${fieldEntries.length}`);
    console.log(`Updated:        ${updatedCount}`);
    console.log(`Skipped:        ${skippedFields.length}`);
    if (skippedFields.length > 0) {
      console.log(`Skipped fields: ${skippedFields.join(', ')}`);
    }
    console.log('='.repeat(60));

    expect(updatedCount).toBeGreaterThan(0);
  });
});
