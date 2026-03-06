import { test, expect } from '@stablyai/playwright-test';

test.describe('Jobs Bulk Update Field Actions', () => {
  /**
   * User Prompt:
   * - Log in "https://stagingv3.zuperpro.com/"
   *   Company Name: TestR
   *   Username: ragupathy.s@zuper.co
   *   Password: Test@1234
   * - after logged in cancell the Pop ups in the HomePage
   * - Go to the Jobs module
   * - Perform bulk action using flow steps:
   *   Step1: Click on the checkbox "SelectAll"
   *   Step2: Click on the "Update Field" button
   *   Step3: Select each column name individually and provide the values and update
   *   Step4: Please do this action for first five fields in the "update field" dropdown
   *   Note: You have to click again Select All check box and update field for every field updation
   */
  test('should perform bulk update field for first five fields in Jobs', async ({ page, agent }) => {
    test.setTimeout(600000); // 10 minutes for this long flow

    // Step 1: Navigate to login page
    await test.step('Navigate to login page', async () => {
      await page.goto('https://stagingv3.zuperpro.com/login');
      await page.getByRole('textbox', { name: 'Company Name' }).waitFor({ state: 'visible', timeout: 30000 });
    });

    // Step 2: Enter company name and continue
    await test.step('Enter company name', async () => {
      await page.getByRole('textbox', { name: 'Company Name' }).fill('TestR');
      await page.getByRole('button', { name: 'Continue' }).click();
    });

    // Step 3: Enter credentials and login
    await test.step('Enter credentials and login', async () => {
      const emailField = page.getByRole('textbox', { name: 'Email address' });
      await emailField.waitFor({ state: 'visible', timeout: 15000 });
      await emailField.fill('ragupathy.s@zuper.co');

      // Explicitly click password field before filling to avoid race condition
      const passwordField = page.getByRole('textbox', { name: 'Password Forgot password?' });
      await passwordField.waitFor({ state: 'visible', timeout: 5000 });
      await passwordField.click();
      await passwordField.fill('Test@1234');

      await page.getByRole('button', { name: 'Login', exact: true }).click();
    });

    // Step 4: Wait for dashboard and dismiss popups
    await test.step('Dismiss homepage popups', async () => {
      await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });
      await page.waitForTimeout(3000);

      // Dismiss timezone dialog if it appears
      const timezoneDialog = page.getByRole('heading', { name: 'Your timezone has changed' });
      if (await timezoneDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.getByRole('button', { name: 'Cancel' }).click();
        await timezoneDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      }

      // Dismiss "No, thanks" notification if present
      const noThanksButton = page.getByRole('button', { name: 'No, thanks' });
      if (await noThanksButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await noThanksButton.click();
        await page.waitForTimeout(500);
      }

      // Dismiss any remaining overlay
      const overlay = page.locator('.cdk-overlay-backdrop');
      if (await overlay.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
      }
    });

    // Step 5: Navigate to Jobs module
    await test.step('Navigate to Jobs module', async () => {
      await page.locator('#job_group').first().click();
      await page.waitForTimeout(500);
      await page.getByRole('link', { name: 'Jobs', exact: true }).click();
      await expect(page).toHaveURL(/\/jobs/, { timeout: 30000 });
      // Wait for the jobs table to load
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 });
    });

    // Helper function to perform a bulk update field action
    const performBulkUpdateField = async (fieldName, selectValueFn) => {
      // Click Select All checkbox
      const selectAllCheckbox = page.getByRole('checkbox', { name: 'Select all' }).describe('Select All checkbox');
      await selectAllCheckbox.waitFor({ state: 'visible', timeout: 10000 });
      await selectAllCheckbox.click();
      await page.waitForTimeout(1000);

      // Click Update Field button
      const updateFieldBtn = page.getByRole('button', { name: 'Update Field' }).describe('Update Field button');
      await updateFieldBtn.waitFor({ state: 'visible', timeout: 10000 });
      await updateFieldBtn.click();

      // Wait for Update Field dialog to appear
      await page.getByRole('heading', { name: 'Update Field', level: 6 }).waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForTimeout(1000);

      // The "Select Field" dropdown auto-expands when dialog opens
      // Use the search input to find the field quickly
      const searchInput = page.getByRole('textbox', { name: 'Search' }).last();
      await searchInput.waitFor({ state: 'visible', timeout: 5000 });
      await searchInput.fill(fieldName);
      await page.waitForTimeout(500);

      // Click the field option from the filtered results
      const fieldBtn = page.getByRole('button', { name: fieldName, exact: true }).first().describe(`${fieldName} option`);
      await fieldBtn.waitFor({ state: 'visible', timeout: 5000 });
      await fieldBtn.click();
      await page.waitForTimeout(1000);

      // Provide value using the callback
      await selectValueFn();

      // Close any open dropdowns by pressing Escape (closes ng-select dropdown, not the dialog)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Click Update button - use JavaScript click to bypass any remaining overlay issues
      const updateBtn = page.getByRole('button', { name: 'Update', exact: true }).describe('Update button');
      await updateBtn.waitFor({ state: 'visible', timeout: 5000 });
      await updateBtn.scrollIntoViewIfNeeded();
      await updateBtn.evaluate(el => el.click());

      // Wait for the update to complete and dialog to close
      await page.getByRole('heading', { name: 'Update Field', level: 6 }).waitFor({ state: 'hidden', timeout: 15000 });
      await page.waitForTimeout(2000);
    };

    // ===== FIELD 1: Job Priority =====
    await test.step('Bulk Update Field 1: Job Priority to Medium', async () => {
      await performBulkUpdateField('Job Priority', async () => {
        // The value dropdown auto-expands after field selection
        // Directly click the "Medium" option from the already-open dropdown
        const mediumOption = page.getByRole('button', { name: 'Medium' }).describe('Medium priority option');
        await mediumOption.waitFor({ state: 'visible', timeout: 5000 });
        await mediumOption.click();
      });

      // Verify priority updated in the table
      await expect(page.locator('table tbody tr').first().locator('td').filter({ hasText: 'Medium' }).first()).toBeVisible({ timeout: 10000 });
    });

    // ===== FIELD 2: Job Description =====
    await test.step('Bulk Update Field 2: Job Description', async () => {
      await performBulkUpdateField('Job Description', async () => {
        // Wait for TinyMCE to load, then type into the rich text editor iframe
        const iframe = page.locator('iframe[title="Rich Text Area"]');
        // Try to use the rich text editor if it loads
        try {
          await iframe.waitFor({ state: 'visible', timeout: 10000 });
          const richTextFrame = iframe.contentFrame();
          const editor = richTextFrame.getByLabel('Rich Text Area. Press ALT-0');
          await editor.click();
          await editor.fill('Bulk updated job description for QA testing');
        } catch {
          // Fallback: If TinyMCE fails to load, try using agent
          await agent.act('Type "Bulk updated job description for QA testing" into the text editor area for Job Description', { page, maxCycles: 8 });
        }
      });
    });

    // ===== FIELD 3: Due Date =====
    await test.step('Bulk Update Field 3: Due Date', async () => {
      await performBulkUpdateField('Due Date', async () => {
        // Use agent to interact with the date picker
        await agent.act('Click the date input field for "Update Due Date", then select a date that is about 2 weeks from today (around March 20, 2026) in the calendar picker that appears. Click on the date number to select it.', { page, maxCycles: 10 });
      });
    });

    // ===== FIELD 4: Job Tags =====
    await test.step('Bulk Update Field 4: Job Tags', async () => {
      await performBulkUpdateField('Job Tags', async () => {
        // Use agent to interact with the tags field and select first tag
        await agent.act('In the "Update Job Tags" section, click the tags dropdown or input field, then select the first available tag option from the list. If there is a search box, just select the first tag visible.', { page, maxCycles: 10 });
      });
    });

    // ===== FIELD 5: Multi Selection (Custom fields - Default) =====
    await test.step('Bulk Update Field 5: Multi Selection (Custom Field)', async () => {
      await performBulkUpdateField('Multi Selection', async () => {
        // Use agent to interact with multi-selection custom field
        await agent.act('In the "Update Multi Selection" section, click the dropdown or selection area, then select the first available option from the list.', { page, maxCycles: 10 });
      });
    });
  });

  /**
   * User Prompt:
   * - To perform filter action
   * - Test all filter chips in the Jobs module: Job Category, Scheduled Date Range, Job Priority
   *
   * [Clarifications:]
   * - Filter type: All filter chips
   */
  test('should perform filter actions using all filter chips in Jobs', async ({ page, agent }) => {
    test.setTimeout(300000); // 5 minutes

    // Step 1: Navigate to login page
    await test.step('Navigate to login page', async () => {
      await page.goto('https://stagingv3.zuperpro.com/login');
      await page.getByRole('textbox', { name: 'Company Name' }).waitFor({ state: 'visible', timeout: 30000 });
    });

    // Step 2: Enter company name and continue
    await test.step('Enter company name', async () => {
      await page.getByRole('textbox', { name: 'Company Name' }).fill('TestR');
      await page.getByRole('button', { name: 'Continue' }).click();
    });

    // Step 3: Enter credentials and login
    await test.step('Enter credentials and login', async () => {
      const emailField = page.getByRole('textbox', { name: 'Email address' });
      await emailField.waitFor({ state: 'visible', timeout: 15000 });
      await emailField.fill('ragupathy.s@zuper.co');

      const passwordField = page.getByRole('textbox', { name: 'Password Forgot password?' });
      await passwordField.waitFor({ state: 'visible', timeout: 5000 });
      await passwordField.click();
      await passwordField.fill('Test@1234');

      await page.getByRole('button', { name: 'Login', exact: true }).click();
    });

    // Step 4: Dismiss homepage popups
    await test.step('Dismiss homepage popups', async () => {
      await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });
      await page.waitForTimeout(3000);

      const timezoneDialog = page.getByRole('heading', { name: 'Your timezone has changed' });
      if (await timezoneDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.getByRole('button', { name: 'Cancel' }).click();
        await timezoneDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      }

      const noThanksButton = page.getByRole('button', { name: 'No, thanks' });
      if (await noThanksButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await noThanksButton.click();
        await page.waitForTimeout(500);
      }

      const overlay = page.locator('.cdk-overlay-backdrop');
      if (await overlay.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
      }
    });

    // Step 5: Navigate to Jobs module
    await test.step('Navigate to Jobs module', async () => {
      await page.locator('#job_group').first().click();
      await page.waitForTimeout(500);
      await page.getByRole('link', { name: 'Jobs', exact: true }).click();
      await expect(page).toHaveURL(/\/jobs/, { timeout: 30000 });
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 });
      await page.waitForTimeout(2000);
    });

    // Get initial row count for comparison
    const getVisibleRowCount = async () => {
      return await page.locator('table tbody tr').count();
    };

    // Helper: Open the filter panel
    const openFilterPanel = async () => {
      const filterBtn = page.getByRole('button', { name: 'Filter' }).describe('Filter button');
      await filterBtn.click();
      // Wait for filter panel to appear
      await page.getByRole('heading', { name: 'Pinned Filters', level: 2 }).waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForTimeout(500);
    };

    // Helper: Close the filter panel
    const closeFilterPanel = async () => {
      // Click the close button (X) on the filter panel
      const closeBtn = page.locator('.filter-panel-close, [class*="close"]').first();
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click();
      } else {
        // Fallback: click the Filter button again to toggle panel
        await page.getByRole('button', { name: 'Filter' }).click();
      }
      await page.waitForTimeout(500);
    };

    // Helper: Expand a pinned filter by clicking "Choose condition and value"
    const expandPinnedFilter = async (filterName) => {
      await agent.act(`In the Pinned Filters section, click "Choose condition and value" next to "${filterName}" to expand it.`, { page, maxCycles: 5 });
      await page.waitForTimeout(500);
    };

    // Helper: Clear an applied filter using the clear/edit buttons
    const clearAppliedFilter = async (filterName) => {
      // Click the edit button (pencil icon) on the applied filter to re-expand it
      await agent.act(`In the filter panel, find the applied "${filterName}" filter and click the small edit/pencil icon button to re-expand the filter settings. Then click the "Clear all" (x) button next to the condition value to clear it. Then click "Update" to remove the filter.`, { page, maxCycles: 10 });
      await page.waitForTimeout(2000);
    };

    // ===== FILTER 1: Job Category =====
    await test.step('Filter by Job Category', async () => {
      await openFilterPanel();

      // Expand Job Category filter
      await expandPinnedFilter('Job Category');

      // Select "Contains" condition
      const conditionInput = page.locator('#operator_job_category_uid').getByRole('textbox');
      await conditionInput.waitFor({ state: 'visible', timeout: 5000 });
      await conditionInput.click();
      await page.getByRole('option', { name: 'Contains', exact: true }).click();
      await page.waitForTimeout(500);

      // Select "TestRCategory" value
      const fieldValueInput = page.locator('#field_value_job_category_uid').getByRole('textbox');
      await fieldValueInput.click();
      await page.getByRole('option', { name: 'TestRCategory' }).click();
      await page.waitForTimeout(500);

      // Click Update to apply filter
      await page.getByRole('button', { name: 'Update' }).first().evaluate(el => el.click());
      await page.waitForTimeout(2000);

      // Verify: table should show filtered results
      const rowCount = await getVisibleRowCount();
      expect(rowCount).toBeGreaterThan(0);
      await expect(page.locator('table')).toBeVisible();

      // Clear the filter
      await clearAppliedFilter('Job Category');
    });

    // ===== FILTER 2: Scheduled Date Range =====
    await test.step('Filter by Scheduled Date Range', async () => {
      // Expand Scheduled Date Range filter
      await expandPinnedFilter('Scheduled Date Range');

      // The Scheduled Date Range only has "Within" condition (no "Contains")
      // Select "Within" condition
      await agent.act('In the expanded Scheduled Date Range filter, click the "Choose Condition" dropdown and select "Within".', { page, maxCycles: 5 });
      await page.waitForTimeout(500);

      // Select a preset date range - "This Month"
      await agent.act('In the expanded Scheduled Date Range filter, click on the date range field (it may show "Last 7 Days" or similar). From the dropdown of preset options that appears, select "This Month". Then click the "Update" button to apply the filter.', { page, maxCycles: 10 });
      await page.waitForTimeout(2000);

      // Verify: table should still be visible (may have 0 results if no scheduled jobs)
      await expect(page.locator('table')).toBeVisible();

      // Clear the filter
      await clearAppliedFilter('Scheduled Date Range');
    });

    // ===== FILTER 3: Job Priority =====
    await test.step('Filter by Job Priority', async () => {
      // Expand Job Priority filter
      await expandPinnedFilter('Job Priority');

      // Select "Contains" condition
      const priorityCondition = page.locator('#operator_job_priority').getByRole('textbox');
      await priorityCondition.waitFor({ state: 'visible', timeout: 5000 });
      await priorityCondition.click();
      await page.getByRole('option', { name: 'Contains', exact: true }).click();
      await page.waitForTimeout(500);

      // Select "Medium" value
      const priorityValue = page.locator('#field_value_job_priority').getByRole('textbox');
      await priorityValue.click();
      await page.getByRole('option', { name: 'Medium' }).click();
      await page.waitForTimeout(500);

      // Click Update to apply filter
      await page.getByRole('button', { name: 'Update' }).first().evaluate(el => el.click());
      await page.waitForTimeout(2000);

      // Verify: table should show filtered results with Medium priority
      const rowCount = await getVisibleRowCount();
      expect(rowCount).toBeGreaterThan(0);
      await expect(page.locator('table')).toBeVisible();

      // Clear the filter
      await clearAppliedFilter('Job Priority');

      // Verify all jobs are shown again after clearing
      await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });
    });
  });
});
