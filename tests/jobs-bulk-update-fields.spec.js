import { test, expect } from '@stablyai/playwright-test';

/**
 * User Prompt:
 * - Launch -> https://uat.zuperpro.com/login
 *   company name : zuper-pro
 *   username : ragupathy.s@zuper.co
 *   password : Test@1234
 *   After logged in cancel the pop ups in the Dashboard page
 *   Go to the Jobs module Click on the select all checkbox
 *   Click on the UpdateField button
 *   Select the field and provide the value
 *   Click on the update button
 *   Again click on the select all checkbox
 *   Click on the UpdateField button
 *   Select the field and provide the value
 *   Click on the update button.
 *   This will do untill all the fields from "update fields" list update
 * - Note: Update below mentioned fields
 *   Field name: Job Priotity, Value: Low
 *   Job Description, Value: QA Description
 *   Due Date, Value: Select Current Date
 *   Tags, Value: Name contains "AC"
 *   Account Notification, Value: No
 *   Number Of Days Elapsed, Value: 11
 *   Time, Value: Current Time
 *   Default Custom Field group: Single Selection, Value: Option 1
 *   Default Custom Field group: Multi Selection, Value: Option1, Option2
 *   Default Custom Field group: Dropdown, Value: Option1
 *   Default Custom Field group: Single Line Text For Num, Value: 1
 *   Default Custom Field group: Single Line Text For Mail, Value: q@q
 *   Default Custom Field group: Single Line Text For Phone No, Value: 9876543210
 */
