import { expect } from '@stablyai/playwright-test';
import type { Locator, Page } from '@playwright/test';

/**
 * Helpers for the Zuper Jobs listing filter panel.
 *
 * The filter panel is an Angular Material / ng-select based side panel:
 *   - Field selector  → `input[id^="field_type_"]` backed by `.mat-mdc-autocomplete-panel`
 *   - Operator        → ng-select `[id^="operator_"]`      → `.ng-dropdown-panel`
 *   - Value           → `[id^="field_value_"]` (ng-select OR plain input)
 *   - Date range      → ng-select `[id^="range_"]`         → `.ng-dropdown-panel`
 *   - Commit button   → "Add" for a brand new row, "Update" for a reused/pinned row
 *
 * Rows live in two CDK drag lists: `#pinned-filters-list` and `#normal-filters-list`.
 * Pinned fields are NOT offered in the "Choose Filter" dropdown — they are configured
 * in place via the pinned row's pencil icon.
 */

export const EMPTY_RESULT_TEXT = 'No jobs found for the filter applied';
const PINNED_LIST = '#pinned-filters-list';
const NORMAL_LIST = '#normal-filters-list';
const UNSET_ROW_TEXT = 'choose condition and value';

export interface FilterControls {
  operatorId: string | null;
  valueId: string | null;
  valueTag: string | null;
  rangeId: string | null;
}

export interface FilterRow {
  scope: 'pinned' | 'normal';
  index: number;
  field: string;
  text: string;
}

// ── Login & popups ──────────────────────────────────────────────────────────

export async function login(page: Page): Promise<void> {
  await page.goto('/login');

  const company = page.getByRole('textbox', { name: 'Company Name' });
  await company.waitFor({ state: 'visible', timeout: 60000 });
  await company.fill(process.env.company_name ?? 'zuper-pro');

  // JS click: a promotional banner overlay can intercept real pointer events here.
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Continue',
    );
    if (btn) (btn as HTMLButtonElement).click();
  });

  const email = page.getByRole('textbox', { name: 'Email address' });
  await email.waitFor({ state: 'visible', timeout: 30000 });
  await email.fill(process.env.user_name ?? 'ragupathy.s@zuper.co');
  await page
    .getByRole('textbox', { name: 'Password Forgot password?' })
    .fill(process.env.password ?? 'Test@1234');

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Login',
    );
    if (btn) (btn as HTMLButtonElement).click();
  });

  await page.waitForURL('**/dashboard', { waitUntil: 'commit', timeout: 90000 });
}

/**
 * Minimises the floating "Zuper Connect" dialer widget. While expanded it covers a
 * large slice of the toolbar (`pointer-events: auto`) and swallows clicks meant for
 * the Filter button.
 */
export async function dismissZuperConnect(page: Page): Promise<boolean> {
  // Once minimised the whole widget collapses to a 0x0 box, so its action icon stops
  // being visible - which also makes repeated calls safe (no accidental re-expand).
  const minimise = page.locator('.zuper-connect-action-icon').first();
  if (await minimise.isVisible({ timeout: 1000 }).catch(() => false)) {
    await minimise.click({ force: true });
    await page.waitForTimeout(600);
    return true;
  }

  // Fallback: the widget header ("Zuper Connect") with its collapse control.
  const header = page.locator('div', { hasText: /^Zuper Connect$/ }).last();
  if (await header.isVisible({ timeout: 500 }).catch(() => false)) {
    const control = header.locator('i, em').first();
    if (await control.isVisible({ timeout: 500 }).catch(() => false)) {
      await control.click({ force: true });
      await page.waitForTimeout(600);
      return true;
    }
  }
  return false;
}

/** Dismiss the notification-permission prompt ("No, thanks"). Cheap, safe to spam. */
export async function dismissNotificationPrompt(page: Page): Promise<boolean> {
  const btn = page.getByRole('button', { name: /no,?\s*thanks/i }).first();
  if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await btn.click({ force: true });
    await page.waitForTimeout(400);
    return true;
  }
  return false;
}

/**
 * Dismisses the onboarding/interstitial popups seen right after login and after
 * navigating to Jobs: "New Integration", the Zuper guide tour, the timezone /
 * time-stamp confirmation, the notification prompt and the Zuper Connect widget.
 *
 * Returns the labels of everything that was actually dismissed (used for reporting).
 */
