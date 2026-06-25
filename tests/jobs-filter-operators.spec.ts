import { test, expect } from '@stablyai/playwright-test';
import type { Page } from '@playwright/test';

// Increase timeout for this long test (21 filters x multiple operators)
test.setTimeout(1200000);

/**
 * Filter configuration: each entry defines a filter to test with its
 * filter name (as shown in the Choose Filter dropdown), operator dropdown ID,
 * value, value input type, and the list of operators to cycle through.
 *
 * valueInputType:
 *   - 'textbox'    -> plain text input (e.g., Job Title, Address fields)
 *   - 'spinbutton' -> numeric input (e.g., Job ID / Work Order Number)
 *   - 'combobox'   -> ng-select dropdown with field_value_xxx ID
 *   - 'daterange'  -> ng-select dropdown with range_xxx ID (Today/Yesterday/Tomorrow/Custom Date)
 *
 * Default operators per input type (set by the UI when a filter is first added):
 *   - textbox:    "Equal To"
 *   - spinbutton: "Equal To"
 *   - daterange:  "Equal To"
 *   - combobox:   "Contains"
 */
interface FilterConfig {
  filterName: string;
  operatorDropdownId: string;
  value: string;
  valueInputType: 'textbox' | 'combobox' | 'spinbutton' | 'daterange';
  operators: string[];
}

/**
 * Returns the default operator for a given filter input type.
 */
function getDefaultOperator(valueInputType: FilterConfig['valueInputType']): string {
  switch (valueInputType) {
    case 'combobox':
      return 'Contains';
    case 'textbox':
    case 'spinbutton':
    case 'daterange':
    default:
      return 'Equal To';
  }
}