test.describe('Jobs Bulk Update Fields', () => {
  test.setTimeout(600000); // 10 minutes for the full flow

  test('Update all specified fields via bulk Update Field', async ({ page }) => {

    // ========================
    // Helper: Dismiss all common popups/overlays
    // ========================
    const dismissPopups = async () => {
      const cancelBtn = page.getByRole('button', { name: 'Cancel' });
      if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cancelBtn.click();
        await page.waitForTimeout(500);
      }
      const noThanks = page.getByRole('button', { name: 'No, thanks' });
      if (await noThanks.isVisible({ timeout: 3000 }).catch(() => false)) {
        await noThanks.click();
        await page.waitForTimeout(500);
      }
      await page.evaluate(() => {
        document.querySelectorAll('.cdk-overlay-backdrop').forEach(el => el.remove());
        document.querySelectorAll('.cdk-overlay-transparent-backdrop').forEach(el => el.remove());
      });
      await page.waitForTimeout(300);
    };

    // ========================
    // Helper: JS click a button inside CDK overlay by exact text
    // (Bypasses CDK overlay backdrop that intercepts Playwright clicks)
    // ========================
    const clickOverlayButton = async (text, exact = true) => {
      await page.evaluate(({ text, exact }) => {
        const container = document.querySelector('.cdk-overlay-container');
        if (container) {
          const buttons = container.querySelectorAll('button');
          for (const btn of buttons) {
            const btnText = btn.textContent.trim();
            if (exact ? btnText === text : btnText.includes(text)) {
              btn.click();
              return;
            }
          }
        }
      }, { text, exact });
      await page.waitForTimeout(500);
    };

    // ========================
    // Helper: JS click the Update button in the dialog
    // ========================
    const clickDialogUpdate = async () => {
      // Wait briefly for any animations/transitions to complete
      await page.waitForTimeout(500);
      const clicked = await page.evaluate(() => {
        // Try .cdk-global-overlay-wrapper first, then .cdk-overlay-container
        const selectors = ['.cdk-global-overlay-wrapper', '.cdk-overlay-container'];
        for (const sel of selectors) {
          const container = document.querySelector(sel);
          if (container) {
            const buttons = container.querySelectorAll('button');
            for (const btn of buttons) {
              if (btn.textContent.trim() === 'Update') {
                btn.click();
                return true;
              }
            }
          }
        }
        return false;
      });
      if (!clicked) {
        // Fallback: use Playwright click
        await page.getByRole('button', { name: 'Update', exact: true }).click({ timeout: 5000 });
      }
      await page.waitForTimeout(500);
    };

    // ========================
    // Step 1: Login
    // ========================
    await test.step('Login to the application', async () => {
      await page.goto('https://uat.zuperpro.com/login');
      const companyInput = page.getByRole('textbox', { name: 'Company Name' }).describe('Company Name input');
      await companyInput.waitFor({ state: 'visible', timeout: 30000 });
      await companyInput.fill('zuper-pro');

      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Continue');
        if (btn) btn.click();
      });

      const emailInput = page.getByRole('textbox', { name: 'Email address' }).describe('Email input');
      await emailInput.waitFor({ state: 'visible', timeout: 15000 });
      await emailInput.fill('ragupathy.s@zuper.co');

      const passwordInput = page.getByRole('textbox', { name: 'Password Forgot password?' }).describe('Password input');
      await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
      await passwordInput.fill('Test@1234');

      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Login');
        if (btn) btn.click();
      });

      await page.waitForURL('**/dashboard**', { timeout: 60000 });
    });

    // ========================
    // Step 2: Dismiss popups on Dashboard
    // ========================
    await test.step('Dismiss popups on Dashboard', async () => {
      await dismissPopups();
      await page.waitForTimeout(1000);
      await dismissPopups();
    });

    // ========================
    // Step 3: Navigate to Jobs module
    // ========================
    await test.step('Navigate to Jobs module', async () => {
      await page.goto('https://uat.zuperpro.com/jobs', { waitUntil: 'domcontentloaded', timeout: 60000 });
      const table = page.locator('table').first().describe('Jobs table');
      await table.waitFor({ state: 'visible', timeout: 30000 });
      await dismissPopups();
      await page.waitForTimeout(1000);
    });

    // ========================
    // Helper: Perform a field update cycle
    // ========================
    const performFieldUpdate = async (fieldName, setValueCallback, stepLabel) => {
      await test.step(stepLabel || `Update field: ${fieldName}`, async () => {
        // 1. Click Select all checkbox
        const selectAllCheckbox = page.getByRole('checkbox', { name: 'Select all' }).describe('Select all checkbox');
        await selectAllCheckbox.waitFor({ state: 'visible', timeout: 15000 });
        await selectAllCheckbox.click();
        await page.waitForTimeout(1000);

        // 2. Click Update Field button
        const updateFieldBtn = page.getByRole('button', { name: 'Update Field' }).describe('Update Field button');
        await updateFieldBtn.waitFor({ state: 'visible', timeout: 10000 });
        await updateFieldBtn.click();
        await page.waitForTimeout(1000);

        // 3. Wait for dialog heading to confirm dialog is open
        const dialogHeading = page.getByRole('heading', { name: 'Update Field' }).describe('Update Field dialog heading');
        await dialogHeading.waitFor({ state: 'visible', timeout: 10000 });
        await page.waitForTimeout(500);

        // 4. Select the field from the dropdown (already expanded)
        //    Use JS click to bypass CDK overlay backdrop
        await clickOverlayButton(fieldName);
        await page.waitForTimeout(2000); // Allow time for value editor to render (e.g. TinyMCE)

        // 5. Set the value using the provided callback
        await setValueCallback();

        // 6. Click Update button in the dialog
        await clickDialogUpdate();

        // 7. Verify success toast message
        //    Standard fields show "Field updated in Jobs successfully"
        //    Custom fields show "Custom fields updated to jobs successfully"
        const successToast = page.getByText(/updated.*jobs successfully/i).first().describe('Success toast');
        await expect(successToast).toBeVisible({ timeout: 30000 });

        // 8. Wait for toast to disappear and page to stabilize
        await page.waitForTimeout(3000);
      });
    };

    // ========================
    // Helper: Select a dropdown value in the overlay
    // Opens the "Select Value" dropdown only if needed, then clicks the option
    // ========================
    const selectDropdownValue = async (valueName, exact = true) => {
      // Check if the target option is already visible in the overlay
      const alreadyVisible = await page.evaluate(({ name, exact }) => {
        const container = document.querySelector('.cdk-overlay-container');
        if (container) {
          const buttons = container.querySelectorAll('button');
          for (const btn of buttons) {
            const txt = btn.textContent.trim();
            if (exact ? txt === name : txt.includes(name)) {
              // Check if the button is visible (not inside collapsed container)
              const rect = btn.getBoundingClientRect();
              return rect.height > 0 && rect.width > 0;
            }
          }
        }
        return false;
      }, { name: valueName, exact });

      if (!alreadyVisible) {
        // Need to open the dropdown first
        await clickOverlayButton('Select Value', false);
        await page.waitForTimeout(500);
      }

      await clickOverlayButton(valueName, exact);
    };

    // ========================
    // Field 1: Job Priority → Low
    // ========================
    await performFieldUpdate('Job Priority', async () => {
      await selectDropdownValue('Low');
    }, 'Update Job Priority to Low');

    // ========================
    // Field 2: Job Description → QA Description
    // ========================
    await performFieldUpdate('Job Description', async () => {
      const editorIframe = page.locator('.cdk-global-overlay-wrapper iframe').describe('Rich text editor iframe');
      await editorIframe.waitFor({ state: 'visible', timeout: 30000 });
      const frame = page.frameLocator('.cdk-global-overlay-wrapper iframe');
      const editorBody = frame.locator('body').describe('Rich text editor body');
      await editorBody.click();
      await editorBody.fill('QA Description');
      await page.waitForTimeout(300);
    }, 'Update Job Description to QA Description');

    // ========================
    // Field 3: Due Date → Current Date
    // ========================
    await performFieldUpdate('Due Date', async () => {
      // Build today's date label: "April 2, 2026"
      const today = new Date();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      const dateLabel = `${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;

      // Click today's button in the calendar grid via JS to bypass overlay backdrop
      await page.evaluate((label) => {
        const container = document.querySelector('.cdk-overlay-container');
        if (container) {
          const buttons = container.querySelectorAll('button');
          for (const btn of buttons) {
            if (btn.getAttribute('aria-label') === label || btn.textContent.trim() === label) {
              btn.click();
              return;
            }
          }
        }
      }, dateLabel);
      await page.waitForTimeout(1000); // Wait for calendar to close
    }, 'Update Due Date to Current Date');

    // ========================
    // Field 4: Job Tags → Name contains "AC"
    // ========================
    await performFieldUpdate('Job Tags', async () => {
      const tagInput = page.locator('.cdk-global-overlay-wrapper input, .cdk-global-overlay-wrapper textbox').last().describe('Tag search input');
      await tagInput.waitFor({ state: 'visible', timeout: 10000 });
      await tagInput.fill('AC');
      await page.waitForTimeout(1500);

      // Select the first matching tag option from the listbox
      const tagOption = page.getByRole('option').filter({ hasText: /AC/ }).first().describe('AC tag option');
      await tagOption.waitFor({ state: 'visible', timeout: 10000 });
      await tagOption.click();
      await page.waitForTimeout(300);
    }, 'Update Tags with name containing AC');

    // ========================
    // Field 5: Accounts Notification → No
    // ========================
    await performFieldUpdate('Accounts Notification', async () => {
      await selectDropdownValue('No');
    }, 'Update Accounts Notification to No');

    // ========================
    // Field 6: Number Of Days Elapsed → 11
    // ========================
    await performFieldUpdate('Number Of Days Elapsed', async () => {
      const numberInput = page.locator('.cdk-global-overlay-wrapper input').describe('Number input');
      await numberInput.waitFor({ state: 'visible', timeout: 10000 });
      await numberInput.click();
      await numberInput.fill('11');
      await page.waitForTimeout(300);
    }, 'Update Number Of Days Elapsed to 11');

    // ========================
    // Field 7: Time → Current Time
    // ========================
    await performFieldUpdate('Time', async () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const isPM = hours >= 12;
      const displayHours = hours % 12 || 12;

      const inputs = page.locator('.cdk-global-overlay-wrapper input');
      const hourInput = inputs.first().describe('Hour input');
      await hourInput.waitFor({ state: 'visible', timeout: 10000 });
      await hourInput.click();
      await hourInput.fill(displayHours.toString().padStart(2, '0'));

      const minuteInput = inputs.nth(1).describe('Minute input');
      if (await minuteInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await minuteInput.click();
        await minuteInput.fill(minutes.toString().padStart(2, '0'));
      }

      // Toggle AM/PM
      const amPmText = isPM ? 'PM' : 'AM';
      const amPmBtn = page.locator('.cdk-global-overlay-wrapper').getByText(amPmText, { exact: true }).first();
      if (await amPmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await amPmBtn.click({ force: true });
      }
      await page.waitForTimeout(300);
    }, 'Update Time to Current Time');

    // ========================
    // Field 8: Single Selection (Default) → Option 1
    // ========================
    await performFieldUpdate('Single Selection', async () => {
      await selectDropdownValue('Option 1');
    }, 'Update Single Selection to Option 1');

    // ========================
    // Field 9: Multi Selection (Default) → Option1, Option2
    // ========================
    await performFieldUpdate('Multi Selection', async () => {
      // Check if options are already visible, open dropdown if not
      await selectDropdownValue('Option1');
      await page.waitForTimeout(300);
      await clickOverlayButton('Option2');
      await page.waitForTimeout(300);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }, 'Update Multi Selection to Option1, Option2');

    // ========================
    // Field 10: Dropdown (Default) → Option1
    // ========================
    await performFieldUpdate('Dropdown', async () => {
      await selectDropdownValue('Option1');
    }, 'Update Dropdown to Option1');

    // ========================
    // Field 11: Single Line Text For Num → 1
    // ========================
    await performFieldUpdate('Single Line Text For Num', async () => {
      const numInput = page.locator('.cdk-global-overlay-wrapper input').describe('Number text input');
      await numInput.waitFor({ state: 'visible', timeout: 10000 });
      await numInput.click();
      await numInput.fill('1');
      await page.waitForTimeout(300);
    }, 'Update Single Line Text For Num to 1');

    // ========================
    // Field 12: Single Line Text For Mail → q@q
    // ========================
    await performFieldUpdate('Single Line Text For Mail', async () => {
      const emailInput = page.locator('.cdk-global-overlay-wrapper input').describe('Email text input');
      await emailInput.waitFor({ state: 'visible', timeout: 10000 });
      await emailInput.click();
      await emailInput.fill('q@q');
      await page.waitForTimeout(300);
    }, 'Update Single Line Text For Mail to q@q');

    // ========================
    // Field 13: Single Line Text For Phone No → 9876543210
    // ========================
    await performFieldUpdate('Single Line Text For Phone No', async () => {
      const phoneInput = page.locator('.cdk-global-overlay-wrapper input').describe('Phone text input');
      await phoneInput.waitFor({ state: 'visible', timeout: 10000 });
      await phoneInput.click();
      await phoneInput.fill('9876543210');
      await page.waitForTimeout(300);
    }, 'Update Single Line Text For Phone No to 9876543210');
  });
});
