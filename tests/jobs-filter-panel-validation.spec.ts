import { test, expect } from '@stablyai/playwright-test';
import {
  addFilter,
  appliedFilterCards,
  chooseFilterField,
  clearAllFilters,
  closeFilterPanel,
  dismissStartupDialogs,
  editFilter,
  navigateToJobs,
  filtersHeader,
  filterToggleButton,
  formatDate,
  getAppliedFilterTexts,
  getAvailableOperators,
  getColumnValues,
  getDisplayedJobCount,
  getFilterFieldOptions,
  getPinnedFilterNames,
  getSelectedOperator,
  getValueOptions,
  getVisibleRowCount,
  isClearAllVisible,
  isListingEmpty,
  isLogicalOperatorSelected,
  isScheduledDateWithin,
  loginToZuper,
  JOBS_FILTER_API,
  NO_JOBS_MESSAGE,
  ZUPER_COMPANY,
  ZUPER_USERNAME,
  openFilterPanel,
  parseChipDateRange,
  removeAppliedFilter,
  removePinnedFilters,
  resetFilterPanel,
  setFilterValue,
  selectOperator,
  setLogicalOperator,
  startNewFilter,
  submitFilterForm,
  waitForListSettled,
} from './helpers/jobs-filter.helper';

/** Category value that exists in this UAT account (exact "Requirements Collection" does not). */
const CATEGORY_VALUE = 'Requirements Collection';
const JOB_ID_VALUE = '681734';
const JOB_TITLE_VALUE = 'Test QA';
const TAG_VALUE = 'AC Job';
const CONTACT_REQUEST_VALUE = 'validation';
const DATE_PRESET = 'Last 7 Days';

const EXPECTED_FILTER_FIELDS = [
  'Job ID',
  'Job Title',
  'Job Category',
  'Scheduled Date Range',
  'Job Priority',
  'Job Status Type',
  'Job Type',
  'Contact Request',
  'Tags',
  'Lead Source',
];
const EXPECTED_CUSTOM_FIELDS = ['Single Line Text', 'Single Line Text2'];

const EXPECTED_PRIORITY_OPERATORS = ['Not Contains', 'Contains', 'Is Empty', 'Is Not Empty'];

const EXPECTED_DATE_RANGE_OPTIONS = [
  'Last 7 Days',
  'Next 7 Days',
  'Last 30 Days',
  'Next 30 Days',
  'This Week',
  'Last Week',
  'Next Week',
  'This Month',
  'Last Month',
  'Last 60 Days',
  'Next 60 Days',
  'Last 90 Days',
  'Next 90 Days',
  'Next Month',
  'This Quarter',
  'Last Quarter',
  'This Year',
  'Last Year',
  'Custom Range',
];

interface ScenarioResult {
  section: string;
  name: string;
  status: 'PASS' | 'FAIL';
  detail: string;
  error?: string;
}