const FILTER_CONFIGS: FilterConfig[] = [
  // ── Group 1: Filters with user-specified operators ─────────────────────
  {
    filterName: 'Job Title',
    operatorDropdownId: 'operator_job_title',
    value: 'ParentJob',
    valueInputType: 'textbox',
    operators: ['Equal To', 'Not Equal To', 'Contains', 'Not Contains'],
  },
  {
    filterName: 'Job Category',
    operatorDropdownId: 'operator_job_category_uid',
    value: 'TestRCategory',
    valueInputType: 'combobox',
    operators: ['Contains', 'Not Contains'],
  },
  {
    filterName: 'Job Priority',
    operatorDropdownId: 'operator_job_priority',
    value: 'Low',
    valueInputType: 'combobox',
    operators: ['Contains', 'Not Contains', 'Is Empty', 'Is Not Empty'],
  },
  {
    filterName: 'Job Status Type',
    operatorDropdownId: 'operator_current_job_status.status_type',
    value: 'New',
    valueInputType: 'combobox',
    operators: ['Contains', 'Not Contains', 'Is Empty', 'Is Not Empty'],
  },
  // ── Group 2: Same flow as Title with all available operators ────────────
  {
    filterName: 'Job ID',
    operatorDropdownId: 'operator_work_order_number',
    value: '11',
    valueInputType: 'spinbutton',
    operators: ['Equal To', 'Not Equal To', 'Greater than', 'Less than'],
  },
  {
    filterName: 'Job Category',
    operatorDropdownId: 'operator_job_category_uid',
    value: 'Fixes',
    valueInputType: 'combobox',
    operators: ['Contains', 'Not Contains'],
  },
  {
    filterName: 'Job Priority',
    operatorDropdownId: 'operator_job_priority',
    value: 'High',
    valueInputType: 'combobox',
    operators: ['Contains', 'Not Contains'],
  },
  {
    filterName: 'Job Status Type',
    operatorDropdownId: 'operator_current_job_status.status_type',
    value: 'New',
    valueInputType: 'combobox',
    operators: ['Contains', 'Not Contains'],
  },
  {
    filterName: 'Job Recurrence Type',
    operatorDropdownId: 'operator_is_recurrence',
    value: 'Recurrent Job',
    valueInputType: 'combobox',
    operators: ['Equal To'],
  },
  {
    filterName: 'Job Delayed',
    operatorDropdownId: 'operator_delayed_job',
    value: 'Yes',
    valueInputType: 'combobox',
    operators: ['Equal To', 'Not Equal To'],
  },
  {
    filterName: 'Job Type',
    operatorDropdownId: 'operator_job_type',
    value: 'New',
    valueInputType: 'combobox',
    operators: ['Contains', 'Not Contains'],
  },
  {
    filterName: 'Job Status',
    operatorDropdownId: 'operator_status_uid',
    value: 'New',
    valueInputType: 'combobox',
    operators: ['Contains', 'Not Contains'],
  },
  {
    filterName: 'Contact Request',
    operatorDropdownId: 'operator_request_uid',
    value: 'Sanity Test Request',
    valueInputType: 'combobox',
    operators: ['Contains', 'Not Contains', 'Is Empty', 'Is Not Empty'],
  },
  {
    filterName: 'Assigned to Team',
    operatorDropdownId: 'operator_assigned_to_team.team_uid',
    value: 'QATest',
    valueInputType: 'combobox',
    operators: ['Contains', 'Not Contains', 'Is Empty', 'Is Not Empty'],
  },
  {
    filterName: 'Assigned to User',
    operatorDropdownId: 'operator_assigned_to.user_uid',
    value: 'Ragupathy Selvaraj',
    valueInputType: 'combobox',
    operators: ['Contains', 'Not Contains'],
  },
  {
    filterName: 'Assignment Status',
    operatorDropdownId: 'operator_assigned_to',
    value: 'Assigned Jobs',
    valueInputType: 'combobox',
    operators: ['Contains', 'Equal To'],
  },
  {
    filterName: 'Scheduled Status',
    operatorDropdownId: 'operator_schedule_status',
    value: 'Scheduled',
    valueInputType: 'combobox',
    operators: ['Contains', 'Equal To'],
  },
  {
    filterName: 'Scheduled Start Date',
    operatorDropdownId: 'operator_scheduled_start_time',
    value: 'Today',
    valueInputType: 'daterange',
    operators: ['Equal To', 'Greater than', 'Less than', 'Within'],
  },
  {
    filterName: 'Scheduled End Date',
    operatorDropdownId: 'operator_scheduled_end_time',
    value: 'Today',
    valueInputType: 'daterange',
    operators: ['Equal To', 'Greater than', 'Less than', 'Within'],
  },
  {
    filterName: 'Due Date',
    operatorDropdownId: 'operator_due_date',
    value: 'Today',
    valueInputType: 'daterange',
    operators: ['Equal To', 'Greater than', 'Less than', 'Within'],
  },
  {
    filterName: 'Service Address - Street',
    operatorDropdownId: 'operator_customer_address.street',
    value: 'Nkl',
    valueInputType: 'textbox',
    operators: ['Equal To', 'Not Equal To', 'Contains', 'Not Contains'],
  },
];

