import { test, expect } from '@stablyai/playwright-test';
import {
  BULK_ACTION_URL_PART,
  REQUIRED_VALIDATION_TEXT,
  SUCCESS_TOAST_PATTERN,
  cancelUpdateFieldModal,
  chooseFieldToUpdate,
  chooseValueFromList,
  chooseValueFromNgSelect,
  clearDateTimeInput,
  dismissPopups,
  fillRichText,
  loginAndOpenJobs,
  openUpdateFieldModal,
  pickCalendarDate,
  selectAllJobsOnPage,
  submitUpdateAndExpectSuccess,
  updateFieldModal,
  valueInput,
  valueLabel,
} from './helpers/jobs-bulk-update.helper';

const BASE_URL = 'https://uat.zuperpro.com';
const COMPANY_NAME = 'Zuper-Pro';
const EMAIL = 'ragupathy.s@zuper.co';
const PASSWORD = 'Test@1234';

const DUE_DATE = { year: 2026, monthIndex: 8, day: 30, display: '09/30/2026 12:00 AM' };

test.describe('Jobs Bulk Update Field Scenarios', () => {
  /**
   * User Prompt:
   * - Automate the following end-to-end workflow in the Zuper web application.
   * - Environment:
   * - Application URL: https://uat.zuperpro.com
   * - Company name: Zuper-Pro
   * - Username: ragupathy.s@zuper.co
   * - Password: Test@1234
   * - Navigate to the Jobs module.
   * - Use the currently authenticated user/session. Do not attempt to change or reset credentials.
   * - Perform the actions using visible UI elements, labels, buttons, dropdowns, and form fields.
   * - Do not rely on fixed screen coordinates where a reliable text/role/label selector is available.
   * - Wait for the page and API-driven UI updates to complete before continuing.
   * - IMPORTANT:
   * - A Windows "Dolby Access" notification may appear at the bottom-right corner during the
   *   workflow. Ignore it. Do not click "Open Settings" or interact with the Dolby notification
   *   unless it blocks a required application element. If it blocks the UI, close/dismiss the
   *   notification only.
   * - Do not modify any unrelated Jobs.
   * - The objective is to reproduce the workflow shown in the recorded video.
   * - 1. Navigate to Jobs: Open the Zuper application. From the left navigation menu, open the
   *   "Jobs" module. Wait until the Jobs listing page is completely loaded. Verify that the Jobs
   *   listing contains job rows and that the bulk-selection checkbox is available.
   * - 2. Select the Jobs: Select the header checkbox to select all jobs currently displayed on the
   *   page. Wait for the selection state to update. Verify that the bulk action bar appears at the
   *   bottom of the page. Verify that approximately 15 jobs are selected/currently displayed in the
   *   bulk action bar. Do not navigate away from the Jobs listing. The bar contains actions such as
   *   Update Field, Update Schedule, Update Job Status, More.
   * - 3. Update Job Priority: Click "Update Field". Open "Choose Field to be Updated". Select
   *   "Job Priority". Open the "Update Job Priority" dropdown and select "High". Verify that "High"
   *   is displayed as the selected value. Click "Update". A success notification/toast appears.
   * - 4. Update Job Description: With the jobs still selected, click "Update Field". Select
   *   "Job Description". Verify that a rich-text/editor field labeled "Update Job Description"
   *   appears. Enter exactly: UAT-QA-Descript. Click "Update".
   * - 5. Update Due Date: Select "Due Date". Verify that the date/time input appears. Set the
   *   date/time to: 09/30/2026 12:00 AM. Click "Update". No validation error is shown.
   * - 6. Update Job Tags: Select "Job Tags". In the tag selector, select: AC Job. Verify that
   *   "AC Job" appears as a selected tag/chip. Do not unnecessarily remove other existing tags
   *   unless required by the UI to perform the update. Click "Update".
   * - 7. Update Lead Source: Select "Lead Source". Open the Lead Source dropdown and select:
   *   Website. Verify that "Website" is displayed as the selected value. Click "Update".
   * - 8. Update Custom Field - Single Line Text2: Locate the custom-field entries in the dropdown
   *   and select "Single Line Text2". Wait for the input field labeled "Update Single Line Text2".
   *   Enter exactly: QA-UAT-SLT. Click "Update".
   * - 9. Update Custom Field - jobValue: Select "jobValue". Verify that the corresponding input
   *   field "Update jobValue" is displayed. Enter: 11. Click "Update".
   * - 10. Validate Required Field - Date & Time - test (NEGATIVE validation scenario): Select the
   *   custom field "Date & Time - test". Verify that the field "Update Date & Time - test" appears.
   *   Leave the date/time field EMPTY. Do not enter any value. Click the "Update" button. The
   *   update must NOT be submitted. The modal should remain open. The date/time field should be
   *   highlighted as invalid. The validation message should be displayed: "Field Value is
   *   required". No success toast should be displayed for this attempt.
   * - 11. Update Custom Field - Single Line Text: Without making any unrelated changes,
   *   open/reset the "Update Field" workflow again. Select "Single Line Text". Verify that the
   *   input field "Update Single Line Text" appears. Enter exactly: QA-SLTQA. Click "Update". The
   *   Jobs listing remains displayed.
   * - 12. Final validation: Verify that the Jobs listing page is displayed. Verify that no
   *   unexpected modal remains open. Verify that the last successful update generated a success
   *   notification. Verify that there are no unexpected error messages. Verify that the failed
   *   "Date & Time - test" scenario correctly displayed "Field Value is required". Do not perform
   *   any additional updates. Preserve the final state of the Jobs page.
   * - Automation requirements: Use robust synchronization (wait for page load, modal visibility,
   *   dropdown options, API/update completion or success toast before starting the next scenario).
   *   Do not use arbitrary long sleeps unless absolutely necessary.
   * - Selector strategy: Prefer accessible roles and visible text; prefer labels associated with
   *   form controls; use button names such as "Update Field" and "Update"; use exact field names
   *   (Job Priority, Job Description, Due Date, Job Tags, Lead Source, Single Line Text2, jobValue,
   *   Date & Time - test, Single Line Text). Avoid absolute XPath selectors based on DOM position.
   *   Avoid hard-coded X/Y coordinates. The automation should continue to work if the Jobs list
   *   ordering changes, provided the same UI elements are available.
   * - For every successful update, verify the success toast before proceeding to the next scenario.
   * - For the negative validation scenario, explicitly verify: "Field Value is required".
   * - At the end, report: Total scenarios executed, Successful scenarios, Failed scenarios,
   *   Validation scenario result, Any unexpected UI/API errors encountered.
   */
  test('should bulk update job fields and enforce required-value validation', async ({ page }) => {
    test.setTimeout(900_000);

    const successfulScenarios: string[] = [];
    let validationScenarioResult = 'not executed';

    // Any non-2xx bulk_action response is an unexpected API error and is reported at the end.
    const unexpectedApiErrors: string[] = [];
    page.on('response', (response) => {
      if (response.url().includes(BULK_ACTION_URL_PART) && !response.ok()) {
        unexpectedApiErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    const modal = updateFieldModal({ page });

    // ── Scenario 1: Navigate to Jobs ───────────────────────────────────────────
    await loginAndOpenJobs({
      page,
      baseUrl: BASE_URL,
      companyName: COMPANY_NAME,
      email: EMAIL,
      password: PASSWORD,
    });

    await expect(page).toHaveURL(/\/jobs/);
    await expect(page).toHaveTitle(/Jobs/);

    const jobRows = page.locator('table tbody tr').describe('Job listing rows');
    expect(await jobRows.count()).toBeGreaterThan(0);
    await expect(
      page.getByRole('checkbox', { name: 'Select all' }).describe('Select all jobs checkbox'),
    ).toBeVisible();
    successfulScenarios.push('1. Navigate to Jobs');

    // ── Scenario 2: Select the Jobs ────────────────────────────────────────────
    // The listing shows a page of ~15 jobs; assert a range so the test survives
    // a partially filled last page rather than hard-coding the page size.
    const selectedCount = await selectAllJobsOnPage({ page });
    expect(selectedCount).toBeGreaterThan(10);
    expect(selectedCount).toBeLessThanOrEqual(15);

    const bulkActionBar = page
      .locator('.toast-slide')
      .filter({ hasText: /Job\(s\)/ })
      .first()
      .describe('Bulk action bar');
    await expect(bulkActionBar).toBeVisible();
    await expect(bulkActionBar).toContainText(`${selectedCount} Job(s)`);
    for (const action of ['Update Field', 'Update Schedule', 'Update Job Status', 'More']) {
      await expect(bulkActionBar).toContainText(action);
    }
    successfulScenarios.push('2. Select the Jobs');

    // ── Scenario 3: Update Job Priority → High ─────────────────────────────────
    await openUpdateFieldModal({ page });
    await chooseFieldToUpdate({ page, fieldName: 'Job Priority' });
    await expect(valueLabel({ page, fieldName: 'Job Priority' })).toBeVisible();
    await chooseValueFromList({ page, value: 'High' });
    await expect(
      modal.getByText('High', { exact: true }).describe('Selected priority value'),
    ).toBeVisible();
    await submitUpdateAndExpectSuccess({ page });
    successfulScenarios.push('3. Update Job Priority → High');

    // ── Scenario 4: Update Job Description ────────────────────────────────────
    await selectAllJobsOnPage({ page });
    await openUpdateFieldModal({ page });
    await chooseFieldToUpdate({ page, fieldName: 'Job Description' });
    await expect(valueLabel({ page, fieldName: 'Job Description' })).toBeVisible();
    await fillRichText({ page, text: 'UAT-QA-Descript' });
    await submitUpdateAndExpectSuccess({ page });
    successfulScenarios.push('4. Update Job Description → UAT-QA-Descript');

    // ── Scenario 5: Update Due Date → 09/30/2026 12:00 AM ─────────────────────
    await selectAllJobsOnPage({ page });
    await openUpdateFieldModal({ page });
    await chooseFieldToUpdate({ page, fieldName: 'Due Date' });
    await expect(valueLabel({ page, fieldName: 'Due Date' })).toBeVisible();
    await expect(valueInput({ page, fieldName: 'Due Date' })).toBeVisible();
    await pickCalendarDate({
      page,
      fieldName: 'Due Date',
      year: DUE_DATE.year,
      monthIndex: DUE_DATE.monthIndex,
      day: DUE_DATE.day,
    });
    await expect(valueInput({ page, fieldName: 'Due Date' })).toHaveValue(DUE_DATE.display);
    await expect(modal.getByText(REQUIRED_VALIDATION_TEXT)).toBeHidden();
    await submitUpdateAndExpectSuccess({ page });
    successfulScenarios.push(`5. Update Due Date → ${DUE_DATE.display}`);

    // ── Scenario 6: Update Job Tags → AC Job ──────────────────────────────────
    await selectAllJobsOnPage({ page });
    await openUpdateFieldModal({ page });
    await chooseFieldToUpdate({ page, fieldName: 'Job Tags' });
    await expect(valueLabel({ page, fieldName: 'Job Tags' })).toBeVisible();
    await chooseValueFromNgSelect({ page, value: 'AC Job' });
    await expect(
      modal.locator('.ng-value-label').describe('Selected job tag chips'),
    ).toHaveText(['AC Job']);
    await submitUpdateAndExpectSuccess({ page });
    successfulScenarios.push('6. Update Job Tags → AC Job');

    // ── Scenario 7: Update Lead Source → Website ──────────────────────────────
    await selectAllJobsOnPage({ page });
    await openUpdateFieldModal({ page });
    await chooseFieldToUpdate({ page, fieldName: 'Lead Source' });
    await expect(valueLabel({ page, fieldName: 'Lead Source' })).toBeVisible();
    await chooseValueFromNgSelect({ page, value: 'Website' });
    await expect(
      modal.locator('.ng-value-label').first().describe('Selected lead source'),
    ).toHaveText('Website');
    await submitUpdateAndExpectSuccess({ page });
    successfulScenarios.push('7. Update Lead Source → Website');

    // ── Scenario 8: Custom field "Single Line Text2" → QA-UAT-SLT ─────────────
    await selectAllJobsOnPage({ page });
    await openUpdateFieldModal({ page });
    await chooseFieldToUpdate({ page, fieldName: 'Single Line Text2' });
    await expect(valueLabel({ page, fieldName: 'Single Line Text2' })).toBeVisible();
    const singleLineText2Input = valueInput({ page, fieldName: 'Single Line Text2' });
    await singleLineText2Input.fill('QA-UAT-SLT');
    await expect(singleLineText2Input).toHaveValue('QA-UAT-SLT');
    await submitUpdateAndExpectSuccess({ page });
    successfulScenarios.push('8. Update Single Line Text2 → QA-UAT-SLT');

    // ── Scenario 9: Custom field "jobValue" → 11 ──────────────────────────────
    await selectAllJobsOnPage({ page });
    await openUpdateFieldModal({ page });
    await chooseFieldToUpdate({ page, fieldName: 'jobValue' });
    await expect(valueLabel({ page, fieldName: 'jobValue' })).toBeVisible();
    const jobValueInput = valueInput({ page, fieldName: 'jobValue' });
    await expect(jobValueInput).toBeVisible();
    await jobValueInput.fill('11');
    await expect(jobValueInput).toHaveValue('11');
    await submitUpdateAndExpectSuccess({ page });
    successfulScenarios.push('9. Update jobValue → 11');

    // ── Scenario 10: NEGATIVE — empty "Date & Time - test" is rejected ────────
    await selectAllJobsOnPage({ page });
    await openUpdateFieldModal({ page });
    await chooseFieldToUpdate({ page, fieldName: 'Date & Time - test' });
    await expect(valueLabel({ page, fieldName: 'Date & Time - test' })).toBeVisible();

    // The control pre-fills with the current date/time, so it must be emptied to
    // exercise the "no value provided" path described by the scenario.
    const dateTimeInput = valueInput({ page, fieldName: 'Date & Time - test' });
    await expect(dateTimeInput).toBeVisible();
    await clearDateTimeInput({ page, fieldName: 'Date & Time - test' });

    let bulkActionRequests = 0;
    const countBulkAction = (request: { url: () => string; method: () => string }) => {
      if (request.url().includes(BULK_ACTION_URL_PART) && request.method() === 'POST') {
        bulkActionRequests += 1;
      }
    };
    page.on('request', countBulkAction);

    await modal
      .getByRole('button', { name: 'Update', exact: true })
      .describe('Dialog Update button')
      .click();

    // The dialog must stay open with the field flagged invalid and nothing submitted.
    await expect(modal.getByText(REQUIRED_VALIDATION_TEXT)).toBeVisible();
    await expect(dateTimeInput).toHaveValue('');
    await expect(dateTimeInput).toHaveClass(/ng-invalid/);
    await expect(dateTimeInput).toHaveClass(/border-red-500/);
    await expect(modal).toBeVisible();
    await expect(
      page.locator('.hot-toast-message').filter({ hasText: SUCCESS_TOAST_PATTERN }),
    ).toHaveCount(0);
    expect(bulkActionRequests).toBe(0);

    page.off('request', countBulkAction);
    validationScenarioResult = `PASSED — "${REQUIRED_VALIDATION_TEXT}" shown, update blocked (0 bulk_action requests)`;
    successfulScenarios.push('10. Required-value validation for Date & Time - test');

    // Reset the workflow without submitting; Cancel preserves the job selection.
    await cancelUpdateFieldModal({ page });
    await expect(
      page.getByRole('checkbox', { name: 'Select all' }).describe('Select all jobs checkbox'),
    ).toBeChecked();

    // ── Scenario 11: Custom field "Single Line Text" → QA-SLTQA ───────────────
    await selectAllJobsOnPage({ page });
    await openUpdateFieldModal({ page });
    await chooseFieldToUpdate({ page, fieldName: 'Single Line Text' });
    await expect(valueLabel({ page, fieldName: 'Single Line Text' })).toBeVisible();
    const singleLineTextInput = valueInput({ page, fieldName: 'Single Line Text' });
    await expect(singleLineTextInput).toBeVisible();
    await singleLineTextInput.fill('QA-SLTQA');
    await expect(singleLineTextInput).toHaveValue('QA-SLTQA');
    await submitUpdateAndExpectSuccess({ page });
    successfulScenarios.push('11. Update Single Line Text → QA-SLTQA');

    // ── Scenario 12: Final validation ─────────────────────────────────────────
    await dismissPopups({ page });
    await expect(page).toHaveURL(/\/jobs/);
    await expect(page).toHaveTitle(/Jobs/);
    await expect(modal).toHaveCount(0);
    await expect(
      page.getByRole('checkbox', { name: 'Select all' }).describe('Select all jobs checkbox'),
    ).toBeVisible();
    expect(await page.locator('table tbody tr').count()).toBeGreaterThan(0);
    expect(unexpectedApiErrors).toEqual([]);
    successfulScenarios.push('12. Final validation');

    // ── Report ────────────────────────────────────────────────────────────────
    const totalScenarios = 12;
    const failedScenarios = totalScenarios - successfulScenarios.length;
    console.log('===== Jobs Bulk Update Field — Execution Report =====');
    console.log(`Total scenarios executed : ${totalScenarios}`);
    console.log(`Successful scenarios     : ${successfulScenarios.length}`);
    successfulScenarios.forEach((name) => console.log(`  ✓ ${name}`));
    console.log(`Failed scenarios         : ${failedScenarios}`);
    console.log(`Validation scenario      : ${validationScenarioResult}`);
    console.log(
      `Unexpected UI/API errors : ${unexpectedApiErrors.length === 0 ? 'none' : unexpectedApiErrors.join(', ')}`,
    );
    console.log('====================================================');

    expect(failedScenarios).toBe(0);
    expect(successfulScenarios).toHaveLength(totalScenarios);
  });
});