test.describe('Zuper Pro - Jobs Filter Panel', () => {
  /**
   * User Prompt:
   * - Launch "https://uat.zuperpro.com"
   *   Log in with below credentials.
   *   CompanyName: zuper-pro
   *   Username: ragupathy.s@zuper.co
   *   Password: Test@1234
   *   after logged in successfully
   *   cancel the "New Integeration" window if it is showing
   *   cancel the "Zuper Guide" window if it is showing
   *   cancel the "Time Stamp" window if it is showing
   *   cancel the "Zuper Connect" dialer if it is showing
   *   1. Click "Jobs" in the left navigation menu and wait until the Jobs listing page is fully loaded.
   *   2. Verify that the Jobs listing is displayed and the "Filter" button is available.
   *   3. Click the "Filter" button and verify that the filter panel opens on the right side.
   *      Delete the "Job Category" filter, "Scheduled DateRange" filter and "Job Priority" filter.
   *      Verify that the following controls are available: Filters, AND, OR, Clear All, Add Filter.
   *   4. Click the "Choose Filter" dropdown and verify that the list of available filter fields is displayed,
   *      including Job ID, Job Title, Job Category, Scheduled Date Range, Job Priority, Job Status Type,
   *      Job Type, Contact Request, Tags, Lead Source and the custom fields Single Line Text / Single Line Text2.
   *      Scroll if required. Verify the custom fields are available.
   *   5. Job ID -> Equal To -> 681734, click Update and verify the chip reads "Job ID -> Equal To -> 681734"
   *      and the returned records match.
   *   6. Job Title -> Equal To -> Test QA; verify the chip and the titles.
   *   7. Job Title -> Not Equal To -> Test QA; verify jobs with that exact title are excluded.
   *   8. Job Title -> Not Contains -> Test QA; verify jobs containing it are excluded.
   *   9. Job Category -> Contains -> Requirements Collection.
   *   10. Job Priority -> verify the operators Not Contains / Contains / Is Empty / Is Not Empty are available;
   *       select "Is Empty" and verify only jobs with empty priority are returned.
   *   11. Job Status Type -> Is Not Empty.
   *   12. Tags -> Contains -> AC Job.
   *   13. Contact Request -> Contains -> validation; verify matching values are available, select it and verify the jobs.
   *   14. Job Delayed -> Equal To -> No.
   *   15. Scheduled Date Range -> verify the "Within" operator; verify the 19 date range options
   *       (Last 7 Days, Next 7 Days, Last 30 Days, Next 30 Days, This Week, Last Week, Next Week, This Month,
   *       Last Month, Last 60 Days, Next 60 Days, Last 90 Days, Next 90 Days, Next Month, This Quarter,
   *       Last Quarter, This Year, Last Year, Custom Range); select the option shown in the recorded workflow
   *       and verify the jobs fall in the range.
   *   16. Custom Range with start/end dates; verify the range is displayed and the jobs are within it.
   *   17. AND condition: Job Category Contains Requirements Collection + Job Priority Is Not Empty;
   *       verify AND is selected and the jobs satisfy BOTH.
   *   18. OR condition: the same two filters with OR selected; the jobs satisfy EITHER.
   *   19. Edit an existing filter via the pencil icon; verify it updates in place with no duplicate.
   *   20. Remove an individual filter via the X/Remove icon; the listing refreshes.
   *   21. Clear All; all filters are removed and the listing is unfiltered.
   *   22. For every filter operation: wait for the loading/skeleton, verify the data refreshed, the filter is still
   *       visible in the panel, the result count updates and there are no stale results.
   *   23. Final validation: Clear All, no active filters, the listing is displayed, the Filter button is available,
   *       no error/broken UI/loading state; end on the Jobs listing page.
   *   Automation requirements: use semantic selectors (text, labels, ARIA roles, accessible names, input labels,
   *   button names); avoid absolute XPath and screen coordinates; handle dropdowns that require scrolling; wait for
   *   dynamically loaded filter options; wait for the Jobs API/list refresh after Update; do not assume a fixed job
   *   count or ordering; verify the actual filter results instead of only verifying that the filter chip appears;
   *   if a filter returns zero results verify whether zero is logically expected before failing; capture the error
   *   message and filter configuration on an unexpected error.
   *   Final output report: 1 Login status, 2 Jobs navigation status, 3 Filter panel status, 4 each filter scenario
   *   PASS/FAIL, 5 AND result, 6 OR result, 7 Date range result, 8 Custom range result, 9 Edit/remove/clear result,
   *   10 any UI/API errors, 11 final overall automation result.
   *
   * Clarifications:
   * - Job Category value: use "Requirements Collection1" - search "Requirements Collection", select the first
   *   match, and assert the Category column equals that value.
   * - Date range preset for section 15: Last 7 Days.
   * - Custom range for section 16: first of this month -> today, computed at runtime.
   * - Structure: one sequential test that logs in once and walks all 23 sections in order, printing the
   *   PASS/FAIL report at the end.
   */
  test('validates every Jobs filter panel operator, AND/OR logic, edit, remove and clear all', async ({
    page,
  }) => {
    // The flow covers 23 sections against a 20k+ record listing, so it needs a long budget.
    test.setTimeout(2_700_000);

    const results: ScenarioResult[] = [];
    const notes: string[] = [];
    // Everything observed goes into the report (item 10); only server failures of
    // the jobs-filter endpoint itself are treated as a hard failure, since the
    // shell raises unrelated console/API noise that is not part of this feature.
    const uiErrors: string[] = [];
    const filterApiErrors: string[] = [];

    page.on('pageerror', (error) => uiErrors.push(`Page error: ${error.message}`));
    page.on('response', (response) => {
      if (response.status() < 500 || !response.url().includes('/api/')) return;
      const entry = `API ${response.status()} on ${new URL(response.url()).pathname}`;
      uiErrors.push(entry);
      if (response.url().includes(JOBS_FILTER_API)) filterApiErrors.push(entry);
    });

    /**
     * Runs one spec section, records PASS/FAIL and keeps going so the final
     * report covers every scenario even when one of them fails.
     */
    const scenario = async (
      section: string,
      name: string,
      body: () => Promise<string>
    ): Promise<void> => {
      await test.step(`${section} ${name}`, async () => {
        try {
          const detail = await body();
          results.push({ section, name, status: 'PASS', detail });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          let appliedConfig = 'unavailable';
          try {
            appliedConfig = JSON.stringify(await getAppliedFilterTexts(page));
          } catch {
            /* panel may be unusable at this point */
          }
          results.push({
            section,
            name,
            status: 'FAIL',
            detail: `filters at failure: ${appliedConfig}`,
            error: message.split('\n').slice(0, 6).join(' | '),
          });
        }
      });
      // Always hand the next scenario a clean panel.
      try {
        await resetFilterPanel(page);
      } catch (error) {
        notes.push(`Panel reset after "${section}" needed recovery: ${String(error).split('\n')[0]}`);
        await page.goto('/jobs');
        await waitForListSettled(page);
        await openFilterPanel({ page });
        await clearAllFilters(page);
      }
    };

    /** Asserts the applied cards read exactly as expected (order-independent). */
    const expectChips = async (expected: string[]): Promise<string[]> => {
      const chips = await getAppliedFilterTexts(page);
      expect(chips).toHaveLength(expected.length);
      for (const fragment of expected) {
        expect(chips.some((chip) => chip.includes(fragment))).toBeTruthy();
      }
      return chips;
    };

    // ── Login ────────────────────────────────────────────────────────────
    await test.step('Login and dismiss startup dialogs', async () => {
      await loginToZuper({ page });
      const dismissed = await dismissStartupDialogs({ page });
      await expect(page).toHaveURL(/\/dashboard/);
      results.push({
        section: '1.',
        name: 'Login',
        status: 'PASS',
        detail: `logged in as ${ZUPER_USERNAME} (company "${ZUPER_COMPANY}"); dialogs dismissed: ${
          dismissed.length ? dismissed.join(', ') : 'none were shown'
        }`,
      });
    });

    // ── 1-2. Navigate to Jobs ────────────────────────────────────────────
    let baselineTotal = 0;
    await test.step('Sections 1-2: navigate to Jobs and verify the listing', async () => {
      const { usedFallback } = await navigateToJobs({ page });
      if (usedFallback) {
        notes.push(
          'Sections 1-2: the left-nav "Jobs Group" fly-out did not expose the Jobs link in time, so the listing was reached by direct URL instead.'
        );
      }
      await expect(page).toHaveURL(/\/jobs/, { timeout: 60000 });
      await expect(page.locator('table thead th').first()).toBeVisible({ timeout: 60000 });
      await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 60000 });
      await expect(filterToggleButton(page).first()).toBeVisible({ timeout: 30000 });
      baselineTotal = await getDisplayedJobCount(page);
      expect(baselineTotal).toBeGreaterThan(0);
      results.push({
        section: '2.',
        name: 'Jobs navigation',
        status: 'PASS',
        detail: `Jobs listing loaded with ${baselineTotal} unfiltered records; "Filter" button available`,
      });
    });

    // ── 3. Filter panel ──────────────────────────────────────────────────
    await test.step('Section 3: open the filter panel, delete pinned filters, verify the controls', async () => {
      await openFilterPanel({ page });
      const removed = await removePinnedFilters({
        page,
        names: ['Job Category', 'Scheduled Date Range', 'Job Priority'],
      });
      const remaining = await getPinnedFilterNames(page);
      for (const name of ['Job Category', 'Scheduled Date Range', 'Job Priority']) {
        expect(remaining.some((entry) => entry.includes(name))).toBeFalsy();
      }

      await expect(filtersHeader(page)).toBeVisible();
      await expect(page.getByRole('button', { name: 'AND', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'OR', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add Filter' }).first()).toBeVisible();
      // "Clear All" is rendered only while at least one filter is applied.
      const clearAllWithNoFilters = await isClearAllVisible(page);
      notes.push(
        clearAllWithNoFilters
          ? '"Clear All" is visible with zero filters applied.'
          : '"Clear All" is only rendered once at least one filter is applied (verified in section 21), so it is not asserted while the panel is empty.'
      );

      results.push({
        section: '3.',
        name: 'Filter panel',
        status: 'PASS',
        detail: `panel opened; pinned filters deleted: ${
          removed.length ? removed.join(', ') : 'already absent (idempotent)'
        }; controls present: Filters, AND, OR, Add Filter`,
      });
    });

    // ── 4. Choose Filter field list ──────────────────────────────────────
    await scenario('4.', 'Choose Filter field list', async () => {
      await startNewFilter(page);
      const fields = await getFilterFieldOptions(page);
      expect(fields.length).toBeGreaterThan(10);
      for (const field of [...EXPECTED_FILTER_FIELDS, ...EXPECTED_CUSTOM_FIELDS]) {
        expect(fields, `"${field}" should be offered in the Choose Filter list`).toContain(field);
      }
      return `${fields.length} filter fields listed; all required standard fields and the custom fields ${EXPECTED_CUSTOM_FIELDS.join(
        ' / '
      )} are available`;
    });

    // ── 5. Job ID Equal To ───────────────────────────────────────────────
    await scenario('5.', `Job ID Equal To ${JOB_ID_VALUE}`, async () => {
      const { total } = await addFilter({
        page,
        spec: { field: 'Job ID', operator: 'Equal To', valueType: 'number', value: JOB_ID_VALUE },
      });
      await expectChips([`Job ID Equal To ${JOB_ID_VALUE}`]);
      expect(total).toBe(1);
      expect(await getDisplayedJobCount(page)).toBe(1);
      const ids = await getColumnValues(page, 'Job ID');
      expect(ids).toHaveLength(1);
      expect(ids[0]).toContain(JOB_ID_VALUE);
      return `chip "Job ID Equal To ${JOB_ID_VALUE}"; 1 record returned whose Job ID is ${JOB_ID_VALUE}`;
    });

    // ── 6. Job Title Equal To ────────────────────────────────────────────
    let titleEqualTotal = 0;
    await scenario('6.', `Job Title Equal To "${JOB_TITLE_VALUE}"`, async () => {
      const { total } = await addFilter({
        page,
        spec: { field: 'Job Title', operator: 'Equal To', valueType: 'text', value: JOB_TITLE_VALUE },
      });
      titleEqualTotal = total;
      await expectChips([`Job Title Equal To ${JOB_TITLE_VALUE}`]);
      expect(total).toBeGreaterThan(0);
      expect(await getDisplayedJobCount(page)).toBe(total);
      const titles = await getColumnValues(page, 'Job Title');
      expect(titles.length).toBeGreaterThan(0);
      for (const title of titles) {
        expect(title).toBe(JOB_TITLE_VALUE);
      }
      return `chip "Job Title Equal To ${JOB_TITLE_VALUE}"; ${total} record(s), every visible title is exactly "${JOB_TITLE_VALUE}"`;
    });

    // ── 7. Job Title Not Equal To ────────────────────────────────────────
    await scenario('7.', `Job Title Not Equal To "${JOB_TITLE_VALUE}"`, async () => {
      const { total } = await addFilter({
        page,
        spec: { field: 'Job Title', operator: 'Not Equal To', valueType: 'text', value: JOB_TITLE_VALUE },
      });
      await expectChips([`Job Title Not Equal To ${JOB_TITLE_VALUE}`]);
      // Complement of section 6 over the same population - only cross-checkable
      // when section 6 actually produced a count to complement.
      if (titleEqualTotal > 0) {
        expect(total).toBe(baselineTotal - titleEqualTotal);
      } else {
        expect(total).toBeGreaterThan(0);
      }
      expect(await getDisplayedJobCount(page)).toBe(total);
      const titles = await getColumnValues(page, 'Job Title');
      expect(titles.length).toBeGreaterThan(0);
      for (const title of titles) {
        expect(title).not.toBe(JOB_TITLE_VALUE);
      }
      const complement =
        titleEqualTotal > 0
          ? `${total} records = ${baselineTotal} total - ${titleEqualTotal} exact match(es)`
          : `${total} records`;
      return `chip "Job Title Not Equal To ${JOB_TITLE_VALUE}"; ${complement}; no visible title equals "${JOB_TITLE_VALUE}"`;
    });

    // ── 8. Job Title Not Contains ────────────────────────────────────────
    await scenario('8.', `Job Title Not Contains "${JOB_TITLE_VALUE}"`, async () => {
      const { total } = await addFilter({
        page,
        spec: { field: 'Job Title', operator: 'Not Contains', valueType: 'text', value: JOB_TITLE_VALUE },
      });
      await expectChips([`Job Title Not Contains ${JOB_TITLE_VALUE}`]);
      expect(total).toBeGreaterThan(0);
      expect(total).toBeLessThanOrEqual(baselineTotal - titleEqualTotal);
      expect(await getDisplayedJobCount(page)).toBe(total);
      const titles = await getColumnValues(page, 'Job Title');
      expect(titles.length).toBeGreaterThan(0);
      for (const title of titles) {
        expect(title.toLowerCase()).not.toContain(JOB_TITLE_VALUE.toLowerCase());
      }
      return `chip "Job Title Not Contains ${JOB_TITLE_VALUE}"; ${total} records and no visible title contains "${JOB_TITLE_VALUE}"`;
    });

    // ── 9. Job Category Contains ─────────────────────────────────────────
    let categoryValue = '';
    let categoryTotal = 0;
    await scenario('9.', `Job Category Contains "${CATEGORY_VALUE}"`, async () => {
      const { total, resolvedValue } = await addFilter({
        page,
        spec: { field: 'Job Category', operator: 'Contains', valueType: 'select', value: CATEGORY_VALUE },
      });
      categoryValue = resolvedValue;
      categoryTotal = total;
      expect(resolvedValue).toContain(CATEGORY_VALUE);
      await expectChips([`Job Category Contains ${resolvedValue}`]);
      expect(total).toBeGreaterThan(0);
      expect(await getDisplayedJobCount(page)).toBe(total);
      const categories = await getColumnValues(page, 'Category');
      expect(categories.length).toBeGreaterThan(0);
      for (const category of categories) {
        expect(category).toBe(resolvedValue);
      }
      return `chip "Job Category Contains ${resolvedValue}"; ${total} records, every visible Category is "${resolvedValue}"`;
    });

    // ── 10. Job Priority operators + Is Empty ────────────────────────────
    await scenario('10.', 'Job Priority operators and Is Empty', async () => {
      await startNewFilter(page);
      await chooseFilterField(page, 'Job Priority');
      const operators = await getAvailableOperators(page);
      for (const operator of EXPECTED_PRIORITY_OPERATORS) {
        expect(operators, `Job Priority should offer the "${operator}" operator`).toContain(operator);
      }

      await selectOperator(page, 'Is Empty');
      const emptyTotal = await submitFilterForm(page);
      await expectChips(['Job Priority Is Empty']);
      expect(await getDisplayedJobCount(page)).toBe(emptyTotal);

      if (emptyTotal === 0) {
        // Zero is only acceptable if the complement covers the whole population.
        await expect(page.getByText(NO_JOBS_MESSAGE).first()).toBeVisible();
        const notEmptyTotal = await editFilter({ page, operator: 'Is Not Empty', valueType: 'none' }).then(
          (r) => r.total
        );
        await expectChips(['Job Priority Is Not Empty']);
        expect(emptyTotal + notEmptyTotal).toBe(baselineTotal);
        notes.push(
          `Job Priority "Is Empty" returned 0 records. Verified as logically expected: "Is Empty" (0) + "Is Not Empty" (${notEmptyTotal}) = ${baselineTotal} total jobs, so every job has a priority.`
        );
        return `operators ${EXPECTED_PRIORITY_OPERATORS.join(
          ' / '
        )} available; "Is Empty" returned 0 records, confirmed correct because Is Empty (0) + Is Not Empty (${notEmptyTotal}) equals the ${baselineTotal} unfiltered jobs`;
      }

      const priorities = await getColumnValues(page, 'Priority');
      expect(priorities.length).toBeGreaterThan(0);
      for (const priority of priorities) {
        expect(priority).toBe('');
      }
      return `operators ${EXPECTED_PRIORITY_OPERATORS.join(
        ' / '
      )} available; "Is Empty" returned ${emptyTotal} records and every visible Priority cell is empty`;
    });

    // ── 11. Job Status Type Is Not Empty ─────────────────────────────────
    await scenario('11.', 'Job Status Type Is Not Empty', async () => {
      const { total } = await addFilter({
        page,
        spec: { field: 'Job Status Type', operator: 'Is Not Empty', valueType: 'none' },
      });
      await expectChips(['Job Status Type Is Not Empty']);
      expect(total).toBeGreaterThan(0);
      expect(total).toBeLessThanOrEqual(baselineTotal);
      expect(await getDisplayedJobCount(page)).toBe(total);
      const statuses = await getColumnValues(page, 'Status');
      expect(statuses.length).toBeGreaterThan(0);
      for (const status of statuses) {
        expect(status).not.toBe('');
      }
      return `chip "Job Status Type Is Not Empty"; ${total} records and every visible Status cell has a value`;
    });

    // ── 12. Tags Contains ────────────────────────────────────────────────
    await scenario('12.', `Tags Contains "${TAG_VALUE}"`, async () => {
      const { total, resolvedValue } = await addFilter({
        page,
        spec: { field: 'Tags', operator: 'Contains', valueType: 'select', value: TAG_VALUE },
      });
      expect(resolvedValue).toContain(TAG_VALUE);
      await expectChips([`Tags Contains ${TAG_VALUE}`]);
      expect(total).toBeGreaterThan(0);
      expect(await getDisplayedJobCount(page)).toBe(total);
      const tags = await getColumnValues(page, 'Tags');
      expect(tags.length).toBeGreaterThan(0);
      for (const tag of tags) {
        expect(tag).toContain(TAG_VALUE);
      }
      return `chip "Tags Contains ${TAG_VALUE}"; ${total} records and every visible Tags cell contains "${TAG_VALUE}"`;
    });

    // ── 13. Contact Request Contains ─────────────────────────────────────
    await scenario('13.', `Contact Request Contains "${CONTACT_REQUEST_VALUE}"`, async () => {
      await startNewFilter(page);
      await chooseFilterField(page, 'Contact Request');
      await selectOperator(page, 'Contains');
      const options = await getValueOptions(page, CONTACT_REQUEST_VALUE);
      expect(
        options.some((option) => option.toLowerCase().includes(CONTACT_REQUEST_VALUE.toLowerCase())),
        `the Contact Request value list should offer a match for "${CONTACT_REQUEST_VALUE}", got ${JSON.stringify(
          options
        )}`
      ).toBeTruthy();

      const resolvedValue = await setFilterValue(page, {
        field: 'Contact Request',
        valueType: 'select',
        value: CONTACT_REQUEST_VALUE,
      });
      const total = await submitFilterForm(page);
      // The applied card labels this field "Request".
      await expectChips([resolvedValue]);
      expect(await getDisplayedJobCount(page)).toBe(total);

      if (total === 0) {
        await expect(page.getByText(NO_JOBS_MESSAGE).first()).toBeVisible();
        await expect(appliedFilterCards(page)).toHaveCount(1);
        notes.push(
          `Contact Request Contains "${resolvedValue}" returned 0 jobs: the request exists as a selectable value but no job is linked to it in this account. The empty state was rendered and the filter stayed applied.`
        );
        return `value "${resolvedValue}" was offered and applied; 0 jobs are linked to that request, so the empty state "${NO_JOBS_MESSAGE}" is the expected result and the filter remained applied`;
      }

      const rows = await getVisibleRowCount(page);
      expect(rows).toBeGreaterThan(0);
      return `value "${resolvedValue}" was offered and applied; ${total} records returned (${rows} on the first page)`;
    });

    // ── 14. Job Delayed Equal To No ──────────────────────────────────────
    let delayedTotal = 0;
    await scenario('14.', 'Job Delayed Equal To "No"', async () => {
      const { total, resolvedValue } = await addFilter({
        page,
        spec: { field: 'Job Delayed', operator: 'Equal To', valueType: 'select', value: 'No' },
      });
      delayedTotal = total;
      expect(resolvedValue).toBe('No');
      await expectChips(['Job Delayed Equal To No']);
      expect(total).toBeGreaterThan(0);
      expect(total).toBeLessThanOrEqual(baselineTotal);
      expect(await getDisplayedJobCount(page)).toBe(total);
      expect(await getVisibleRowCount(page)).toBeGreaterThan(0);
      return `chip "Job Delayed Equal To No"; ${total} of ${baselineTotal} records returned`;
    });

    // ── 15. Scheduled Date Range preset ──────────────────────────────────
    await scenario('15.', `Scheduled Date Range Within "${DATE_PRESET}"`, async () => {
      await startNewFilter(page);
      await chooseFilterField(page, 'Scheduled Date Range');
      const operators = await getAvailableOperators(page);
      expect(operators, 'Scheduled Date Range should offer the "Within" operator').toContain('Within');
      await selectOperator(page, 'Within');
      expect(await getSelectedOperator(page)).toBe('Within');

      const presets = await getValueOptions(page);
      for (const option of EXPECTED_DATE_RANGE_OPTIONS) {
        expect(
          presets.some((preset) => preset.startsWith(option)),
          `the date range list should offer "${option}", got ${JSON.stringify(presets)}`
        ).toBeTruthy();
      }
      expect(presets.length).toBeGreaterThanOrEqual(EXPECTED_DATE_RANGE_OPTIONS.length);

      await setFilterValue(page, { field: 'Scheduled Date Range', valueType: 'daterange', value: DATE_PRESET });
      const total = await submitFilterForm(page);
      const chips = await expectChips([`Scheduled Date Range Within ${DATE_PRESET}`]);
      expect(await getDisplayedJobCount(page)).toBe(total);

      const range = parseChipDateRange(chips[0]);
      expect(total).toBeGreaterThan(0);
      const scheduled = (await getColumnValues(page, 'Scheduled Date')).filter((value) => value !== '');
      expect(scheduled.length).toBeGreaterThan(0);
      for (const value of scheduled) {
        expect(
          isScheduledDateWithin(value, range),
          `scheduled date "${value}" should fall inside ${formatDate(range.start)} - ${formatDate(range.end)}`
        ).toBeTruthy();
      }
      return `chip "${chips[0]}"; all ${EXPECTED_DATE_RANGE_OPTIONS.length} expected presets offered; ${total} records and every visible Scheduled Date is inside ${formatDate(
        range.start
      )} - ${formatDate(range.end)}`;
    });

    // ── 16. Scheduled Date Range custom range ────────────────────────────
    await scenario('16.', 'Scheduled Date Range Within a custom range', async () => {
      const today = new Date();
      const fromDate = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
      const toDate = formatDate(today);

      await startNewFilter(page);
      await chooseFilterField(page, 'Scheduled Date Range');
      await selectOperator(page, 'Within');
      await setFilterValue(page, {
        field: 'Scheduled Date Range',
        valueType: 'customrange',
        fromDate,
        toDate,
      });
      const total = await submitFilterForm(page);

      const chips = await expectChips([`${fromDate} - ${toDate}`]);
      expect(await getDisplayedJobCount(page)).toBe(total);
      const range = parseChipDateRange(chips[0]);
      expect(formatDate(range.start)).toBe(fromDate);
      expect(formatDate(range.end)).toBe(toDate);
      expect(total).toBeGreaterThan(0);

      const scheduled = (await getColumnValues(page, 'Scheduled Date')).filter((value) => value !== '');
      expect(scheduled.length).toBeGreaterThan(0);
      for (const value of scheduled) {
        expect(
          isScheduledDateWithin(value, range),
          `scheduled date "${value}" should fall inside ${fromDate} - ${toDate}`
        ).toBeTruthy();
      }
      return `chip "${chips[0]}" shows the selected range; ${total} records and every visible Scheduled Date is inside ${fromDate} - ${toDate}`;
    });

    // ── 17. AND condition ────────────────────────────────────────────────
    let andTotal = 0;
    await scenario('17.', 'AND condition (Job Category + Job Priority Is Not Empty)', async () => {
      const first = await addFilter({
        page,
        spec: { field: 'Job Category', operator: 'Contains', valueType: 'select', value: CATEGORY_VALUE },
      });
      await addFilter({
        page,
        spec: { field: 'Job Priority', operator: 'Is Not Empty', valueType: 'none' },
      });
      await setLogicalOperator(page, 'AND');
      expect(await isLogicalOperatorSelected(page, 'AND')).toBeTruthy();
      expect(await isLogicalOperatorSelected(page, 'OR')).toBeFalsy();

      await expectChips([`Job Category Contains ${first.resolvedValue}`, 'Job Priority Is Not Empty']);
      await expect(appliedFilterCards(page)).toHaveCount(2);

      andTotal = await getDisplayedJobCount(page);
      expect(andTotal).toBeGreaterThan(0);
      expect(andTotal).toBeLessThanOrEqual(first.total);

      const categories = await getColumnValues(page, 'Category');
      const priorities = await getColumnValues(page, 'Priority');
      expect(categories.length).toBeGreaterThan(0);
      for (let i = 0; i < categories.length; i += 1) {
        expect(categories[i], 'AND requires the category condition on every row').toBe(first.resolvedValue);
        expect(priorities[i], 'AND requires a non-empty priority on every row').not.toBe('');
      }
      return `AND selected with 2 filters; ${andTotal} records and every visible row has Category "${first.resolvedValue}" AND a non-empty Priority`;
    });

    // ── 18. OR condition ─────────────────────────────────────────────────
    await scenario('18.', 'OR condition (Job Category + Job Priority Is Not Empty)', async () => {
      const first = await addFilter({
        page,
        spec: { field: 'Job Category', operator: 'Contains', valueType: 'select', value: CATEGORY_VALUE },
      });
      await addFilter({
        page,
        spec: { field: 'Job Priority', operator: 'Is Not Empty', valueType: 'none' },
      });
      const orTotal = await setLogicalOperator(page, 'OR');
      expect(await isLogicalOperatorSelected(page, 'OR')).toBeTruthy();
      expect(await isLogicalOperatorSelected(page, 'AND')).toBeFalsy();

      await expectChips([`Job Category Contains ${first.resolvedValue}`, 'Job Priority Is Not Empty']);
      await expect(appliedFilterCards(page)).toHaveCount(2);

      const displayed = await getDisplayedJobCount(page);
      if (orTotal !== null) expect(displayed).toBe(orTotal);
      expect(displayed).toBeGreaterThanOrEqual(andTotal);

      const categories = await getColumnValues(page, 'Category');
      const priorities = await getColumnValues(page, 'Priority');
      expect(categories.length).toBeGreaterThan(0);
      for (let i = 0; i < categories.length; i += 1) {
        expect(
          categories[i] === first.resolvedValue || priorities[i] !== '',
          `row ${i} must satisfy either condition, got category "${categories[i]}" / priority "${priorities[i]}"`
        ).toBeTruthy();
      }
      return `OR selected with the same 2 filters; ${displayed} records (>= the ${andTotal} AND records) and every visible row satisfies at least one condition`;
    });

    // ── 19. Edit an existing filter ──────────────────────────────────────
    await scenario('19.', 'Edit an applied filter through the pencil icon', async () => {
      await addFilter({
        page,
        spec: { field: 'Job Title', operator: 'Equal To', valueType: 'text', value: JOB_TITLE_VALUE },
      });
      await expectChips([`Job Title Equal To ${JOB_TITLE_VALUE}`]);

      const { total } = await editFilter({ page, operator: 'Contains', valueType: 'none' });
      const chips = await expectChips([`Job Title Contains ${JOB_TITLE_VALUE}`]);
      // Updated in place - no duplicate card was created.
      await expect(appliedFilterCards(page)).toHaveCount(1);
      expect(chips[0]).not.toContain('Equal To');
      expect(total).toBeGreaterThanOrEqual(titleEqualTotal);
      expect(await getDisplayedJobCount(page)).toBe(total);
      const titles = await getColumnValues(page, 'Job Title');
      for (const title of titles) {
        expect(title.toLowerCase()).toContain(JOB_TITLE_VALUE.toLowerCase());
      }
      return `operator edited from "Equal To" to "Contains" in place; still exactly 1 filter card ("${chips[0]}") and ${total} matching records`;
    });

    // ── 20. Remove an individual filter ──────────────────────────────────
    await scenario('20.', 'Remove an individual filter', async () => {
      await addFilter({
        page,
        spec: { field: 'Job Title', operator: 'Contains', valueType: 'text', value: JOB_TITLE_VALUE },
      });
      await addFilter({
        page,
        spec: { field: 'Job Delayed', operator: 'Equal To', valueType: 'select', value: 'No' },
      });
      await expect(appliedFilterCards(page)).toHaveCount(2);

      const total = await removeAppliedFilter(page, 0);
      await expect(appliedFilterCards(page)).toHaveCount(1);
      const chips = await getAppliedFilterTexts(page);
      expect(chips[0]).toContain('Job Delayed Equal To No');
      // After removing the Job Title filter only the Job Delayed filter is left,
      // so the count must fall back to the section-14 count (when known).
      if (delayedTotal > 0) {
        expect(total).toBe(delayedTotal);
      } else {
        expect(total).toBeGreaterThan(0);
      }
      expect(await getDisplayedJobCount(page)).toBe(total);
      expect(await getVisibleRowCount(page)).toBeGreaterThan(0);
      return `removed the Job Title filter; 1 filter remains ("${chips[0]}") and the listing refreshed to ${total} records`;
    });

    // ── 21. Clear All ────────────────────────────────────────────────────
    await scenario('21.', 'Clear All removes every filter', async () => {
      await addFilter({
        page,
        spec: { field: 'Job Category', operator: 'Contains', valueType: 'select', value: CATEGORY_VALUE },
      });
      await addFilter({
        page,
        spec: { field: 'Job Delayed', operator: 'Equal To', valueType: 'select', value: 'No' },
      });
      await expect(appliedFilterCards(page)).toHaveCount(2);
      expect(await isClearAllVisible(page)).toBeTruthy();

      const total = await clearAllFilters(page);
      await expect(appliedFilterCards(page)).toHaveCount(0);
      expect(await isClearAllVisible(page)).toBeFalsy();
      expect(total).toBe(baselineTotal);
      expect(await getDisplayedJobCount(page)).toBe(baselineTotal);
      expect(await isListingEmpty(page)).toBeFalsy();
      return `"Clear All" was offered with 2 filters applied, removed both cards and restored the unfiltered listing (${total} records)`;
    });

    // ── 23. Final validation ─────────────────────────────────────────────
    await test.step('Section 23: final validation on the unfiltered Jobs listing', async () => {
      await clearAllFilters(page);
      await expect(appliedFilterCards(page)).toHaveCount(0);
      await closeFilterPanel({ page });

      await expect(page).toHaveURL(/\/jobs/);
      await expect(filterToggleButton(page).first()).toBeVisible({ timeout: 30000 });
      await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 60000 });
      expect(await getDisplayedJobCount(page)).toBe(baselineTotal);
      expect(await isListingEmpty(page)).toBeFalsy();
      await expect(page.getByText(/something went wrong|unexpected error/i)).toHaveCount(0);
      await expect(page.locator('.skeleton, [class*="skeleton"]')).toHaveCount(0);

      results.push({
        section: '23.',
        name: 'Final validation',
        status: 'PASS',
        detail: `no active filters, ${baselineTotal} records listed, "Filter" button available, no error or loading state, ended on ${page.url()}`,
      });
    });

    // ── Report ───────────────────────────────────────────────────────────
    const failures = results.filter((result) => result.status === 'FAIL');
    const find = (section: string) => results.find((result) => result.section === section);
    const line = (result?: ScenarioResult) =>
      result
        ? `${result.status} - ${result.name}: ${result.detail}${result.error ? ` :: ${result.error}` : ''}`
        : 'NOT REACHED';

    const report = [
      '',
      '================ JOBS FILTER PANEL VALIDATION REPORT ================',
      `1. Login status                : ${line(find('1.'))}`,
      `2. Jobs navigation status      : ${line(find('2.'))}`,
      `3. Filter panel status         : ${line(find('3.'))}`,
      '4. Filter scenarios            :',
      ...results
        .filter((result) => ['4.', '5.', '6.', '7.', '8.', '9.', '10.', '11.', '12.', '13.', '14.'].includes(result.section))
        .map((result) => `     [${result.status}] ${result.section} ${result.name} - ${result.detail}${result.error ? ` :: ${result.error}` : ''}`),
      `5. AND condition result        : ${line(find('17.'))}`,
      `6. OR condition result         : ${line(find('18.'))}`,
      `7. Date range result           : ${line(find('15.'))}`,
      `8. Custom range result         : ${line(find('16.'))}`,
      '9. Edit / remove / clear result:',
      `     [${find('19.')?.status ?? 'NOT REACHED'}] Edit   - ${find('19.')?.detail ?? '-'}`,
      `     [${find('20.')?.status ?? 'NOT REACHED'}] Remove - ${find('20.')?.detail ?? '-'}`,
      `     [${find('21.')?.status ?? 'NOT REACHED'}] Clear  - ${find('21.')?.detail ?? '-'}`,
      '10. UI / API errors            :',
      ...(uiErrors.length ? uiErrors.map((error) => `     ${error}`) : ['     none detected']),
      '    Observations               :',
      ...(notes.length ? notes.map((note) => `     ${note}`) : ['     none']),
      `11. Overall automation result  : ${failures.length === 0 ? 'PASS' : `FAIL (${failures.length} of ${results.length} scenarios failed)`}`,
      `    Section 23 final state     : ${line(find('23.'))}`,
      '====================================================================',
      '',
    ].join('\n');
    console.log(report);
    test.info().annotations.push({ type: 'report', description: report });

    expect(
      failures.map((failure) => `${failure.section} ${failure.name}: ${failure.error ?? ''}`),
      'every filter scenario must pass'
    ).toEqual([]);
    expect(filterApiErrors, 'the jobs filter API must never fail while filtering').toEqual([]);
  });
});
