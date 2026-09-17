import { expect, type Page, type Locator } from '@playwright/test';

/** Endpoint the Jobs listing calls whenever the filter set changes. */
export const JOBS_FILTER_API = '/api/jobs/filter';

/** Text shown by the listing when a filter matches zero jobs. */
export const NO_JOBS_MESSAGE = 'No jobs found for the filter applied';

export type FilterValueType =
  | 'number' // <input type=number>, exposed as role=spinbutton
  | 'text' // plain "Field Value" textbox
  | 'select' // searchable ng-select dropdown
  | 'daterange' // ng-select of date-range presets (Last 7 Days, ...)
  | 'customrange' // ng-select "Custom Range" + From/To datepickers
  | 'none'; // Is Empty / Is Not Empty need no value

export interface FilterSpec {
  /** Label shown in the "Choose Filter" dropdown, e.g. 'Job Title'. */
  field: string;
  /** Operator label, e.g. 'Equal To'. Omit to keep the field default. */
  operator?: string;
  valueType: FilterValueType;
  /** Search text / preset label. Unused for 'none' and 'customrange'. */
  value?: string;
  /** 'customrange' only, formatted MM/DD/YYYY. */
  fromDate?: string;
  /** 'customrange' only, formatted MM/DD/YYYY. */
  toDate?: string;
}

// ── Small utilities ────────────────────────────────────────────────────────

/**
 * Waits up to `timeout` for a locator to become visible and reports the result
 * instead of throwing. `Locator.isVisible()` is deliberately not used here: it
 * resolves immediately and ignores its timeout, which makes optional elements
 * that animate in (fly-out menus, dialogs) look absent.
 */
async function isVisible(locator: Locator, timeout = 1500): Promise<boolean> {
  return locator
    .first()
    .waitFor({ state: 'visible', timeout })
    .then(() => true)
    .catch(() => false);
}