export async function dismissPopups(page: Page, windowMs = 60000, minMs = 25000): Promise<string[]> {
  const dismissed = new Set<string>();
  const started = Date.now();
  let quietPasses = 0;

  // These interstitials render asynchronously - some only after the dashboard widgets
  // resolve - so sweep for at least `minMs` and until three consecutive passes are quiet.
  while (
    Date.now() - started < windowMs &&
    (Date.now() - started < minMs || quietPasses < 3)
  ) {
    let acted = false;

    if (await dismissZuperConnect(page)) {
      dismissed.add('Zuper Connect');
      acted = true;
    }

    // Both the "New Integration" modal and the "Zuper Guide" card expose a Close button.
    const closeButtons = page.getByRole('button', { name: 'Close' });
    for (let i = 0; i < 5; i++) {
      const button = closeButtons.first();
      if (!(await button.isVisible({ timeout: 800 }).catch(() => false))) break;
      await button.click({ force: true });
      dismissed.add('New Integration / Zuper Guide (Close)');
      acted = true;
      await page.waitForTimeout(700);
    }

    // Guided tour prompts.
    for (const name of [/^skip/i, /got it/i, /maybe later/i, /^Dismiss$/i]) {
      const button = page.getByRole('button', { name }).first();
      if (await button.isVisible({ timeout: 600 }).catch(() => false)) {
        await button.click({ force: true });
        dismissed.add('Zuper guide tour');
        acted = true;
        await page.waitForTimeout(700);
      }
    }

    // "Your timezone has changed" / time-stamp confirmation dialog.
    const cancel = page.getByRole('button', { name: 'Cancel', exact: true }).first();
    if (await cancel.isVisible({ timeout: 800 }).catch(() => false)) {
      await cancel.click({ force: true });
      dismissed.add('Time Stamp / timezone');
      acted = true;
      await page.waitForTimeout(700);
    }

    if (await dismissNotificationPrompt(page)) {
      dismissed.add('Notification prompt');
      acted = true;
    }

    // Stray CDK backdrops block every subsequent click.
    await page.evaluate(() =>
      document.querySelectorAll('.cdk-overlay-backdrop').forEach((el) => el.remove()),
    );

    if (acted) {
      quietPasses = 0;
    } else {
      quietPasses += 1;
      await page.waitForTimeout(2500);
    }
  }

  return [...dismissed];
}

// ── Panel open / close ──────────────────────────────────────────────────────

/**
 * The toolbar filter toggle. Its label switches from "Filter" to the active filter
 * count (e.g. "1") once filters are applied, so match on its icon instead of text.
 */
export function filterToggle(page: Page): Locator {
  return page.locator('button:has(svg[viewBox="0 0 18 18"])').first();
}

export async function isPanelOpen(page: Page): Promise<boolean> {
  return page
    .getByRole('button', { name: 'Add Filter' })
    .first()
    .isVisible({ timeout: 1500 })
    .catch(() => false);
}

export async function openFilterPanel(page: Page): Promise<void> {
  if (await isPanelOpen(page)) return;
  await dismissZuperConnect(page);
  const toggle = filterToggle(page);
  await toggle.waitFor({ state: 'visible', timeout: 30000 });
  await toggle.click({ force: true });
  await page
    .getByRole('button', { name: 'Add Filter' })
    .first()
    .waitFor({ state: 'visible', timeout: 20000 });
}

/** Re-opens the panel if an Escape keypress or navigation collapsed it. */
export async function ensurePanelOpen(page: Page): Promise<void> {
  if (!(await isPanelOpen(page))) await openFilterPanel(page);
}

// ── Result list ─────────────────────────────────────────────────────────────

export async function isEmptyState(page: Page): Promise<boolean> {
  return page
    .getByText(EMPTY_RESULT_TEXT)
    .first()
    .isVisible({ timeout: 1500 })
    .catch(() => false);
}

/**
 * Total matching-jobs count from the breadcrumb badge, or 0 when the "no jobs found"
 * empty state is displayed. Returns -1 if the badge is present but not numeric.
 */
