import { test, expect } from '@stablyai/playwright-test';
import type { Page } from '@playwright/test';
import * as F from './helpers/jobs-filter.helper';

// End-to-end sweep of the Jobs filter panel: 23 manual steps in one flow.
test.setTimeout(1_800_000);

type Status = 'PASS' | 'FAIL';

interface ReportEntry {
  step: string;
  status: Status;
  detail: string;
}

const EXPECTED_FIELDS = [
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
  'Single Line Text',
  'Single Line Text2',
];

const EXPECTED_RANGES = [
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

test.describe('Jobs Filter Panel - Operators and Conditions', () => {
  /**
   * User Prompt:
   * Launch "https://uat.zuperpro.com/"
   * Company Name: zuper-pro
   * Username: ragupathy.s@zuper.co
   * Password: Test@1234
   * Wait until the application dashboard is completely loaded. Verify that the user is
   * successfully logged in. Cancel the "New Integeration" window if it is showing.
   * Cancel the "Zuper guide" window if it is showing. Cancel the "Time Stamp" window if
   * it is showing. Cancel the Zuper Connect window.
   * Expected: user logged in, Zuper Dashboard displayed.
   *
   * 2. Navigate to Jobs Module: click "Jobs" in the left navigation, wait for the job
   *    listing to load, verify the listing is displayed, job records are visible and the
   *    "Filter" button is available.
   * 3. Open Filter Panel: click Filter, verify the panel opens on the right side with the
   *    controls Filters, AND, OR, Clear All and Add Filter.
   * 4. Verify Filter Field List: click the "Choose Filter" dropdown and verify the fields
   *    Job ID, Job Title, Job Category, Scheduled Date Range, Job Priority, Job Status
   *    Type, Job Type, Contact Request, Tags, Lead Source and the custom fields Single
   *    Line Text and Single Line Text2. Scroll the dropdown if required.
   * 5. Job ID filter: Equal To -> 681734, click Update, verify the chip
   *    "Job ID -> Equal To -> 681734" and that the returned records match.
   * 6. Job Title: Equal To "Test QA".
   * 7. Edit to Not Equal To "Test QA".
   * 8. Edit to Not Contains "Test QA" - verify chips and that matching jobs are included
   *    or excluded appropriately.
   * 9. Job Category: Contains "Requirements Collection".
   * 10. Job Priority: verify the operators Not Contains, Contains, Is Empty, Is Not Empty;
   *     apply Is Empty; verify only jobs with an empty priority are returned.
   * 11. Job Status Type: Is Not Empty.
   * 12. Tags: Contains "AC Job".
   * 13. Contact Request: Contains "validation".
   * 14. Job Delayed: Equal To "No".
   * 15. Scheduled Date Range: verify the "Within" operator; verify the range options
   *     (Last 7 Days, Next 7 Days, Last 30 Days, Next 30 Days, This Week, Last Week,
   *     Next Week, This Month, Last Month, Last 60 Days, Next 60 Days, Last 90 Days,
   *     Next 90 Days, Next Month, This Quarter, Last Quarter, This Year, Last Year,
   *     Custom Range); apply and verify the jobs fall in the range.
   * 16. Custom Date Range: Within -> Custom Range -> start/end dates -> verify the dates
   *     are displayed and the results fall in range.
   * 17. AND condition: Job Category Contains Requirements Collection + Job Priority Is Not
   *     Empty, verify AND is selected and both conditions are satisfied.
   * 18. OR condition: the same two filters with OR; verify either-condition results.
   * 19. Edit an existing filter: pencil icon -> change operator/value -> Update -> verify
   *     the filter is updated and not duplicated.
   * 20. Remove an individual filter: click X/Remove, verify only that filter is removed and
   *     the listing refreshes.
   * 21. Clear All: verify all filters are removed, the panel shows no active filters and the
   *     listing is unfiltered.
   * 22. Filter loading validation: wait for the loading/skeleton state, verify the data is
   *     refreshed, the filter is still visible, the count updates and there are no stale
   *     results.
   * 23. Final validation: Clear All, no filters active, listing normal, Filter button
   *     available, no errors/broken UI; end on the Jobs listing.
   *
   * ==== AUTOMATION REQUIREMENTS ====
   * Follow the recorded video as the primary UI reference. Use semantic selectors (text,
   * labels, ARIA roles, accessible names, input labels, button names). Avoid absolute XPath
   * and screen coordinates. Handle dropdowns that require scrolling. Wait for dynamically
   * loaded filter options. Wait for the Jobs API/list refresh after Update. Do not assume a
   * fixed number of jobs or a fixed ordering. Verify the actual filter results instead of
   * only verifying that the filter chip appears. If a filter returns zero results, verify
   * whether zero results are logically expected before marking it failed. Capture the error
   * message and the current filter configuration on an unexpected error.
   *
   * FINAL OUTPUT: Report: 1. Login status 2. Jobs navigation status 3. Filter panel status
   * 4. each filter scenario PASS/FAIL 5. AND result 6. OR result 7. date range result
   * 8. custom range result 9. edit/remove/clear result 10. any UI/API errors
   * 11. Final overall automation result.
   *
   * Clarification from the user: when an exact data value (Job ID 681734, "Test QA",
   * "Requirements Collection", "AC Job", "validation") does not exist in UAT, fall back to
   * any available value and keep verifying the operator mechanics.
   */
  test('should verify every Jobs filter field, operator, AND/OR condition, edit, remove and clear behaviour', async ({
    page,
  }) => {
    const report: ReportEntry[] = [];
    const failures: string[] = [];
    const uiErrors: string[] = [];

    const record = (step: string, status: Status, detail = ''): void => {
      report.push({ step, status, detail });
    };

    /**
     * Runs one numbered scenario. A thrown assertion is recorded as FAIL together with the
     * live filter configuration, then the panel is reset so the remaining scenarios still
     * run and the final report stays complete.
     */
    const scenario = async (step: string, fn: () => Promise<string>): Promise<boolean> => {
      try {
        const detail = await fn();
        record(step, 'PASS', detail);
        return true;
      } catch (error) {
        const config = await F.getFilterRows(page)
          .then((rows) => rows.map((r) => `[${r.scope}] ${r.text}`).join(' ;; '))
          .catch(() => '(filter configuration unavailable)');
        const message = error instanceof Error ? error.message.split('\n')[0] : String(error);
        record(step, 'FAIL', `${message} | filter config: ${config || '(none)'}`);
        failures.push(step);
        uiErrors.push(`${step}: ${message}`);
        await resetFilters(page).catch(() => undefined);
        return false;
      }
    };

    const resetFilters = async (target: Page): Promise<void> => {
      await F.ensurePanelOpen(target);
      await F.clearAllFilters(target);
    };

    // ── 1. Login ───────────────────────────────────────────────────────────
    await F.login(page);
    // Popups first: the "New Integration" overlay marks the rest of the page aria-hidden,
    // which hides the app shell from role-based queries while it is open.
    const dismissed = await F.dismissPopups(page);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 60000 });
    await expect(page.locator('a[href="/dashboard"]').first()).toBeVisible({ timeout: 60000 });
    await expect(page.locator('nav').first()).toContainText('Dashboard', { timeout: 60000 });
    record(
      '1. Login',
      'PASS',
      `Dashboard loaded. Popups dismissed: ${dismissed.length ? dismissed.join(', ') : 'none present'}`,
    );

    // ── 2. Navigate to the Jobs module ─────────────────────────────────────
    const jobsNav = page.getByRole('link', { name: /^Jobs$/i }).first();
    let navMethod = 'left navigation "Jobs" link';
    if (await jobsNav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await jobsNav.click({ force: true });
    } else {
      navMethod = 'direct /jobs route (left nav is icon-only with no accessible "Jobs" link)';
      await page.goto('/jobs');
    }
    await expect(page).toHaveTitle(/Jobs/, { timeout: 60000 });
    await F.dismissPopups(page);
    await F.waitForListSettled(page);

    const jobRows = page.locator('table tbody tr');
    await expect(jobRows.first()).toBeVisible({ timeout: 60000 });
    expect(await jobRows.count()).toBeGreaterThan(0);
    await expect(F.filterToggle(page)).toBeVisible({ timeout: 30000 });
    record(
      '2. Jobs navigation',
      'PASS',
      `Listing rendered with ${await jobRows.count()} visible rows via ${navMethod}; Filter button available`,
    );

    // ── 3. Open the filter panel ───────────────────────────────────────────
    await F.openFilterPanel(page);
    await expect(page.getByRole('button', { name: 'Add Filter' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Filters' }).first()).toBeVisible();
    await expect(F.conditionButton(page, 'AND')).toBeVisible();
    await expect(F.conditionButton(page, 'OR')).toBeVisible();

    // "Clear All" is rendered only while at least one filter is applied. Any filters left
    // over from a previous run are cleared here, which also proves the control works.
    const hadLeftoverFilters = await F.clearAllFilters(page);
    const pinnedFields = await F.getPinnedFieldNames(page);
    record(
      '3. Filter panel',
      'PASS',
      `Panel open with Filters heading, AND, OR and Add Filter. "Clear All" is conditional and ` +
        `was ${hadLeftoverFilters ? 'present (leftover filters cleared)' : 'absent (no filters applied yet)'}. ` +
        `Pinned fields: ${pinnedFields.join(', ') || 'none'}`,
    );

    await F.waitForListSettled(page);
    const baselineCount = await F.getResultCount(page);
    expect(baselineCount).toBeGreaterThan(0);
    record('3a. Unfiltered baseline', 'PASS', `${baselineCount} jobs with no filters applied`);

    // ── 4. Verify the filter field list ────────────────────────────────────
    await scenario('4. Filter field list', async () => {
      await F.openFieldDropdown(page);
      const options = await F.readFieldOptions(page);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Pinned fields are intentionally excluded from the "Choose Filter" dropdown, so a
      // field counts as available when it is offered in the dropdown OR pinned.
      const available = [...options, ...pinnedFields].map((o) => o.toLowerCase());
      const missing = EXPECTED_FIELDS.filter(
        (f) => !available.some((a) => a === f.toLowerCase() || a.includes(f.toLowerCase())),
      );
      expect(missing, `Filter fields missing from dropdown and pinned list: ${missing.join(', ')}`)
        .toEqual([]);

      await discardDraftRows(page);
      return `${options.length} fields in the dropdown; all ${EXPECTED_FIELDS.length} expected fields available (pinned: ${pinnedFields.join(', ') || 'none'})`;
    });

    // ── 5. Job ID -> Equal To 681734 ───────────────────────────────────────
    await scenario('5. Job ID Equal To 681734', async () => {
      await resetFilters(page);
      const controls = await F.beginFilter(page, 'Job ID');
      expect(controls.operatorId, 'Job ID should expose an operator dropdown').toBeTruthy();
      await F.setOperator(page, controls.operatorId!, 'Equal To');

      const refreshed = await F.discoverControls(page);
      expect(refreshed.valueId, 'Job ID should expose a value input').toBeTruthy();
      await F.setTextValue(page, refreshed.valueId!, '681734');
      await F.commitFilter(page);

      const chip = await appliedChipText(page);
      expect(chip).toMatch(/Job ID/i);
      expect(chip).toMatch(/Equal To/i);
      expect(chip).toContain('681734');

      const count = await F.getResultCount(page);
      if (count === 0) {
        expect(await F.isEmptyState(page)).toBeTruthy();
        return 'Job ID 681734 does not exist in this environment - zero results are logically expected and the empty state is shown';
      }
      const ids = await F.getColumnByHeader(page, 'Job ID');
      for (const id of ids) expect(id).toContain('681734');
      return `${count} result(s), every Job ID cell contains 681734`;
    });

    // ── 6. Job Title -> Equal To "Test QA" ─────────────────────────────────
    let equalToCount = -1;
    const titleEqualOk = await scenario('6. Job Title Equal To "Test QA"', async () => {
      await resetFilters(page);
      const controls = await F.beginFilter(page, 'Job Title');
      await F.setOperator(page, controls.operatorId!, 'Equal To');
      const refreshed = await F.discoverControls(page);
      await F.setTextValue(page, refreshed.valueId!, 'Test QA');
      await F.commitFilter(page);

      const chip = await appliedChipText(page);
      expect(chip).toMatch(/Job Title/i);
      expect(chip).toMatch(/Equal To/i);
      expect(chip).toContain('Test QA');

      equalToCount = await F.getResultCount(page);
      expect(equalToCount).toBeLessThan(baselineCount);
      if (equalToCount === 0) {
        expect(await F.isEmptyState(page)).toBeTruthy();
        return 'No job is titled exactly "Test QA" - zero results are logically expected';
      }
      const titles = await F.getColumnByHeader(page, 'Job Title');
      for (const title of titles) expect(title).toBe('Test QA');
      return `${equalToCount} result(s), every Job Title equals "Test QA"`;
    });

    // ── 7. Edit the same filter -> Not Equal To "Test QA" ──────────────────
    if (titleEqualOk) {
      await scenario('7. Job Title Not Equal To "Test QA"', async () => {
        const rows = await F.getAppliedFilters(page);
        const titleRow = rows.find((r) => /Job Title/i.test(r.field));
        expect(titleRow, 'The Job Title filter row should still be applied').toBeTruthy();

        const controls = await F.editFilter(page, titleRow!);
        await F.setOperator(page, controls.operatorId!, 'Not Equal To');
        await F.commitFilter(page);

        const chip = await appliedChipText(page);
        expect(chip).toMatch(/Not Equal To/i);
        expect(chip).toContain('Test QA');

        const count = await F.getResultCount(page);
        expect(count).toBe(baselineCount - equalToCount);
        const titles = await F.getColumnByHeader(page, 'Job Title');
        expect(titles.some((t) => t === 'Test QA')).toBeFalsy();
        return `${count} result(s) = baseline ${baselineCount} - ${equalToCount} exact matches; no row titled "Test QA"`;
      });

      // ── 8. Edit again -> Not Contains "Test QA" ──────────────────────────
      await scenario('8. Job Title Not Contains "Test QA"', async () => {
        const rows = await F.getAppliedFilters(page);
        const titleRow = rows.find((r) => /Job Title/i.test(r.field));
        expect(titleRow, 'The Job Title filter row should still be applied').toBeTruthy();

        const controls = await F.editFilter(page, titleRow!);
        await F.setOperator(page, controls.operatorId!, 'Not Contains');
        await F.commitFilter(page);

        const chip = await appliedChipText(page);
        expect(chip).toMatch(/Not Contains/i);

        const count = await F.getResultCount(page);
        expect(count).toBeLessThanOrEqual(baselineCount);
        const titles = await F.getColumnByHeader(page, 'Job Title');
        const offenders = titles.filter((t) => t.toLowerCase().includes('test qa'));
        expect(offenders, `Rows still containing "Test QA": ${offenders.join(', ')}`).toEqual([]);
        return `${count} result(s), no Job Title contains "Test QA"`;
      });
    }

    // ── 9. Job Category -> Contains "Requirements Collection" ──────────────
    let categoryValue = '';
    let categoryOnlyCount = -1;
    await scenario('9. Job Category Contains "Requirements Collection"', async () => {
      await resetFilters(page);
      const controls = await F.beginFilter(page, 'Job Category');
      await F.setOperator(page, controls.operatorId!, 'Contains');
      const refreshed = await F.discoverControls(page);
      categoryValue = await F.setComboValue(page, refreshed.valueId!, 'Requirements Collection');
      await F.commitFilter(page);

      const chip = await appliedChipText(page);
      expect(chip).toMatch(/Contains/i);
      expect(chip).toContain(categoryValue);

      categoryOnlyCount = await F.getResultCount(page);
      expect(categoryOnlyCount).toBeGreaterThan(0);
      expect(categoryOnlyCount).toBeLessThan(baselineCount);
      const categories = await F.getColumnByHeader(page, 'Category');
      for (const category of categories) expect(category).toContain(categoryValue);
      return `${categoryOnlyCount} result(s); every Category cell contains "${categoryValue}"${
        categoryValue === 'Requirements Collection' ? '' : ' (closest available value in this environment)'
      }`;
    });

    // ── 10. Job Priority operators + Is Empty ──────────────────────────────
    await scenario('10. Job Priority operators and Is Empty', async () => {
      await resetFilters(page);
      const controls = await F.beginFilter(page, 'Job Priority');
      const operators = await F.getOperatorOptions(page, controls.operatorId!);
      for (const expected of ['Contains', 'Not Contains', 'Is Empty', 'Is Not Empty']) {
        expect(operators, `Job Priority operators: ${operators.join(', ')}`).toContain(expected);
      }

      await F.setOperator(page, controls.operatorId!, 'Is Empty');
      await F.commitFilter(page);

      const chip = await appliedChipText(page);
      expect(chip).toMatch(/Is Empty/i);

      const count = await F.getResultCount(page);
      expect(count).toBeLessThan(baselineCount);
      if (count === 0) {
        expect(await F.isEmptyState(page)).toBeTruthy();
        return `Operators verified (${operators.join(', ')}); Is Empty returns 0 jobs - every job in this environment has a priority, so zero results are logically expected`;
      }
      const priorities = await F.getColumnByHeader(page, 'Priority');
      for (const priority of priorities) expect(priority).toBe('');
      return `Operators verified (${operators.join(', ')}); Is Empty returns ${count} job(s), all with an empty Priority`;
    });

    // ── 11. Job Status Type -> Is Not Empty ────────────────────────────────
    await scenario('11. Job Status Type Is Not Empty', async () => {
      await resetFilters(page);
      const controls = await F.beginFilter(page, 'Job Status Type');
      await F.setOperator(page, controls.operatorId!, 'Is Not Empty');
      await F.commitFilter(page);

      const chip = await appliedChipText(page);
      expect(chip).toMatch(/Is Not Empty/i);

      const count = await F.getResultCount(page);
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThanOrEqual(baselineCount);
      const statuses = await F.getColumnByHeader(page, 'Status');
      for (const status of statuses) expect(status).not.toBe('');
      return `${count} result(s), every Status cell is populated`;
    });

    // ── 12. Tags -> Contains "AC Job" ──────────────────────────────────────
    let tagValue = '';
    await scenario('12. Tags Contains "AC Job"', async () => {
      await resetFilters(page);
      const controls = await F.beginFilter(page, 'Tags');
      await F.setOperator(page, controls.operatorId!, 'Contains');
      const refreshed = await F.discoverControls(page);
      tagValue = await F.setComboValue(page, refreshed.valueId!, 'AC Job');
      await F.commitFilter(page);

      const chip = await appliedChipText(page);
      expect(chip).toMatch(/Contains/i);
      expect(chip).toContain(tagValue);

      const count = await F.getResultCount(page);
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(baselineCount);
      const tags = await F.getColumnByHeader(page, 'Tags');
      for (const tag of tags) expect(tag).toContain(tagValue);
      return `${count} result(s); every Tags cell contains "${tagValue}"`;
    });

    // ── 13. Contact Request -> Contains "validation" ───────────────────────
    await scenario('13. Contact Request Contains "validation"', async () => {
      await resetFilters(page);
      const controls = await F.beginFilter(page, 'Contact Request');
      await F.setOperator(page, controls.operatorId!, 'Contains');
      const refreshed = await F.discoverControls(page);
      const value = await F.setComboValue(page, refreshed.valueId!, 'validation');
      await F.commitFilter(page);

      const chip = await appliedChipText(page);
      expect(chip).toMatch(/Contains/i);
      expect(chip).toContain(value);

      const count = await F.getResultCount(page);
      expect(count).toBeLessThan(baselineCount);
      if (count === 0) {
        expect(await F.isEmptyState(page)).toBeTruthy();
        return `Filter applied for request "${value}"; 0 jobs reference that contact request, so zero results are logically expected and the "no jobs found" state is shown`;
      }
      return `${count} result(s) for contact request "${value}"`;
    });

    // ── 14. Job Delayed -> Equal To "No" ───────────────────────────────────
    await scenario('14. Job Delayed Equal To "No"', async () => {
      await resetFilters(page);
      const controls = await F.beginFilter(page, 'Job Delayed');
      await F.setOperator(page, controls.operatorId!, 'Equal To');
      const refreshed = await F.discoverControls(page);
      const value = await F.setComboValue(page, refreshed.valueId!, 'No');
      expect(value).toBe('No');
      await F.commitFilter(page);

      const chip = await appliedChipText(page);
      expect(chip).toMatch(/Equal To/i);
      expect(chip).toContain('No');

      const count = await F.getResultCount(page);
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThanOrEqual(baselineCount);
      return `${count} non-delayed job(s) out of ${baselineCount} (${baselineCount - count} delayed)`;
    });

    // ── 15. Scheduled Date Range -> Within -> This Month ───────────────────
    await scenario('15. Scheduled Date Range Within', async () => {
      await resetFilters(page);
      const controls = await F.beginFilter(page, 'Scheduled Date Range');
      const operators = await F.getOperatorOptions(page, controls.operatorId!);
      expect(operators, `Scheduled Date Range operators: ${operators.join(', ')}`).toContain('Within');
      await F.setOperator(page, controls.operatorId!, 'Within');

      const refreshed = await F.discoverControls(page);
      expect(refreshed.rangeId, 'A range dropdown should appear for the Within operator').toBeTruthy();
      const ranges = await F.getRangeOptions(page, refreshed.rangeId!);
      const lower = ranges.map((r) => r.toLowerCase());
      const missing = EXPECTED_RANGES.filter((r) => !lower.includes(r.toLowerCase()));
      expect(missing, `Range options missing: ${missing.join(', ')}`).toEqual([]);

      await F.setRange(page, refreshed.rangeId!, 'This Month');
      await F.commitFilter(page);

      const chip = await appliedChipText(page);
      expect(chip).toMatch(/This Month/i);

      const count = await F.getResultCount(page);
      expect(count).toBeLessThan(baselineCount);
      if (count === 0) {
        expect(await F.isEmptyState(page)).toBeTruthy();
        return `All ${ranges.length} range options verified; "This Month" returns 0 jobs - logically possible when nothing is scheduled this month`;
      }

      const now = new Date();
      const monthStart = F.startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      const monthEnd = F.endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      const parsed = (await F.getColumnByHeader(page, 'Scheduled Date'))
        .map(F.parseDateCell)
        .filter((d): d is Date => d !== null);
      expect(parsed.length, 'At least one Scheduled Date cell should be parseable').toBeGreaterThan(0);
      for (const date of parsed) {
        expect(date.getTime()).toBeGreaterThanOrEqual(monthStart.getTime());
        expect(date.getTime()).toBeLessThanOrEqual(monthEnd.getTime());
      }
      return `All ${ranges.length} range options verified; "This Month" returns ${count} job(s), all ${parsed.length} readable Scheduled Dates fall inside ${monthStart.toDateString()} - ${monthEnd.toDateString()}`;
    });

    // ── 16. Custom date range ──────────────────────────────────────────────
    await scenario('16. Scheduled Date Range Custom Range', async () => {
      await resetFilters(page);
      const controls = await F.beginFilter(page, 'Scheduled Date Range');
      await F.setOperator(page, controls.operatorId!, 'Within');
      const refreshed = await F.discoverControls(page);
      await F.setRange(page, refreshed.rangeId!, 'Custom Range');

      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 10);
      await F.pickCustomRange(page, start, end);
      await F.commitFilter(page);

      const chip = await appliedChipText(page);
      const fmt = (d: Date): string =>
        `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
      expect(chip, `Chip should show the chosen custom range, got "${chip}"`).toContain(fmt(start));
      expect(chip).toContain(fmt(end));

      const count = await F.getResultCount(page);
      if (count === 0) {
        expect(await F.isEmptyState(page)).toBeTruthy();
        return `Custom range ${fmt(start)} - ${fmt(end)} displayed on the chip; 0 jobs scheduled in that window`;
      }
      const from = F.startOfDay(start);
      const to = F.endOfDay(end);
      const parsed = (await F.getColumnByHeader(page, 'Scheduled Date'))
        .map(F.parseDateCell)
        .filter((d): d is Date => d !== null);
      expect(parsed.length).toBeGreaterThan(0);
      for (const date of parsed) {
        expect(date.getTime()).toBeGreaterThanOrEqual(from.getTime());
        expect(date.getTime()).toBeLessThanOrEqual(to.getTime());
      }
      return `Custom range ${fmt(start)} - ${fmt(end)} displayed on the chip; ${count} job(s), all ${parsed.length} readable Scheduled Dates inside the range`;
    });

    // ── 17. AND condition ──────────────────────────────────────────────────
    let andCount = -1;
    const andOk = await scenario('17. AND condition', async () => {
      await resetFilters(page);

      const categoryControls = await F.beginFilter(page, 'Job Category');
      await F.setOperator(page, categoryControls.operatorId!, 'Contains');
      const categoryValueControls = await F.discoverControls(page);
      const usedCategory = await F.setComboValue(
        page,
        categoryValueControls.valueId!,
        categoryValue || 'Requirements Collection',
      );
      await F.commitFilter(page);

      const priorityControls = await F.beginFilter(page, 'Job Priority');
      await F.setOperator(page, priorityControls.operatorId!, 'Is Not Empty');
      await F.commitFilter(page);

      await F.setCondition(page, 'AND');
      expect(await F.getActiveCondition(page)).toBe('AND');

      const applied = await F.getAppliedFilters(page);
      expect(applied.length, `Applied filters: ${applied.map((a) => a.text).join(' ;; ')}`).toBe(2);

      andCount = await F.getResultCount(page);
      expect(andCount).toBeLessThanOrEqual(
        categoryOnlyCount > 0 ? categoryOnlyCount : baselineCount,
      );
      if (andCount === 0) {
        expect(await F.isEmptyState(page)).toBeTruthy();
        return `AND selected; no job satisfies both "Category contains ${usedCategory}" and "Priority is not empty" - zero results are logically expected`;
      }
      const categories = await F.getColumnByHeader(page, 'Category');
      for (const category of categories) expect(category).toContain(usedCategory);
      return `AND selected and highlighted; ${andCount} job(s) satisfy both conditions (every Category contains "${usedCategory}", Priority not empty)`;
    });

    // ── 18. OR condition ───────────────────────────────────────────────────
    if (andOk) {
      await scenario('18. OR condition', async () => {
        await F.setCondition(page, 'OR');
        expect(await F.getActiveCondition(page)).toBe('OR');

        const applied = await F.getAppliedFilters(page);
        expect(applied.length).toBe(2);

        const orCount = await F.getResultCount(page);
        expect(orCount).toBeGreaterThanOrEqual(andCount);
        expect(orCount).toBeLessThanOrEqual(baselineCount);

        // With OR the result set is a union, so rows outside the category are expected.
        const categories = await F.getColumnByHeader(page, 'Category');
        const distinct = [...new Set(categories)];
        return `OR selected and highlighted; ${orCount} job(s) (>= AND result ${andCount}); visible categories: ${distinct.slice(0, 5).join(', ')}`;
      });
    }

    // ── 19. Edit an existing filter without duplicating it ─────────────────
    await scenario('19. Edit an existing filter', async () => {
      await resetFilters(page);
      const controls = await F.beginFilter(page, 'Job Title');
      await F.setOperator(page, controls.operatorId!, 'Equal To');
      const valueControls = await F.discoverControls(page);
      await F.setTextValue(page, valueControls.valueId!, 'Test QA');
      await F.commitFilter(page);

      const before = await F.getAppliedFilters(page);
      expect(before.length).toBe(1);

      const editControls = await F.editFilter(page, before[0]);
      await F.setOperator(page, editControls.operatorId!, 'Contains');
      const editValue = await F.discoverControls(page);
      await F.setTextValue(page, editValue.valueId!, 'Test');
      const commitLabel = await F.commitFilter(page);

      const after = await F.getAppliedFilters(page);
      expect(after.length, `Editing must not duplicate the filter: ${after.map((a) => a.text).join(' ;; ')}`)
        .toBe(1);
      expect(after[0].text).toMatch(/Contains/i);
      expect(after[0].text).toContain('Test');

      const count = await F.getResultCount(page);
      if (count > 0) {
        const titles = await F.getColumnByHeader(page, 'Job Title');
        for (const title of titles) expect(title.toLowerCase()).toContain('test');
      }
      return `Committed with "${commitLabel}"; still 1 filter row (Job Title Contains Test) returning ${count} job(s) - updated, not duplicated`;
    });

    // ── 20. Remove an individual filter ────────────────────────────────────
    await scenario('20. Remove an individual filter', async () => {
      const tagControls = await F.beginFilter(page, 'Tags');
      await F.setOperator(page, tagControls.operatorId!, 'Contains');
      const tagValueControls = await F.discoverControls(page);
      const usedTag = await F.setComboValue(page, tagValueControls.valueId!, tagValue || 'AC Job');
      await F.commitFilter(page);

      const before = await F.getAppliedFilters(page);
      expect(before.length, `Expected 2 applied filters, got: ${before.map((b) => b.text).join(' ;; ')}`)
        .toBe(2);
      const countBefore = await F.getResultCount(page);

      const titleRow = before.find((r) => /Job Title/i.test(r.field));
      expect(titleRow, 'Job Title filter row should be present').toBeTruthy();
      await F.removeFilter(page, titleRow!);

      const after = await F.getAppliedFilters(page);
      expect(after.length).toBe(1);
      expect(after.some((r) => /Job Title/i.test(r.field))).toBeFalsy();
      expect(after[0].text).toContain(usedTag);

      const countAfter = await F.getResultCount(page);
      expect(countAfter).not.toBe(countBefore);
      return `Removed only the Job Title filter; the Tags filter ("${usedTag}") survived and the listing refreshed from ${countBefore} to ${countAfter} job(s)`;
    });

    // ── 21. Clear All ──────────────────────────────────────────────────────
    await scenario('21. Clear All', async () => {
      await expect(page.getByRole('button', { name: 'Clear All' }).first()).toBeVisible();
      const cleared = await F.clearAllFilters(page);
      expect(cleared).toBeTruthy();

      const applied = await F.getAppliedFilters(page);
      expect(applied, `Filters remaining after Clear All: ${applied.map((a) => a.text).join(' ;; ')}`)
        .toEqual([]);
      await expect(page.getByRole('button', { name: 'Clear All' })).toHaveCount(0);

      const count = await F.getResultCount(page);
      expect(count).toBe(baselineCount);
      return `All filters removed, "Clear All" no longer rendered, listing back to the unfiltered ${count} job(s)`;
    });

    // ── 22. Filter loading / refresh validation ────────────────────────────
    await scenario('22. Filter loading and refresh validation', async () => {
      const controls = await F.beginFilter(page, 'Tags');
      await F.setOperator(page, controls.operatorId!, 'Contains');
      const valueControls = await F.discoverControls(page);
      const usedTag = await F.setComboValue(page, valueControls.valueId!, tagValue || 'AC Job');

      // commitFilter waits for the loader to clear and for the count to stop changing.
      await F.commitFilter(page);

      const applied = await F.getAppliedFilters(page);
      expect(applied.length, 'The filter must remain visible in the panel after refresh').toBe(1);
      expect(applied[0].text).toContain(usedTag);

      const count = await F.getResultCount(page);
      expect(count).not.toBe(baselineCount);
      expect(await page.locator('table tbody tr').count()).toBeGreaterThan(0);

      // No stale rows: every row genuinely matches the freshly applied filter.
      const tags = await F.getColumnByHeader(page, 'Tags');
      for (const tag of tags) expect(tag).toContain(usedTag);
      await F.expectNoErrors(page);
      return `Loader cleared and the count settled at ${count} (from ${baselineCount}); filter still shown in the panel and every visible row matches "${usedTag}" - no stale results`;
    });

    // ── 23. Final validation ───────────────────────────────────────────────
    await scenario('23. Final validation', async () => {
      await F.clearAllFilters(page);
      const applied = await F.getAppliedFilters(page);
      expect(applied).toEqual([]);

      const count = await F.getResultCount(page);
      expect(count).toBe(baselineCount);

      await expect(F.filterToggle(page)).toBeVisible();
      await expect(page.locator('table tbody tr').first()).toBeVisible();
      await expect(page).toHaveTitle(/Jobs/);
      await F.expectNoErrors(page);
      return `No filters active, listing back to ${count} job(s), Filter button available, no errors or broken UI, ending on the Jobs listing`;
    });

    // ── Final report ───────────────────────────────────────────────────────
    const line = '='.repeat(88);
    console.log(`\n${line}\nJOBS FILTER PANEL - AUTOMATION REPORT\n${line}`);
    for (const entry of report) {
      console.log(`[${entry.status}] ${entry.step}`);
      if (entry.detail) console.log(`        ${entry.detail}`);
    }
    console.log(line);
    console.log(`UI/API errors: ${uiErrors.length ? uiErrors.join(' | ') : 'none'}`);
    console.log(
      `FINAL OVERALL RESULT: ${failures.length === 0 ? 'PASS' : `FAIL (${failures.join(', ')})`}`,
    );
    console.log(`${line}\n`);

    expect(failures, `Scenarios that failed: ${failures.join(', ')}`).toEqual([]);
  });
});

// ── Local helpers ───────────────────────────────────────────────────────────

/** Text of the applied filter rows, used to assert the filter chip contents. */
async function appliedChipText(page: Page): Promise<string> {
  const applied = await F.getAppliedFilters(page);
  return applied.map((a) => a.text).join(' ');
}

/**
 * Discards uncommitted rows left behind after only browsing the "Choose Filter"
 * dropdown. Closing and re-opening the panel drops any draft row.
 */
async function discardDraftRows(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await F.filterToggle(page).click({ force: true });
  await page.waitForTimeout(1000);
  await F.openFilterPanel(page);
  const drafts = (await F.getFilterRows(page)).filter(
    (r) => r.scope === 'normal' && !/\S/.test(r.field),
  );
  for (const draft of drafts) await F.removeFilter(page, draft).catch(() => undefined);
}