/** Collapses whitespace and drops icon-font glyphs so cell text can be compared. */
export function cleanCell(text: string): string {
  return text
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Dismisses every currently visible Material dialog, top-most first: the
 * timezone ("Time Stamp") prompt via Cancel, and the "New Integration" promo /
 * Zuper Guide popups via their Close icon.
 *
 * Two quirks drive the implementation:
 *  - The modals stack, and a collapsed popup higher in the overlay container
 *    still owns an active backdrop that sits above the dialog underneath it.
 *    A real (even forced) click therefore lands on that backdrop and the dialog
 *    never closes, so the close control is triggered with `dispatchEvent` which
 *    delivers the event straight to the element regardless of what covers it.
 *  - Dismissed containers linger in the DOM as zero-sized nodes, so only
 *    *visible* containers are treated as open, and the stack is re-read after
 *    every dismissal.
 *
 * Returns a short label for each dialog that was dismissed.
 */
async function dismissVisibleDialogs(page: Page): Promise<string[]> {
  const dismissed: string[] = [];

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const dialogs = page.locator('mat-dialog-container:visible');
    if ((await dialogs.count()) === 0) break;

    const top = dialogs.last();
    const label = ((await top.textContent().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);

    const iconClose = top.locator('button[aria-label="Close"], button:has(i.ti-x)').first();
    const textClose = top.getByRole('button', { name: /^(Cancel|Close|Skip)$/i }).first();

    if ((await iconClose.count()) > 0) {
      await iconClose.dispatchEvent('click');
      dismissed.push(label);
    } else if ((await textClose.count()) > 0) {
      await textClose.dispatchEvent('click');
      dismissed.push(label);
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(1500);
  }

  return dismissed;
}

/**
 * Closes stray CDK overlay panels/backdrops that intercept pointer events, and
 * repairs the accessibility tree afterwards.
 *
 * Two app quirks make this necessary before nearly every interaction:
 *  - The startup modals (notably the timezone prompt) re-appear on route
 *    changes, not just once after login, so they are re-dismissed here.
 *  - While a modal is open the CDK marks `<app-root aria-hidden="true">` and
 *    only restores it when the dialog closes through its own animation. These
 *    modals leave the attribute behind, which hides the entire application from
 *    the accessibility tree and makes every `getByRole()` locator resolve to
 *    zero elements.
 */
export async function clearOverlays(page: Page): Promise<void> {
  await dismissVisibleDialogs(page);

  if (await isVisible(page.locator('.cdk-overlay-backdrop').first(), 500)) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
  await page.evaluate(() => {
    // A dismissed dialog can linger in the DOM as a zero-sized container, so
    // presence alone is not a reliable "still open" signal - measure it.
    const dialogOpen = Array.from(document.querySelectorAll('mat-dialog-container')).some((dialog) => {
      const rect = dialog.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (dialogOpen) return;
    document.querySelectorAll('.cdk-overlay-backdrop').forEach((el) => el.remove());
    document.querySelectorAll('app-root[aria-hidden="true"]').forEach((el) => el.removeAttribute('aria-hidden'));
  });
}

// ── Login & startup dialogs ────────────────────────────────────────────────

/** The Zuper Pro UAT credentials this suite is specified to run against. */
export const ZUPER_COMPANY = 'zuper-pro';
export const ZUPER_USERNAME = 'ragupathy.s@zuper.co';
export const ZUPER_PASSWORD = 'Test@1234';

/**
 * Logs into Zuper and waits for the dashboard. The Continue and Login buttons
 * are clicked through JS because a promo overlay intermittently swallows real
 * pointer events on that screen.
 */
export async function loginToZuper({ page }: { page: Page }): Promise<void> {
  await page.goto('/login');

  const companyField = page.getByRole('textbox', { name: 'Company Name' });
  await companyField.waitFor({ state: 'visible', timeout: 60000 });
  await companyField.fill(ZUPER_COMPANY);
  await clickButtonByText(page, 'Continue');

  const emailField = page.getByRole('textbox', { name: 'Email address' });
  await emailField.waitFor({ state: 'visible', timeout: 30000 });
  await emailField.fill(ZUPER_USERNAME);
  await page.getByRole('textbox', { name: 'Password Forgot password?' }).fill(ZUPER_PASSWORD);
  await clickButtonByText(page, 'Login');

  await page.waitForURL('**/dashboard', { waitUntil: 'commit', timeout: 90000 });
}

async function clickButtonByText(page: Page, label: string): Promise<void> {
  await page.evaluate((text) => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === text);
    if (btn) (btn as HTMLElement).click();
  }, label);
}

/**
 * Dismisses the post-login modals that block the app shell: the "New
 * Integration" promo, the timezone ("Time Stamp") prompt, the Zuper Connect
 * dialer and the Zuper Guide popup. Every one of them is optional.
 * Returns the names of the dialogs that were actually dismissed.
 */
export async function dismissStartupDialogs({ page }: { page: Page }): Promise<string[]> {
  await page.waitForTimeout(3000);
  const dismissed = await dismissVisibleDialogs(page);

  // The Zuper Connect dialer is a floating CDK pane (no backdrop, no close
  // button) - collapse it via its minimise icon so it cannot overlap controls.
  const connectPane = page.locator('.cdk-overlay-pane').filter({ hasText: 'Zuper Connect' }).first();
  if (await isVisible(connectPane)) {
    const minimise = connectPane.locator('em.ti-minus').first();
    if (await isVisible(minimise)) {
      await minimise.click({ force: true });
      dismissed.push('Zuper Connect');
      await page.waitForTimeout(1500);
    }
  }

  await clearOverlays(page);
  return dismissed;
}

/**
 * Navigates to the Jobs listing through the left navigation menu. The collapsed
 * rail exposes a "Jobs Group" item (a DIV, not a link); clicking it expands a
 * fly-out that contains the real `Jobs` link. Falls back to a direct URL visit
 * and reports whether the fallback was needed.
 */
export async function navigateToJobs({ page }: { page: Page }): Promise<{ usedFallback: boolean }> {
  await clearOverlays(page);

  const jobsGroup = page.locator('.zuper-vertical-navigation-item:visible').filter({ hasText: 'Jobs Group' }).first();
  if (await isVisible(jobsGroup, 5000)) {
    await jobsGroup.click({ force: true });
    // The fly-out animates in, so wait for the link instead of polling once.
    const jobsLink = page.getByRole('link', { name: 'Jobs', exact: true }).first();
    const linkReady = await jobsLink
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    if (linkReady) {
      await jobsLink.click({ force: true });
      const arrived = await page
        .waitForURL('**/jobs', { waitUntil: 'commit', timeout: 30000 })
        .then(() => true)
        .catch(() => false);
      if (arrived) {
        await waitForListSettled(page);
        // The timezone prompt re-appears on route changes - clear it again.
        await clearOverlays(page);
        return { usedFallback: false };
      }
    }
  }

  await page.goto('/jobs');
  await waitForListSettled(page);
  await clearOverlays(page);
  return { usedFallback: true };
}

// ── Jobs listing ───────────────────────────────────────────────────────────

/** The toolbar button that toggles the filter side panel (label "Filter"). */
export function filterToggleButton(page: Page): Locator {
  return page.getByRole('button', { name: 'Filter', exact: true });
}

/** Opens the filter side panel and waits for its controls to render. */
export async function openFilterPanel({ page }: { page: Page }): Promise<void> {
  await clearOverlays(page);
  const byName = filterToggleButton(page).first();
  if (await isVisible(byName, 5000)) {
    await byName.click({ force: true });
  } else {
    // With filters applied the button label becomes the filter count.
    await page.locator('button:has(svg[viewBox="0 0 18 18"])').first().click({ force: true });
  }
  await expect(page.getByRole('button', { name: 'AND', exact: true })).toBeVisible({ timeout: 30000 });
  await expect(filtersHeader(page)).toBeVisible({ timeout: 30000 });
}

/** Closes the filter side panel via its X button. */
export async function closeFilterPanel({ page }: { page: Page }): Promise<void> {
  await clearOverlays(page);
  const closeButton = page.locator('button.rounded-full.p-1').first();
  if (await isVisible(closeButton)) {
    await closeButton.click({ force: true });
    await expect(page.getByRole('button', { name: 'AND', exact: true })).toBeHidden({ timeout: 20000 });
  }
}

/** The "Filters" / "Filters (n)" header of the panel. */
export function filtersHeader(page: Page): Locator {
  return page.getByText(/^Filters(\s*\(\d+\))?$/).first();
}

/**
 * Waits until the jobs list has settled: either a populated table or the
 * "no jobs found" empty state is on screen (never a skeleton/loading state).
 */
export async function waitForListSettled(page: Page): Promise<void> {
  await expect(async () => {
    const hasRows = await page.locator('table tbody tr').first().isVisible().catch(() => false);
    const isEmpty = await page.getByText(NO_JOBS_MESSAGE).first().isVisible().catch(() => false);
    expect(hasRows || isEmpty).toBe(true);
  }).toPass({ timeout: 90000, intervals: [500, 1000, 2000] });
}

/**
 * Runs an action that re-queries the jobs list and returns the total record
 * count reported by the API. Waiting on POST /api/jobs/filter is the
 * deterministic signal that the listing refreshed, so the rows read afterwards
 * are never stale.
 */
export async function applyAndWaitForJobs(page: Page, action: () => Promise<void>): Promise<number> {
  const responsePromise = page.waitForResponse(
    (r) => r.url().includes(JOBS_FILTER_API) && r.request().method() === 'POST',
    { timeout: 120000 }
  );
  await action();
  const response = await responsePromise;
  const body = await response.json();
  await waitForListSettled(page);
  return Number(body.total_records ?? 0);
}

/** True when the listing is showing its "no jobs found" empty state. */
export async function isListingEmpty(page: Page): Promise<boolean> {
  return isVisible(page.getByText(NO_JOBS_MESSAGE).first(), 2000);
}

/**
 * Reads the job count badge from the breadcrumb. Returns 0 when the listing
 * shows the empty state (the badge is not rendered then).
 */
export async function getDisplayedJobCount(page: Page): Promise<number> {
  await waitForListSettled(page);
  if (await isListingEmpty(page)) return 0;
  const items = await page.getByLabel('Breadcrumb').locator('li').allTextContents();
  for (const item of items) {
    const text = item.replace(/[\s,]/g, '');
    if (/^\d+$/.test(text)) return Number(text);
  }
  throw new Error(`Could not read job count badge. Breadcrumb items: ${JSON.stringify(items)}`);
}

/**
 * Trimmed text of every visible row for the named column. Column order is
 * resolved from the table header, so it survives column customisation.
 * Returns [] when the listing is empty.
 */
export async function getColumnValues(page: Page, header: string): Promise<string[]> {
  if (await isListingEmpty(page)) return [];
  const headers = (await page.locator('table thead th').allTextContents()).map((h) => cleanCell(h));
  const index = headers.indexOf(header);
  if (index === -1) {
    throw new Error(`Column "${header}" not found. Available columns: ${JSON.stringify(headers)}`);
  }
  const raw = await page.locator('table tbody tr').evaluateAll(
    (rows, i) => rows.map((row) => (row as HTMLTableRowElement).cells[i]?.textContent ?? ''),
    index
  );
  return raw.map(cleanCell);
}

/** Number of job rows currently rendered (0 when the empty state is shown). */
export async function getVisibleRowCount(page: Page): Promise<number> {
  if (await isListingEmpty(page)) return 0;
  return page.locator('table tbody tr').count();
}

// ── Pinned filters ─────────────────────────────────────────────────────────

/** Pinned filter cards (the ones that expose an "Unpin" action). */
export function pinnedFilterCards(page: Page): Locator {
  return page.locator('.cdk-drag').filter({ has: page.getByRole('button', { name: 'Unpin' }) });
}

/**
 * Removes the named pinned filters from the "Pinned Filters" section.
 * Idempotent: names that are not pinned are skipped, so the test can be re-run
 * against an account where they were already deleted.
 * Returns the names that were actually removed.
 */
export async function removePinnedFilters({
  page,
  names,
}: {
  page: Page;
  names: string[];
}): Promise<string[]> {
  const removed: string[] = [];
  for (const name of names) {
    const card = pinnedFilterCards(page).filter({ hasText: name }).first();
    if (await isVisible(card)) {
      await clearOverlays(page);
      await card.getByRole('button', { name: 'Remove' }).first().click({ force: true });
      await expect(pinnedFilterCards(page).filter({ hasText: name })).toHaveCount(0, { timeout: 20000 });
      removed.push(name);
    }
  }
  return removed;
}

/** Labels of the pinned filters still present in the panel. */
export async function getPinnedFilterNames(page: Page): Promise<string[]> {
  const texts = await pinnedFilterCards(page).allTextContents();
  return texts.map((t) => cleanCell(t.replace(/(Unpin|Remove|Choose condition and value)/g, ' ')));
}

// ── Applied filters ────────────────────────────────────────────────────────

/** Every card inside the applied-filters container (includes the open form). */
function allFilterCards(page: Page): Locator {
  return page.locator('.normal-filters-container > .cdk-drag');
}

/** The card currently in add/edit mode (the one holding "Choose Filter"). */
export function filterForm(page: Page): Locator {
  return allFilterCards(page).filter({ has: page.getByRole('combobox', { name: 'Choose Filter' }) });
}

/** Committed (already applied) filter cards, excluding the open add/edit form. */
export function appliedFilterCards(page: Page): Locator {
  return allFilterCards(page).filter({ hasNot: page.getByRole('combobox', { name: 'Choose Filter' }) });
}

/** Whitespace-normalised text of each applied card, e.g. "Job ID Equal To 681734". */
export async function getAppliedFilterTexts(page: Page): Promise<string[]> {
  const texts = await appliedFilterCards(page).allTextContents();
  return texts.map((t) => cleanCell(t));
}

/** Operator ng-select of the open add/edit form. */
function operatorSelect(page: Page): Locator {
  return filterForm(page).locator('ng-select').first();
}

/** Value / date-range ng-select of the open add/edit form. */
function valueSelect(page: Page): Locator {
  return filterForm(page).locator('ng-select').nth(1);
}

/**
 * Every operator offered for the field open in the add/edit form. The
 * ng-select hides the already-selected operator from its option list, so the
 * selected chip is merged back in to give the complete set.
 */
export async function getAvailableOperators(page: Page): Promise<string[]> {
  const select = operatorSelect(page);
  const selected = (await select.locator('.ng-value-label').allTextContents()).map((t) => cleanCell(t));
  await select.locator('input').first().click({ force: true });
  const panel = page.locator('.ng-dropdown-panel');
  await panel.waitFor({ state: 'visible', timeout: 15000 });
  const options = (await panel.getByRole('option').allTextContents()).map((t) => cleanCell(t));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  return Array.from(new Set([...selected, ...options])).filter(Boolean);
}

/** Operator currently selected in the open add/edit form. */
export async function getSelectedOperator(page: Page): Promise<string> {
  const labels = await operatorSelect(page).locator('.ng-value-label').allTextContents();
  return cleanCell(labels[0] ?? '');
}

/** Every option offered by the value dropdown of the open form. */
export async function getValueOptions(page: Page, query?: string): Promise<string[]> {
  const input = valueSelect(page).locator('input').first();
  await input.click({ force: true });
  const panel = page.locator('.ng-dropdown-panel');
  await panel.waitFor({ state: 'visible', timeout: 20000 });
  if (query) {
    await input.fill(query);
    // Value lists are fetched from the server as the user types.
    await page.waitForTimeout(3000);
  }
  const options = (await panel.getByRole('option').allTextContents()).map((t) => cleanCell(t));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  return options;
}

/** Opens the "Choose Filter" dropdown of the open form and lists every field. */
export async function getFilterFieldOptions(page: Page): Promise<string[]> {
  const combobox = page.getByRole('combobox', { name: 'Choose Filter' });
  await combobox.waitFor({ state: 'visible', timeout: 20000 });
  await combobox.click({ force: true });
  const panel = page.locator('.mat-mdc-autocomplete-panel');
  await panel.waitFor({ state: 'visible', timeout: 20000 });
  const options = panel.getByRole('option');
  await expect(options.first()).toBeVisible({ timeout: 15000 });
  // The list is long, so scroll to the end to make sure every option rendered.
  await options.last().scrollIntoViewIfNeeded().catch(() => {});
  const labels = (await options.allTextContents()).map((t) => cleanCell(t));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  return labels;
}

/**
 * Makes sure an empty add/edit form is open, clicking "Add Filter" only when
 * the panel does not already show one.
 */
export async function startNewFilter(page: Page): Promise<void> {
  await clearOverlays(page);
  if ((await filterForm(page).count()) === 0) {
    await page.getByRole('button', { name: 'Add Filter' }).first().click({ force: true });
  }
  await page.getByRole('combobox', { name: 'Choose Filter' }).waitFor({ state: 'visible', timeout: 20000 });
}

/** Selects a field in the open form's "Choose Filter" dropdown. */
export async function chooseFilterField(page: Page, field: string): Promise<void> {
  const combobox = page.getByRole('combobox', { name: 'Choose Filter' });
  await combobox.click({ force: true });
  const panel = page.locator('.mat-mdc-autocomplete-panel');
  await panel.waitFor({ state: 'visible', timeout: 20000 });
  await panel.getByRole('option', { name: field, exact: true }).first().click();
  // The operator / value controls are rebuilt for the chosen field.
  await expect(operatorSelect(page)).toBeVisible({ timeout: 30000 });
}

/** Picks an operator in the open form. No-op when it is already selected. */
export async function selectOperator(page: Page, operator: string): Promise<void> {
  if ((await getSelectedOperator(page)) === operator) return;
  const select = operatorSelect(page);
  await select.locator('input').first().click({ force: true });
  const panel = page.locator('.ng-dropdown-panel');
  await panel.waitFor({ state: 'visible', timeout: 20000 });
  await panel.getByRole('option', { name: operator, exact: true }).first().click();
  await expect(select.locator('.ng-value-label').first()).toHaveText(operator, { timeout: 20000 });
}

/**
 * Fills the value control of the open form. Returns the label that was
 * actually selected, which can differ from the search term (searching
 * "Requirements Collection" resolves to "Requirements Collection1").
 */
export async function setFilterValue(page: Page, spec: FilterSpec): Promise<string> {
  const form = filterForm(page);

  if (spec.valueType === 'none') return '';

  if (spec.valueType === 'number') {
    const input = form.getByRole('spinbutton').first();
    await input.fill(String(spec.value));
    await expect(input).toHaveValue(String(spec.value));
    return String(spec.value);
  }

  if (spec.valueType === 'text') {
    const input = form.getByRole('textbox', { name: 'Field Value' }).first();
    await input.fill(String(spec.value));
    await expect(input).toHaveValue(String(spec.value));
    return String(spec.value);
  }

  if (spec.valueType === 'customrange') {
    await pickFromValueDropdown(page, 'Custom Range');
    const from = page.getByRole('textbox', { name: 'Choose From Date' });
    const to = page.getByRole('textbox', { name: 'Choose To Date' });
    await from.waitFor({ state: 'visible', timeout: 20000 });
    await from.fill(String(spec.fromDate));
    await page.keyboard.press('Escape');
    await to.fill(String(spec.toDate));
    await page.keyboard.press('Escape');
    await expect(from).toHaveValue(String(spec.fromDate));
    await expect(to).toHaveValue(String(spec.toDate));
    return `${spec.fromDate} - ${spec.toDate}`;
  }

  // 'select' and 'daterange' are both ng-select dropdowns.
  return pickFromValueDropdown(page, String(spec.value), spec.valueType === 'select');
}

/**
 * Opens the value ng-select, optionally types a search term, and clicks the
 * first option containing the term. Returns the clicked option label.
 */
async function pickFromValueDropdown(page: Page, term: string, search = false): Promise<string> {
  const input = valueSelect(page).locator('input').first();
  await input.click({ force: true });
  const panel = page.locator('.ng-dropdown-panel');
  await panel.waitFor({ state: 'visible', timeout: 20000 });
  if (search) {
    await input.fill(term);
    await page.waitForTimeout(3000);
  }
  const option = panel.getByRole('option').filter({ hasText: term }).first();
  await option.waitFor({ state: 'visible', timeout: 30000 });
  const label = cleanCell((await option.textContent()) ?? '');
  await option.click();
  // Multi-select value dropdowns stay open and would swallow the Add click.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  return label;
}

/** Submits the open add/edit form ("Add" for new filters, "Update" when editing). */
export async function submitFilterForm(page: Page): Promise<number> {
  await clearOverlays(page);
  const update = page.getByRole('button', { name: 'Update', exact: true });
  const button = (await isVisible(update)) ? update : page.getByRole('button', { name: 'Add', exact: true });
  return applyAndWaitForJobs(page, async () => {
    await button.click({ force: true });
  });
}

/**
 * Adds a filter end to end: form -> field -> operator -> value -> Add.
 * Returns the API total_records and the resolved value label.
 */
export async function addFilter({
  page,
  spec,
}: {
  page: Page;
  spec: FilterSpec;
}): Promise<{ total: number; resolvedValue: string }> {
  await startNewFilter(page);
  await chooseFilterField(page, spec.field);
  if (spec.operator) await selectOperator(page, spec.operator);
  const resolvedValue = await setFilterValue(page, spec);
  const total = await submitFilterForm(page);
  await expect(filterForm(page)).toHaveCount(0, { timeout: 20000 });
  return { total, resolvedValue };
}

/** Opens the edit form of an applied filter card via its pencil icon. */
export async function openFilterForEdit(page: Page, index = 0): Promise<void> {
  await clearOverlays(page);
  await appliedFilterCards(page).nth(index).locator('button:has(i.ti-pencil)').first().click({ force: true });
  await page.getByRole('button', { name: 'Update', exact: true }).waitFor({ state: 'visible', timeout: 20000 });
}

/** Edits an applied filter in place (operator and/or value) and submits it. */
export async function editFilter({
  page,
  index = 0,
  operator,
  value,
  valueType,
}: {
  page: Page;
  index?: number;
  operator?: string;
  value?: string;
  valueType: FilterValueType;
}): Promise<{ total: number; resolvedValue: string }> {
  await openFilterForEdit(page, index);
  if (operator) await selectOperator(page, operator);
  let resolvedValue = '';
  if (valueType !== 'none' && value !== undefined) {
    resolvedValue = await setFilterValue(page, { field: '', valueType, value });
  }
  const total = await submitFilterForm(page);
  await expect(filterForm(page)).toHaveCount(0, { timeout: 20000 });
  return { total, resolvedValue };
}

/** Removes a single applied filter card and waits for the listing to refresh. */
export async function removeAppliedFilter(page: Page, index = 0): Promise<number> {
  await clearOverlays(page);
  const card = appliedFilterCards(page).nth(index);
  return applyAndWaitForJobs(page, async () => {
    await card.getByRole('button', { name: 'Remove' }).first().click({ force: true });
  });
}

/** True when the "Clear All" control is offered by the panel. */
export async function isClearAllVisible(page: Page): Promise<boolean> {
  return isVisible(page.getByRole('button', { name: 'Clear All' }), 3000);
}

/** Clicks "Clear All" when present and waits for the unfiltered listing. */
export async function clearAllFilters(page: Page): Promise<number | null> {
  await clearOverlays(page);
  const clearAll = page.getByRole('button', { name: 'Clear All' });
  if (!(await isVisible(clearAll))) return null;
  const total = await applyAndWaitForJobs(page, async () => {
    await clearAll.click({ force: true });
  });
  await expect(appliedFilterCards(page)).toHaveCount(0, { timeout: 30000 });
  return total;
}

/**
 * Brings the panel back to a known state between scenarios: dismisses stray
 * overlays, clears every applied filter and restores the AND conjunction.
 */
export async function resetFilterPanel(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await clearOverlays(page);
  await clearAllFilters(page);
  await expect(appliedFilterCards(page)).toHaveCount(0, { timeout: 30000 });
  await setLogicalOperator(page, 'AND');
}

// ── AND / OR ───────────────────────────────────────────────────────────────

/** True when the given AND/OR toggle is the active one. */
export async function isLogicalOperatorSelected(page: Page, operator: 'AND' | 'OR'): Promise<boolean> {
  const cls = (await page.getByRole('button', { name: operator, exact: true }).getAttribute('class')) ?? '';
  return cls.includes('bg-white');
}

/**
 * Selects AND or OR. When filters are applied the listing re-queries, so the
 * refresh is awaited and the new total returned; otherwise null.
 */
export async function setLogicalOperator(page: Page, operator: 'AND' | 'OR'): Promise<number | null> {
  if (await isLogicalOperatorSelected(page, operator)) return null;
  await clearOverlays(page);
  const button = page.getByRole('button', { name: operator, exact: true });
  if ((await appliedFilterCards(page).count()) === 0) {
    await button.click({ force: true });
    await expect.poll(() => isLogicalOperatorSelected(page, operator), { timeout: 15000 }).toBe(true);
    return null;
  }
  const total = await applyAndWaitForJobs(page, async () => {
    await button.click({ force: true });
  });
  await expect.poll(() => isLogicalOperatorSelected(page, operator), { timeout: 15000 }).toBe(true);
  return total;
}

// ── Date helpers ───────────────────────────────────────────────────────────

/** Formats a Date as MM/DD/YYYY, the format the filter datepickers expect. */
export function formatDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${date.getFullYear()}`;
}

/** Extracts the MM/DD/YYYY - MM/DD/YYYY span rendered on a date filter chip. */
export function parseChipDateRange(chipText: string): { start: Date; end: Date } {
  const match = chipText.match(/(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/);
  if (!match) throw new Error(`No date range found in filter chip: "${chipText}"`);
  const toDate = (value: string, endOfDay: boolean) => {
    const [mm, dd, yyyy] = value.split('/').map(Number);
    return endOfDay ? new Date(yyyy, mm - 1, dd, 23, 59, 59, 999) : new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
  };
  return { start: toDate(match[1], false), end: toDate(match[2], true) };
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Checks a "Scheduled Date" cell (e.g. "Sep 16 06:00PM - 11:59PM", sometimes
 * with an explicit year) against a date range. The cell usually omits the
 * year, so both boundary years are treated as valid candidates.
 */
export function isScheduledDateWithin(cellText: string, range: { start: Date; end: Date }): boolean {
  const match = cellText.match(/([A-Za-z]{3})[a-z]*\s+(\d{1,2})(?:,?\s*(\d{4}))?/);
  if (!match) return false;
  const month = MONTHS.indexOf(match[1].toLowerCase());
  if (month === -1) return false;
  const day = Number(match[2]);
  const years = match[3]
    ? [Number(match[3])]
    : Array.from(new Set([range.start.getFullYear(), range.end.getFullYear()]));
  return years.some((year) => {
    const candidate = new Date(year, month, day, 12, 0, 0, 0);
    return candidate >= range.start && candidate <= range.end;
  });
}