export async function getResultCount(page: Page): Promise<number> {
  if (await isEmptyState(page)) return 0;
  const badge = page.getByLabel('Breadcrumb').locator('li').nth(1);
  const text = await badge.innerText({ timeout: 15000 }).catch(() => '');
  const n = parseInt(text.replace(/[\s,]/g, ''), 10);
  return Number.isNaN(n) ? -1 : n;
}

/**
 * Waits for the Jobs list to finish reloading after a filter change: loader gone,
 * then either rows rendered or the empty state shown, then the count settled
 * (two identical consecutive reads) so no stale result set is asserted against.
 */
export async function waitForListSettled(page: Page): Promise<void> {
  await page.waitForTimeout(1500);

  const loader = page
    .locator('[role="progressbar"], mat-progress-bar, .skeleton-loader, .loading-skeleton')
    .first();
  if (await loader.isVisible({ timeout: 1000 }).catch(() => false)) {
    await loader.waitFor({ state: 'hidden', timeout: 90000 }).catch(() => undefined);
  }

  await expect(async () => {
    const empty = await isEmptyState(page);
    const rows = await page.locator('table tbody tr').count();
    expect(empty || rows > 0).toBeTruthy();
  }).toPass({ timeout: 90000 });

  let previous = Number.NaN;
  for (let i = 0; i < 12; i++) {
    const current = await getResultCount(page);
    if (current === previous) return;
    previous = current;
    await page.waitForTimeout(1500);
  }
}

export async function getColumnIndexes(page: Page): Promise<Record<string, number>> {
  const headers = await page
    .locator('table thead th')
    .evaluateAll((els) => els.map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim()));
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    if (h) map[h] = i;
  });
  return map;
}

export async function getColumnValues(page: Page, index: number): Promise<string[]> {
  return page.locator('table tbody tr').evaluateAll(
    (rows, i) =>
      rows.map((r) => (r.querySelectorAll('td')[i]?.textContent || '').replace(/\s+/g, ' ').trim()),
    index,
  );
}

/** Convenience: values of a column addressed by its header text. */
export async function getColumnByHeader(page: Page, header: string): Promise<string[]> {
  const map = await getColumnIndexes(page);
  const index = map[header];
  expect(index, `Jobs table should have a "${header}" column`).not.toBeUndefined();
  return getColumnValues(page, index);
}

// ── Filter rows ─────────────────────────────────────────────────────────────

