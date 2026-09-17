import { expect, type Locator, type Page } from '@playwright/test';

/** Endpoint hit by every successful bulk "Update Field" submission. */
export const BULK_ACTION_URL_PART = '/api/jobs/bulk_action';

/** Toast copy differs between built-in fields and custom fields. */
export const SUCCESS_TOAST_PATTERN = /updated (in|to) jobs successfully/i;

/** Validation copy shown when a required field value is missing. */
export const REQUIRED_VALIDATION_TEXT = 'Field Value is required';

/** Escapes a literal string so it can be embedded in a RegExp. */
function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The "Update Field" bulk dialog. Scoping to the `<update-field>` custom element
 * keeps modal lookups from colliding with the Jobs listing behind it.
 */
export function updateFieldModal({ page }: { page: Page }): Locator {
  return page.locator('update-field').describe('Update Field modal');
}

/**
 * Container for CDK "connected position" overlays — the field list, value lists,
 * ng-select dropdowns and datepickers. Scoping option clicks here is required
 * because the Jobs listing has a pinned-filter bar with buttons that share
 * labels with the field list (for example "Job Priority").
 */
export function dropdownPanel({ page }: { page: Page }): Locator {
  return page
    .locator('.cdk-overlay-connected-position-bounding-box')
    .describe('CDK dropdown overlay panel');
}

/**
 * Closes any open CDK dropdown/datepicker overlay without closing the dialog.
 * CDK routes Escape to the topmost overlay only, so the dropdown or datepicker
 * closes while the Update Field dialog underneath stays open.
 */
export async function closeOpenDropdown({ page }: { page: Page }): Promise<void> {
  if (await dropdownPanel({ page }).count() > 0) {
    await page.keyboard.press('Escape');
    await expect(dropdownPanel({ page })).toHaveCount(0);
  }

  // A datepicker leaves a transparent, full-page backdrop behind that swallows
  // clicks on the dialog's own buttons, so it is dismissed here too.
  const datepickerBackdrop = page
    .locator('.cdk-overlay-backdrop[class*="datepicker"]')
    .describe('Datepicker backdrop');
  if (
    (await datepickerBackdrop.count()) > 0 ||
    (await page.locator('mat-datepicker-content').count()) > 0
  ) {
    await page.keyboard.press('Escape');
    await expect(datepickerBackdrop).toHaveCount(0);
    await expect(page.locator('mat-datepicker-content')).toHaveCount(0);
  }
}

/**
 * Interstitials Zuper shows after login, each identified by text inside its own
 * CDK overlay pane plus the button that dismisses it. They are stacked on top of
 * one another, so each is dismissed inside its own pane rather than by a
 * page-wide button lookup.
 */
const INTERSTITIALS: { name: string; paneText: RegExp; dismissButton: string }[] = [
  { name: 'New Integration promo', paneText: /can now be connected to Zuper/i, dismissButton: 'Close' },
  { name: 'Timezone changed dialog', paneText: /Your timezone has changed/i, dismissButton: 'Cancel' },
];

/**
 * Dismisses the interstitials Zuper shows after login: the browser-notification
 * prompt, the "New Integration" promo modal and the "Your timezone has changed"
 * dialog. Any of these will otherwise intercept clicks on the Jobs page.
 *
 * Each overlay brings its own dark backdrop, and a dismissed overlay can leave
 * its backdrop behind covering the one underneath. A real mouse click therefore
 * lands on the stale backdrop instead of the button, so the dismiss button is
 * clicked by dispatching the event straight at it.
 */
export async function dismissPopups({ page }: { page: Page }): Promise<void> {
  const noThanks = page
    .getByRole('button', { name: /no,?\s*thanks/i })
    .describe('Notification "No, thanks"');
  if (await noThanks.isVisible({ timeout: 2000 }).catch(() => false)) {
    await noThanks.click();
    await expect(noThanks).toBeHidden();
  }

  for (const { name, paneText, dismissButton } of INTERSTITIALS) {
    const pane = page
      .locator('.cdk-overlay-pane')
      .filter({ hasText: paneText })
      .first()
      .describe(name);
    if (!(await pane.isVisible({ timeout: 2000 }).catch(() => false))) continue;

    await pane
      .getByRole('button', { name: dismissButton, exact: true })
      .first()
      .describe(`${name} "${dismissButton}" button`)
      .dispatchEvent('click');
    await expect(pane).toHaveCount(0);
  }
}