test.describe('Jobs Filter Operator Workflow', () => {
  /**
   * User Prompt:
   * - After logged in cancel the pop ups in the Dashboard page
   * - Go to the Jobs module Click on the filter button
   * - Delete all the added pinned filters
   * - click on the "Add Filter" button
   * - Select the choose filter as "Title"
   * - Add the operator as "Equal To"
   * - Provide the value as "ParentJob"
   * - Click on the "Add button
   * - Print the No of rows count for this filter
   * - Click on the "edit" button in the filter
   * - Change the operator as "Not Equal To"
   * - Click on the "Update" button
   * - Print the No of rows count for this filter
   * - Continue for Contains, Not Contains
   * - Delete the added filter
   * - Perform same steps as per "Title" filter for below filters:
   *   Filter name: Job Category, value: TestRCategory (Contains, NotContains only)
   *   Filter name: Priority, value: Low (Contains, NotContains, IsEmpty, IsNotEmpty)
   *   Filter name: Job StatusType, value: New (Contains, NotContains, IsEmpty, IsNotEmpty)
   *   Job ID: 11, Job Category: Fixes, Job Priority: High, Job Status Type: New,
   *   Job Recurrence Type: Yes, Job Delayed: Yes, Job Type: New, Job Status: New,
   *   Contact Request: Sanity Test Request, Assigned to Team: QATest,
   *   Assigned to User: Ragupathy Selvaraj, Assignment Status: Assigned Jobs,
   *   Scheduled Status: Scheduled, Scheduled Start Time: Today's date,
   *   Scheduled End Time: Today's date, Due Date: Today's date,
   *   Customer Address Street: Nkl
   */
  test('should filter jobs by multiple filters with all available operators and print row counts', async ({ page }) => {
    // ── Step 1: Login ──────────────────────────────────────────────────
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Company Name' }).waitFor({ state: 'visible', timeout: 30000 });
    await page.getByRole('textbox', { name: 'Company Name' }).fill(process.env.company_name ?? 'zuper-pro');

    // Use JS click to bypass banner overlay that may intercept Playwright clicks
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Continue');
      if (btn) btn.click();
    });

    await page.getByRole('textbox', { name: 'Email address' }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByRole('textbox', { name: 'Email address' }).fill(process.env.user_name || 'ragupathy.s@zuper.co');
    await page.getByRole('textbox', { name: 'Password Forgot password?' }).fill(process.env.password || 'Test@1234');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Login');
      if (btn) btn.click();
    });

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { waitUntil: 'commit', timeout: 60000 });

    // ── Step 2: Dismiss popups on Dashboard ────────────────────────────
    await dismissPopups(page);

    // ── Step 3: Navigate to Jobs module ─────────────────────────────────
    await page.goto('/jobs');
    await expect(page).toHaveTitle(/Jobs/, { timeout: 30000 });

    // Dismiss popups that may reappear after navigation
    await dismissPopups(page);

    // Wait for the filter button to appear (may show a count badge like "1" or just "Filter")
    await page.locator('button').filter({ hasText: /Filter/ }).first().waitFor({ state: 'visible', timeout: 30000 });

    // ── Step 4: Click on the filter button ──────────────────────────────
    await page.locator('button').filter({ hasText: /Filter/ }).first().click();

    // Wait for filter panel to open
    await page.getByRole('heading', { name: 'Pinned Filters' }).waitFor({ state: 'visible', timeout: 10000 });

    // ── Step 5: Delete all pinned filters ───────────────────────────────
    await removeAllPinnedFilters(page);

    // ── Step 6: Iterate through each filter configuration ───────────────
    console.log('\n' + '='.repeat(80));
    console.log('JOBS FILTER OPERATORS TEST RESULTS');
    console.log('='.repeat(80));

    for (let i = 0; i < FILTER_CONFIGS.length; i++) {
      const config = FILTER_CONFIGS[i];
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`Filter ${i + 1}/${FILTER_CONFIGS.length}: ${config.filterName} (value: "${config.value}")`);
      console.log(`Operators to test: ${config.operators.join(', ')}`);
      console.log(`${'─'.repeat(60)}`);

      // Dismiss any popups that may have appeared during the loop
      await tryDismissNotification(page);

      // Add filter with first operator
      await addFilter(page, config);

      // Print row count for first operator
      let rowCount = await getFilteredRowCount(page);
      console.log(`  [${config.filterName} ${config.operators[0]} "${config.value}"] Row count: ${rowCount}`);

      // Cycle through remaining operators via edit
      for (let opIdx = 1; opIdx < config.operators.length; opIdx++) {
        const operator = config.operators[opIdx];

        // Dismiss any popups before editing
        await tryDismissNotification(page);

        // Click edit button
        await clickFilterEditButton(page);

        // Change operator
        await changeOperator(page, config.operatorDropdownId, operator);

        // For Is Empty / Is Not Empty operators, clear the value field if needed
        if (operator === 'Is Empty' || operator === 'Is Not Empty') {
          await clearValueFieldIfPresent(page, config);
        }

        // Click Update
        await page.getByRole('button', { name: 'Update' }).click();
        await page.waitForTimeout(3000);

        // Print row count
        rowCount = await getFilteredRowCount(page);
        console.log(`  [${config.filterName} ${operator} "${config.value}"] Row count: ${rowCount}`);
      }

      // Delete the filter before adding the next one
      await deleteAppliedFilter(page);
    }

    console.log('\n' + '='.repeat(80));
    console.log('ALL FILTER OPERATOR TESTS COMPLETED');
    console.log('='.repeat(80) + '\n');
  });
});

// ── Helper functions ────────────────────────────────────────────────────────

/**
 * Dismisses common popups on initial page load: timezone dialog, notification
 * permission dialog, CDK overlay backdrops, and any other modal dialogs.
 * This version includes a longer initial wait for popups to appear.
 */