async function readRows(page: Page, selector: string, scope: 'pinned' | 'normal'): Promise<FilterRow[]> {
  if (!(await page.locator(selector).count())) return [];
  const rows = page.locator(`${selector} .cdk-drag`);
  const total = await rows.count();
  const out: FilterRow[] = [];
  for (let i = 0; i < total; i++) {
    const text = (await rows.nth(i).innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    const field = (await rows.nth(i).innerText().catch(() => '')).split('\n')[0].trim();
    out.push({ scope, index: i, field, text });
  }
  return out;
}

export async function getFilterRows(page: Page): Promise<FilterRow[]> {
  return [
    ...(await readRows(page, PINNED_LIST, 'pinned')),
    ...(await readRows(page, NORMAL_LIST, 'normal')),
  ];
}

/** Rows that actually carry a condition + value (i.e. contribute to the result set). */
export async function getAppliedFilters(page: Page): Promise<FilterRow[]> {
  const rows = await getFilterRows(page);
  return rows.filter((r) => !r.text.toLowerCase().includes(UNSET_ROW_TEXT) && r.text.length > 0);
}

export async function getPinnedFieldNames(page: Page): Promise<string[]> {
  return (await readRows(page, PINNED_LIST, 'pinned')).map((r) => r.field);
}

function rowLocator(page: Page, row: FilterRow): Locator {
  const selector = row.scope === 'pinned' ? PINNED_LIST : NORMAL_LIST;
  return page.locator(`${selector} .cdk-drag`).nth(row.index);
}

/**
 * Clicks the exact centre of a small icon with the mouse. Playwright's `click()`
 * (even forced) on these `<i>` icons is intercepted by the surrounding row, which
 * merely toggles the row's edit mode instead of firing the icon's own handler.
 */
async function mouseClickIcon(page: Page, icon: Locator): Promise<void> {
  await icon.scrollIntoViewIfNeeded();
  await icon.waitFor({ state: 'visible', timeout: 10000 });
  const box = await icon.boundingBox();
  if (!box) throw new Error('Filter row icon has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

// ── Building a filter ───────────────────────────────────────────────────────

export async function discoverControls(page: Page): Promise<FilterControls> {
  const found = await page
    .locator('[id^="operator_"], [id^="field_value_"], [id^="range_"]')
    .evaluateAll((els) => els.map((e) => ({ id: e.id, tag: e.tagName })));

  const operator = found.find((f) => f.id.startsWith('operator_'));
  const value = found.find((f) => f.id.startsWith('field_value_'));
  const range = found.find((f) => f.id.startsWith('range_'));

  return {
    operatorId: operator?.id ?? null,
    valueId: value?.id ?? null,
    valueTag: value?.tag ?? null,
    rangeId: range?.id ?? null,
  };
}

/** Field names currently offered by the "Choose Filter" dropdown (scrolled to the end). */
export async function readFieldOptions(page: Page): Promise<string[]> {
  const panel = page.locator('.mat-mdc-autocomplete-panel');
  await panel.waitFor({ state: 'visible', timeout: 15000 });
  const seen = new Set<string>();
  for (let i = 0; i < 15; i++) {
    const texts = await panel.getByRole('option').allInnerTexts();
    texts.forEach((t) => seen.add(t.split('\n')[0].trim()));
    const atEnd = await panel.evaluate((el) => {
      const before = el.scrollTop;
      el.scrollTop = before + el.clientHeight;
      return el.scrollTop === before;
    });
    if (atEnd) break;
    await page.waitForTimeout(300);
  }
  return [...seen];
}

/** Opens the "Choose Filter" dropdown on a fresh row without picking anything. */
export async function openFieldDropdown(page: Page): Promise<void> {
  await ensurePanelOpen(page);
  await page.getByRole('button', { name: 'Add Filter' }).first().click({ force: true });
  await page.waitForTimeout(1200);
  const fieldInput = page.locator('input[id^="field_type_"]').last();
  await fieldInput.click({ force: true });
  await page.waitForTimeout(1200);
}

/**
 * Starts editing a filter for `fieldName` and returns its runtime control IDs.
 * Pinned fields are configured through their pinned row (they are absent from the
 * "Choose Filter" dropdown); everything else goes through "Add Filter".
 */
export async function beginFilter(page: Page, fieldName: string): Promise<FilterControls> {
  await ensurePanelOpen(page);

  const pinnedNames = await getPinnedFieldNames(page);
  const pinnedIndex = pinnedNames.findIndex((n) => n.toLowerCase() === fieldName.toLowerCase());

  if (pinnedIndex >= 0) {
    const row = page.locator(`${PINNED_LIST} .cdk-drag`).nth(pinnedIndex);
    await mouseClickIcon(page, row.locator('i.ti-pencil').first());
  } else {
    await page.getByRole('button', { name: 'Add Filter' }).first().click({ force: true });
    await page.waitForTimeout(1200);

    const fieldInput = page.locator('input[id^="field_type_"]').last();
    await fieldInput.click({ force: true });
    await fieldInput.fill(fieldName);
    await page.waitForTimeout(1200);

    const panel = page.locator('.mat-mdc-autocomplete-panel');
    await panel.waitFor({ state: 'visible', timeout: 15000 });
    const exact = panel.getByRole('option', { name: fieldName, exact: true }).first();
    if (await exact.isVisible({ timeout: 2000 }).catch(() => false)) {
      await exact.click({ force: true });
    } else {
      await panel.getByRole('option').first().click({ force: true });
    }
  }

  await page.waitForTimeout(1500);
  return discoverControls(page);
}

function ngSelect(page: Page, id: string): Locator {
  return page.locator(`[id="${id}"]`);
}

async function selectedNgValue(page: Page, id: string): Promise<string> {
  const value = ngSelect(page, id).locator('.ng-value').first();
  if (!(await value.count())) return '';
  return (await value.innerText().catch(() => '')).split('\n')[0].trim();
}

/**
 * All operators offered for the open filter row, including the one already selected
 * (ng-select omits the current selection from its dropdown).
 */
export async function getOperatorOptions(page: Page, operatorId: string): Promise<string[]> {
  const selected = await selectedNgValue(page, operatorId);
  await ngSelect(page, operatorId).click({ force: true });
  const panel = page.locator('.ng-dropdown-panel');
  await panel.waitFor({ state: 'visible', timeout: 10000 });
  const options = (await panel.getByRole('option').allInnerTexts()).map((t) =>
    t.split('\n')[0].trim(),
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  if (selected && !options.includes(selected)) options.unshift(selected);
  return options;
}

export async function setOperator(page: Page, operatorId: string, operator: string): Promise<void> {
  if ((await selectedNgValue(page, operatorId)) === operator) return;

  await ngSelect(page, operatorId).click({ force: true });
  const panel = page.locator('.ng-dropdown-panel');
  await panel.waitFor({ state: 'visible', timeout: 10000 });
  const option = panel.getByRole('option', { name: operator, exact: true }).first();
  await option.waitFor({ state: 'visible', timeout: 10000 });
  await option.click({ force: true });
  await page.waitForTimeout(700);
}

/**
 * Picks `desired` from an ng-select value dropdown. When the exact value does not
 * exist in this environment it falls back to the first available option so operator
 * mechanics can still be verified. Returns the value that was actually selected.
 */
export async function setComboValue(page: Page, valueId: string, desired: string): Promise<string> {
  const input = ngSelect(page, valueId).locator('input').first();
  await input.click({ force: true });
  await page.waitForTimeout(900);
  await input.fill(desired);
  await page.waitForTimeout(1600);

  const panel = page.locator('.ng-dropdown-panel');
  const exact = panel.getByRole('option', { name: desired, exact: true }).first();
  if (await exact.isVisible({ timeout: 2500 }).catch(() => false)) {
    await exact.click({ force: true });
    await page.waitForTimeout(500);
    return desired;
  }

  const partial = panel.getByRole('option').filter({ hasText: desired }).first();
  if (await partial.isVisible({ timeout: 1500 }).catch(() => false)) {
    const label = (await partial.innerText()).split('\n')[0].trim();
    await partial.click({ force: true });
    await page.waitForTimeout(500);
    return label;
  }

  // Fallback: clear the search and take whatever the environment offers.
  await input.fill('');
  await page.waitForTimeout(1600);
  const first = panel.getByRole('option').first();
  await first.waitFor({ state: 'visible', timeout: 15000 });
  const label = (await first.innerText()).split('\n')[0].trim();
  await first.click({ force: true });
  await page.waitForTimeout(500);
  return label;
}

export async function setTextValue(page: Page, valueId: string, value: string): Promise<void> {
  const input = page.locator(`[id="${valueId}"]`);
  await input.click({ force: true });
  await input.fill('');
  await input.fill(value);
  await page.waitForTimeout(500);
}

/** Range labels ("Last 7 Days", "This Month", "Custom Range", …) with their sub-captions. */
export async function getRangeOptions(page: Page, rangeId: string): Promise<string[]> {
  await ngSelect(page, rangeId).click({ force: true });
  const panel = page.locator('.ng-dropdown-panel');
  await panel.waitFor({ state: 'visible', timeout: 10000 });
  const options = (await panel.getByRole('option').allInnerTexts()).map((t) =>
    t.split('\n')[0].trim(),
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  return options;
}

export async function setRange(page: Page, rangeId: string, label: string): Promise<void> {
  await ngSelect(page, rangeId).click({ force: true });
  const panel = page.locator('.ng-dropdown-panel');
  await panel.waitFor({ state: 'visible', timeout: 10000 });
  const options = panel.getByRole('option');
  const texts = await options.allInnerTexts();
  const index = texts.findIndex(
    (t) => t.split('\n')[0].trim().toLowerCase() === label.toLowerCase(),
  );
  expect(index, `Range option "${label}" should exist`).toBeGreaterThanOrEqual(0);
  await options.nth(index).click({ force: true });
  await page.waitForTimeout(900);
}

function calendarAriaLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Fills the Custom Range start/end dates through the Material datepickers.
 * Typing into the inputs sets the value but leaves the row uncommittable
 * ("Update" silently no-ops), so the calendar must be used.
 */
export async function pickCustomRange(page: Page, start: Date, end: Date): Promise<void> {
  for (const [i, date] of [start, end].entries()) {
    const icon = page.locator('i.ti-calendar').nth(i);
    await mouseClickIcon(page, icon);
    await page.locator('.mat-calendar').first().waitFor({ state: 'visible', timeout: 10000 });

    const label = calendarAriaLabel(date);
    let cell = page.locator(`.mat-calendar-body-cell[aria-label="${label}"]`).first();
    for (let attempt = 0; attempt < 4; attempt++) {
      if (await cell.isVisible({ timeout: 1500 }).catch(() => false)) break;
      await page.locator('button[aria-label="Previous month"]').first().click({ force: true });
      await page.waitForTimeout(500);
      cell = page.locator(`.mat-calendar-body-cell[aria-label="${label}"]`).first();
    }
    await cell.waitFor({ state: 'visible', timeout: 10000 });
    await cell.click({ force: true });
    await page.waitForTimeout(900);
  }
}

/** Commits the open filter row. New rows expose "Add"; reused/pinned rows "Update". */
export async function commitFilter(page: Page): Promise<string> {
  const button = page
    .locator(`${PINNED_LIST}, ${NORMAL_LIST}`)
    .getByRole('button', { name: /^(Add|Update)$/ })
    .first();
  await button.waitFor({ state: 'visible', timeout: 15000 });
  const label = (await button.innerText()).trim();
  await button.click({ force: true });
  await waitForListSettled(page);
  return label;
}

// ── Editing / removing ──────────────────────────────────────────────────────

export async function editFilter(page: Page, row: FilterRow): Promise<FilterControls> {
  await ensurePanelOpen(page);
  await mouseClickIcon(page, rowLocator(page, row).locator('i.ti-pencil').first());
  await page.waitForTimeout(1500);
  return discoverControls(page);
}

/** Removes a single filter row via its ✕ icon. The row must be collapsed first. */
export async function removeFilter(page: Page, row: FilterRow): Promise<void> {
  await ensurePanelOpen(page);
  await mouseClickIcon(page, rowLocator(page, row).locator('i.ti-x').first());
  await waitForListSettled(page);
}

export async function clearAllFilters(page: Page): Promise<boolean> {
  await ensurePanelOpen(page);
  const clearAll = page.getByRole('button', { name: 'Clear All' }).first();
  if (!(await clearAll.isVisible({ timeout: 2000 }).catch(() => false))) return false;
  await clearAll.click({ force: true });
  await waitForListSettled(page);
  return true;
}

// ── AND / OR condition ─────────────────────────────────────────────────────

export function conditionButton(page: Page, condition: 'AND' | 'OR'): Locator {
  return page.getByRole('button', { name: condition, exact: true }).first();
}

/** The highlighted condition is styled with `bg-white text-gray-800`. */
export async function getActiveCondition(page: Page): Promise<'AND' | 'OR' | null> {
  for (const condition of ['AND', 'OR'] as const) {
    const cls = await conditionButton(page, condition)
      .getAttribute('class')
      .catch(() => null);
    if (cls && cls.includes('bg-white') && cls.includes('text-gray-800')) return condition;
  }
  return null;
}

export async function setCondition(page: Page, condition: 'AND' | 'OR'): Promise<void> {
  await conditionButton(page, condition).click({ force: true });
  await waitForListSettled(page);
}

// ── Misc ───────────────────────────────────────────────────────────────────

/** Tolerant date-cell parser — the Scheduled Date column format varies by locale. */
export function parseDateCell(text: string): Date | null {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const candidates: string[] = [cleaned];

  const monthFirst = cleaned.match(/([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{4})?/);
  if (monthFirst) {
    candidates.push(`${monthFirst[1]} ${monthFirst[2]} ${monthFirst[3] ?? new Date().getFullYear()}`);
  }
  const dayFirst = cleaned.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
  if (dayFirst) candidates.push(`${dayFirst[2]} ${dayFirst[1]} ${dayFirst[3]}`);
  const numeric = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (numeric) candidates.push(`${numeric[1]}/${numeric[2]}/${numeric[3]}`);

  for (const candidate of candidates) {
    const date = new Date(candidate);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Asserts the page shows no error banner / broken-UI text. */
export async function expectNoErrors(page: Page): Promise<void> {
  const errorBanner = page.getByText(
    /something went wrong|internal server error|unexpected error|500 error/i,
  );
  expect(await errorBanner.count()).toBe(0);
}