/**
 * Logs in to Zuper and leaves the browser on a fully loaded Jobs listing.
 */
export async function loginAndOpenJobs({
  page,
  baseUrl,
  companyName,
  email,
  password,
}: {
  page: Page;
  baseUrl: string;
  companyName: string;
  email: string;
  password: string;
}): Promise<void> {
  await page.goto(`${baseUrl}/login`);

  const companyInput = page
    .getByRole('textbox', { name: 'Company Name' })
    .describe('Company Name input');
  const emailInput = page.locator('input#email').describe('Email address input');
  const passwordInput = page.locator('input#password').describe('Password input');

  await companyInput.waitFor({ state: 'visible', timeout: 30000 });

  // The login screens re-render while they hydrate, which can wipe a value that
  // was typed a moment too early and submit an empty form. Each step therefore
  // re-fills, confirms the value stuck and only then submits. The marketing
  // banner on these screens overlays the submit buttons, so the click is
  // dispatched straight at the button.
  await expect(async () => {
    await companyInput.fill(companyName);
    await expect(companyInput).toHaveValue(companyName, { timeout: 3000 });
    await page
      .getByRole('button', { name: 'Continue', exact: true })
      .describe('Continue button')
      .dispatchEvent('click');
    await expect(emailInput).toBeVisible({ timeout: 15000 });
  }).toPass({ timeout: 120000 });

  await expect(async () => {
    await emailInput.fill(email);
    await passwordInput.fill(password);
    await expect(emailInput).toHaveValue(email, { timeout: 3000 });
    await expect(passwordInput).toHaveValue(password, { timeout: 3000 });
    await page
      .getByRole('button', { name: 'Login', exact: true })
      .describe('Login button')
      .dispatchEvent('click');
    await page.waitForURL('**/dashboard', { waitUntil: 'commit', timeout: 30000 });
  }).toPass({ timeout: 150000 });

  await dismissPopups({ page });

  // Navigating also disposes any backdrop a dismissed interstitial left behind,
  // so the listing is loaded after the dashboard interstitials are cleared. A
  // second pass covers interstitials that only appear once Jobs has rendered.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto(`${baseUrl}/jobs`);
    await page.locator('table').first().waitFor({ state: 'attached', timeout: 60000 });
    await page
      .getByRole('checkbox', { name: 'Select all' })
      .describe('Select all jobs checkbox')
      .waitFor({ state: 'visible', timeout: 60000 });
    await dismissPopups({ page });
    if ((await page.locator('.cdk-overlay-backdrop').count()) === 0) break;
  }

  await expect(page.locator('.cdk-overlay-backdrop')).toHaveCount(0);
}

/**
 * Ensures every job row on the current page is selected and the bulk action bar
 * is showing. A successful bulk update clears the selection, so this must run
 * before each scenario. Returns the number of selected rows.
 */
export async function selectAllJobsOnPage({ page }: { page: Page }): Promise<number> {
  const selectAll = page
    .getByRole('checkbox', { name: 'Select all' })
    .describe('Select all jobs checkbox');
  await selectAll.waitFor({ state: 'visible', timeout: 30000 });

  if (!(await selectAll.isChecked())) {
    await selectAll.click();
  }
  await expect(selectAll).toBeChecked();

  const rowCheckboxes = page
    .locator('table tbody input[type="checkbox"]')
    .describe('Job row checkboxes');
  const selectedRows = page
    .locator('table tbody input[type="checkbox"]:checked')
    .describe('Selected job row checkboxes');

  const rowCount = await rowCheckboxes.count();
  await expect(selectedRows).toHaveCount(rowCount);

  await expect(
    page.getByRole('button', { name: 'Update Field' }).describe('Bulk "Update Field" button'),
  ).toBeVisible();

  return rowCount;
}

/**
 * Opens the bulk "Update Field" dialog and waits for the field list to render.
 */
export async function openUpdateFieldModal({ page }: { page: Page }): Promise<Locator> {
  await page
    .getByRole('button', { name: 'Update Field' })
    .describe('Bulk "Update Field" button')
    .click();

  const modal = updateFieldModal({ page });
  await modal.waitFor({ state: 'visible', timeout: 30000 });
  await expect(
    modal.getByRole('heading', { name: 'Update Field' }).describe('Update Field heading'),
  ).toBeVisible();
  await expect(
    modal.getByText('Choose Field to be Updated', { exact: false }).first(),
  ).toBeVisible();

  return modal;
}