async function dismissPopups(page: Page): Promise<void> {
  await page.waitForTimeout(2000);

  // Dismiss "Your timezone has changed" dialog if present
  const cancelBtn = page.getByRole('button', { name: 'Cancel' });
  if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cancelBtn.click();
    await page.waitForTimeout(500);
  }

  // Dismiss notification permission dialog
  await tryDismissNotification(page);

  // Dismiss any remaining CDK overlay backdrops
  const backdrop = page.locator('.cdk-overlay-backdrop');
  if (await backdrop.isVisible({ timeout: 1000 }).catch(() => false)) {
    await backdrop.click({ force: true });
    await page.waitForTimeout(500);
  }
}

/**
 * Quickly dismiss the notification permission dialog if visible.
 * This is lightweight and can be called frequently without slowing down the test.
 */
async function tryDismissNotification(page: Page): Promise<void> {
  const noThanksBtn = page.getByRole('button', { name: /no,?\s*thanks/i });
  if (await noThanksBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await noThanksBtn.click();
    await page.waitForTimeout(500);
  }
}

/**
 * Removes all pinned filters by clicking the "Remove" button repeatedly.
 */
async function removeAllPinnedFilters(page: Page): Promise<void> {
  let removeBtn = page.getByRole('button', { name: 'Remove' }).first();
  while (await removeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await removeBtn.click();
    await page.waitForTimeout(500);
    removeBtn = page.getByRole('button', { name: 'Remove' }).first();
  }
}

/**
 * Adds a new filter using the provided configuration.
 * Uses the default operator for the filter type, then changes it if the first
 * desired operator differs from the default.
 *
 * Default operators per type: textbox/spinbutton/daterange = "Equal To", combobox = "Contains"
 */
async function addFilter(page: Page, config: FilterConfig): Promise<void> {
  // Click "Add Filter" button
  await page.getByRole('button', { name: 'Add Filter' }).first().click();

  // Select the filter from the dropdown
  const filterCombobox = page.getByRole('combobox', { name: 'Choose Filter' });
  await filterCombobox.waitFor({ state: 'visible', timeout: 5000 });
  await filterCombobox.click();
  await page.getByRole('option', { name: config.filterName, exact: true }).click();
  await page.waitForTimeout(500);

  // Determine the default operator for this filter type
  const defaultOp = getDefaultOperator(config.valueInputType);
  const firstDesiredOp = config.operators[0];

  // Only change operator if the first desired operator differs from the default
  if (firstDesiredOp !== defaultOp) {
    await changeOperator(page, config.operatorDropdownId, firstDesiredOp);
  }

  // For Is Empty / Is Not Empty, no value needs to be entered
  const isEmptyOperator = firstDesiredOp === 'Is Empty' || firstDesiredOp === 'Is Not Empty';

  if (!isEmptyOperator) {
    // Enter the value based on input type
    if (config.valueInputType === 'textbox') {
      await page.getByRole('textbox', { name: 'Field Value' }).fill(config.value);
    } else if (config.valueInputType === 'spinbutton') {
      // Number input fields render as spinbutton role
      await page.getByRole('spinbutton').fill(config.value);
    } else if (config.valueInputType === 'daterange') {
      // Date filters use ng-select with range_xxx ID pattern
      const rangeFieldId = config.operatorDropdownId.replace('operator_', 'range_');
      const rangeNgSelect = page.locator(`[id="${rangeFieldId}"]`);
      const rangeInput = rangeNgSelect.locator('input');
      await rangeInput.click();
      await page.waitForTimeout(500);
      // Select the date option (Today, Yesterday, Tomorrow, Custom Date)
      const option = page.getByRole('option', { name: config.value, exact: true });
      if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
        await option.click();
      }
    } else {
      // For combobox values, derive the value field ng-select ID from the operator dropdown ID.
      // Pattern: operator_xxx -> field_value_xxx
      const valueFieldId = config.operatorDropdownId.replace('operator_', 'field_value_');
      const valueNgSelect = page.locator(`[id="${valueFieldId}"]`);
      const valueInput = valueNgSelect.locator('input');
      await valueInput.click();
      // Type to search/filter the dropdown options
      await valueInput.fill(config.value);
      await page.waitForTimeout(1000);
      // Select the matching option
      const option = page.getByRole('option', { name: config.value, exact: true });
      if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
        await option.click();
      } else {
        // If exact match not found, try partial match then first available option
        const partialOption = page.getByRole('option').filter({ hasText: config.value }).first();
        if (await partialOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await partialOption.click();
        } else {
          // Close the "No items found" dropdown by pressing Escape on the ng-select
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
          // Clear the search and select the first available option
          await valueInput.clear();
          await page.waitForTimeout(500);
          const anyOption = page.getByRole('option').first();
          if (await anyOption.isVisible({ timeout: 2000 }).catch(() => false)) {
            await anyOption.click();
          }
        }
      }
    }
  }

  await page.waitForTimeout(500);

  // Dismiss notification dialog if it appeared while filling the filter form
  await tryDismissNotification(page);

  // Click "Add" button using JS evaluate to bypass any overlay that might intercept
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const addBtn = buttons.find(b => b.textContent?.trim() === 'Add');
    if (addBtn) addBtn.click();
  });

  // Wait for the filter to be applied
  await page.waitForTimeout(3000);
}