/**
 * Picks an entry from the "Choose Field to be Updated" dropdown.
 *
 * The dropdown renders its entries with CSS `capitalize`, so accessible names
 * differ in case from the real field names ("Jobvalue" vs "jobValue"). Matching
 * is therefore case-insensitive and anchored, which also keeps
 * "Single Line Text" from matching "Single Line Text2".
 */
export async function chooseFieldToUpdate({
  page,
  fieldName,
}: {
  page: Page;
  fieldName: string;
}): Promise<void> {
  const modal = updateFieldModal({ page });
  const optionName = new RegExp(`^${escapeForRegExp(fieldName)}$`, 'i');
  const option = dropdownPanel({ page })
    .getByRole('button', { name: optionName })
    .describe(`"${fieldName}" field option`);

  // The list is expanded when the dialog opens; re-open it if it ever is not.
  if (!(await option.first().isVisible({ timeout: 3000 }).catch(() => false))) {
    await modal
      .getByRole('button', { name: /Select Field/ })
      .describe('Choose Field to be Updated dropdown')
      .click();
  }

  await option.first().waitFor({ state: 'visible', timeout: 15000 });
  await option.first().click();

  await expect(
    modal.locator('label').filter({ hasText: optionValueLabel(fieldName) }).first(),
  ).toBeVisible();
}

/** Matches the "Update <field>" value label, ignoring the trailing required marker. */
function optionValueLabel(fieldName: string): RegExp {
  return new RegExp(`^\\s*Update ${escapeForRegExp(fieldName)}\\s*\\*?\\s*$`, 'i');
}

/** Locator for the "Update <field>" value label inside the dialog. */
export function valueLabel({ page, fieldName }: { page: Page; fieldName: string }): Locator {
  return updateFieldModal({ page })
    .locator('label')
    .filter({ hasText: optionValueLabel(fieldName) })
    .first()
    .describe(`"Update ${fieldName}" label`);
}

/** Locator for a plain text / date input rendered for the given field. */
export function valueInput({ page, fieldName }: { page: Page; fieldName: string }): Locator {
  return updateFieldModal({ page })
    .locator(`input[id="${fieldName}"]`)
    .describe(`"${fieldName}" value input`);
}

/**
 * Selects a value from an auto-expanded option list (for example Job Priority).
 */
export async function chooseValueFromList({
  page,
  value,
}: {
  page: Page;
  value: string;
}): Promise<void> {
  const option = dropdownPanel({ page })
    .getByRole('button', { name: new RegExp(`^${escapeForRegExp(value)}$`, 'i') })
    .describe(`"${value}" value option`);
  await option.first().waitFor({ state: 'visible', timeout: 15000 });
  await option.first().click();
  await expect(dropdownPanel({ page })).toHaveCount(0);
}

/**
 * Selects a value in an ng-select based value control (Job Tags, Lead Source).
 */
export async function chooseValueFromNgSelect({
  page,
  value,
}: {
  page: Page;
  value: string;
}): Promise<void> {
  const modal = updateFieldModal({ page });
  const input = modal.locator('ng-select input[type="text"]').describe('ng-select search input');
  await input.waitFor({ state: 'visible', timeout: 15000 });
  await input.click();
  await input.fill(value);

  const option = page
    .getByRole('option', { name: value, exact: true })
    .describe(`"${value}" ng-select option`);
  await option.first().waitFor({ state: 'visible', timeout: 15000 });
  await option.first().click();

  await expect(
    modal.locator('.ng-value-label').filter({ hasText: value }).first(),
  ).toBeVisible();

  // Collapse the ng-select panel so it cannot intercept the Update click.
  await closeOpenDropdown({ page });
}

/**
 * Picks a specific calendar date in the Material datepicker attached to a date
 * field, navigating months as needed so the test does not depend on "today".
 * Typing into the input is not viable — the control snaps the day back to today.
 */
export async function pickCalendarDate({
  page,
  fieldName,
  year,
  monthIndex,
  day,
}: {
  page: Page;
  fieldName: string;
  year: number;
  /** 0-based month, matching `Date#getMonth()`. */
  monthIndex: number;
  day: number;
}): Promise<void> {
  const calendar = page.locator('mat-datepicker-content').describe('Datepicker calendar');

  if (!(await calendar.isVisible({ timeout: 3000 }).catch(() => false))) {
    await updateFieldModal({ page })
      .locator('mat-datepicker-toggle button')
      .describe('Open calendar toggle')
      .click();
    await calendar.waitFor({ state: 'visible', timeout: 15000 });
  }

  const periodButton = calendar
    .getByRole('button', { name: 'Choose month and year' })
    .describe('Calendar period label');
  const targetPeriod = new Date(year, monthIndex, 1);
  const targetMonths = targetPeriod.getFullYear() * 12 + targetPeriod.getMonth();

  for (let step = 0; step < 48; step += 1) {
    const label = (await periodButton.innerText()).trim();
    const shown = new Date(`${label} 1`);
    const shownMonths = shown.getFullYear() * 12 + shown.getMonth();
    if (shownMonths === targetMonths) break;
    await calendar
      .getByRole('button', { name: shownMonths < targetMonths ? 'Next month' : 'Previous month' })
      .click();
  }

  const dayLabel = new Date(year, monthIndex, day).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const dayCell = calendar
    .getByRole('button', { name: dayLabel })
    .describe(`Calendar day ${dayLabel}`);
  await dayCell.waitFor({ state: 'visible', timeout: 15000 });
  await dayCell.click();

  await expect(calendar).toHaveCount(0);
  await expect(valueInput({ page, fieldName })).not.toHaveValue('');
}

/**
 * Types into the TinyMCE rich text editor rendered for Job Description.
 */
export async function fillRichText({
  page,
  text,
}: {
  page: Page;
  text: string;
}): Promise<void> {
  const editorFrame = updateFieldModal({ page }).locator('iframe');
  await editorFrame.waitFor({ state: 'visible', timeout: 20000 });

  const body = editorFrame.contentFrame().locator('body').describe('Rich text editor body');
  await body.waitFor({ state: 'visible', timeout: 20000 });
  await body.click();
  await page.keyboard.type(text);

  await expect(body).toHaveText(text);
}

/**
 * Clears a pre-filled date/time input. `fill('')` is ignored by the Material
 * datepicker input, and clicking it opens the calendar, so the value is removed
 * via keyboard on a focused (not clicked) input and then blurred to trigger
 * Angular validation.
 */
export async function clearDateTimeInput({
  page,
  fieldName,
}: {
  page: Page;
  fieldName: string;
}): Promise<void> {
  await closeOpenDropdown({ page });

  const input = valueInput({ page, fieldName });
  await input.waitFor({ state: 'visible', timeout: 15000 });

  // Dismissing the datepicker re-applies the default date, so each attempt closes
  // any open picker first and then clears. Retry until the input stays empty.
  await expect(async () => {
    await closeOpenDropdown({ page });
    await input.focus();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await input.evaluate((element: HTMLInputElement) => element.blur());
    await expect(input).toHaveValue('', { timeout: 3000 });
  }).toPass({ timeout: 30000 });

  await expect(input).toHaveValue('');
  await expect(page.locator('mat-datepicker-content')).toHaveCount(0);
}

/**
 * Submits the dialog and asserts the update was accepted: the bulk action API
 * returned 200, the success toast was shown and the dialog closed.
 *
 * The toast and response waiters are armed *before* the click so a fast toast
 * (it auto-dismisses after a few seconds) cannot be missed.
 */
export async function submitUpdateAndExpectSuccess({ page }: { page: Page }): Promise<void> {
  const modal = updateFieldModal({ page });
  await closeOpenDropdown({ page });

  const successToast = page
    .locator('.hot-toast-message')
    .filter({ hasText: SUCCESS_TOAST_PATTERN })
    .first()
    .describe('Success toast');

  const toastShown = successToast.waitFor({ state: 'visible', timeout: 30000 });
  const bulkActionResponse = page.waitForResponse(
    (response) =>
      response.url().includes(BULK_ACTION_URL_PART) && response.request().method() === 'POST',
    { timeout: 60000 },
  );

  await modal
    .getByRole('button', { name: 'Update', exact: true })
    .describe('Dialog Update button')
    .click();

  const response = await bulkActionResponse;
  expect(response.status()).toBe(200);

  await toastShown;
  await modal.waitFor({ state: 'detached', timeout: 30000 });
}

/**
 * Closes the dialog with Cancel. Unlike a successful update, this preserves the
 * current job selection.
 */
export async function cancelUpdateFieldModal({ page }: { page: Page }): Promise<void> {
  const modal = updateFieldModal({ page });
  await closeOpenDropdown({ page });
  await modal
    .getByRole('button', { name: 'Cancel', exact: true })
    .describe('Dialog Cancel button')
    .click();
  await modal.waitFor({ state: 'detached', timeout: 30000 });
}