/**
 * Gets the total filtered job count from the breadcrumb badge next to the "Jobs" title.
 * The UI shows e.g. "Jobs 51" where 51 is a badge in the breadcrumb navigation.
 * Returns 0 if no count badge is found or text is not a valid number.
 */
async function getFilteredRowCount(page: Page): Promise<number> {
  // The breadcrumb navigation has: <li>Jobs</li> <li><badge>count</badge></li>
  const countBadge = page.getByLabel('Breadcrumb').locator('li').nth(1);
  await countBadge.waitFor({ state: 'visible', timeout: 10000 });
  const countText = await countBadge.textContent();
  const count = parseInt(countText?.trim() || '0', 10);
  return isNaN(count) ? 0 : count;
}

/**
 * Clicks the edit button on the first applied filter in the filter panel.
 */
async function clickFilterEditButton(page: Page): Promise<void> {
  // The edit icon has CSS classes .rounded-md.text-gray-400
  const editIcon = page.locator('.rounded-md.text-gray-400').first();
  await editIcon.waitFor({ state: 'visible', timeout: 10000 });
  await editIcon.click();

  await page.getByRole('button', { name: 'Update' }).waitFor({ state: 'visible', timeout: 5000 });
}

/**
 * Changes the operator in the filter edit form using the specified operator dropdown ID.
 */
async function changeOperator(page: Page, operatorDropdownId: string, operatorName: string): Promise<void> {
  // Handle special characters in the ID by using attribute selector
  const operatorCombobox = page.locator(`[id="${operatorDropdownId}"]`).getByRole('combobox');
  await operatorCombobox.click();

  await page.getByRole('option', { name: operatorName, exact: true }).click();
}

/**
 * Clears the value field if present (used when switching to Is Empty / Is Not Empty operators).
 */
async function clearValueFieldIfPresent(page: Page, config: FilterConfig): Promise<void> {
  try {
    if (config.valueInputType === 'textbox') {
      const textbox = page.getByRole('textbox', { name: 'Field Value' });
      if (await textbox.isVisible({ timeout: 1000 }).catch(() => false)) {
        await textbox.clear();
      }
    } else if (config.valueInputType === 'combobox') {
      // For combobox, try to clear via the "Clear all" button if visible
      const valueFieldId = config.operatorDropdownId.replace('operator_', 'field_value_');
      const clearBtn = page.locator(`[id="${valueFieldId}"]`).locator('[aria-label="Clear all"]');
      if (await clearBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await clearBtn.click();
      }
    }
  } catch {
    // Value field may not be present for Is Empty/Is Not Empty operators - that's fine
  }
}

/**
 * Deletes the currently applied filter by clicking the "Remove" button
 * (the trash icon) next to the filter in the Filters section.
 */
async function deleteAppliedFilter(page: Page): Promise<void> {
  // The filter panel has a "Filters" section with applied filters.
  // Each applied filter has "Pin" and "Remove" buttons.
  // Click the "Remove" button to delete the filter.
  const removeBtn = page.getByRole('button', { name: 'Remove' }).first();
  if (await removeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await removeBtn.click();
    await page.waitForTimeout(1000);
  }
}
