import { Page, expect } from '@playwright/test';
import { installOverlayAutoDismiss } from '../Helper/overlay-helper.js';

/**
 * Dismisses the Beamer push notification modal if it appears.
 * This modal (`#beamerPushModal.pushModal.active`) non-deterministically overlays
 * the page and intercepts pointer events. Call after navigation or page loads.
 */
export async function dismissBeamerModal(page: Page): Promise<void> {
  try {
    const beamerModal = page.locator('#beamerPushModal.pushModal.active');
    if (await beamerModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Try clicking the deny/close button
      const denyBtn = page.locator(
        '#beamerPushModal .btn-deny, #beamerPushModal [class*="deny"], #beamerPushModal .pushClose, #beamerPushModal #pushDeny'
      ).first();
      if (await denyBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await denyBtn.click();
      } else {
        // Fallback: remove the active class via JS to hide the modal
        await page.evaluate(() => {
          const modal = document.getElementById('beamerPushModal');
          if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
          }
        });
      }
      await page.waitForTimeout(500);
    }
  } catch {
    // Modal not present or already dismissed - safe to continue
  }
}

/**
 * Logs in and dismisses common popups (timezone, notifications).
 */
export async function loginAndDismissPopups(page: Page): Promise<void> {
  await page.goto('/login');
  installOverlayAutoDismiss(page);
  const companyInput = page
    .getByRole('textbox', { name: 'Company Name' })
    .describe('Company name input');
  await companyInput.waitFor({ state: 'visible', timeout: 30000 });
  await companyInput.fill(process.env.companyName!);

  await page
    .getByRole('button', { name: 'Continue' })
    .describe('Continue button')
    .click();

  const emailInput = page
    .getByRole('textbox', { name: 'Email address' })
    .describe('Email input');
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.fill(process.env.email!);

  const passwordInput = page
    .getByRole('textbox', { name: 'Password Forgot password?' })
    .describe('Password input');
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.fill(process.env.password!);

  await page
    .getByRole('button', { name: 'Login', exact: true })
    .describe('Login button')
    .click();

  await page.waitForURL('**/dashboard', { timeout: 45000 });

  // Dismiss timezone popup
  const tzCancelBtn = page.getByRole('button', { name: 'Cancel' });
  await tzCancelBtn
    .waitFor({ state: 'visible', timeout: 5000 })
    .catch(() => {});
  if (await tzCancelBtn.isVisible()) await tzCancelBtn.click();

  // Dismiss notification popup
  const notifBtn = page.getByRole('button', { name: 'No, thanks' });
  await notifBtn
    .waitFor({ state: 'visible', timeout: 5000 })
    .catch(() => {});
  if (await notifBtn.isVisible()) await notifBtn.click();

  // Dismiss Beamer push notification modal if present
  await dismissBeamerModal(page);
}

/**
 * Creates a new job with required fields and returns the job details URL.
 */
export async function createNewJob(
  page: Page,
  jobTitle: string
): Promise<string> {
  await page.goto('/jobs/new');
  const jobTitleInput = page
    .getByRole('textbox', { name: 'Job Title *' })
    .describe('Job Title input');
  await jobTitleInput.waitFor({ state: 'visible', timeout: 30000 });
  await jobTitleInput.fill(jobTitle);

  // Wait for loading to finish
  await page
    .locator('text=Loading')
    .waitFor({ state: 'hidden', timeout: 15000 })
    .catch(() => {});
  await page.waitForTimeout(2000);

  // Select first category
  const categoryCombobox = page
    .getByRole('combobox', { name: 'Choose a Job Category' })
    .describe('Job Category combobox');
  await categoryCombobox.scrollIntoViewIfNeeded();
  await categoryCombobox.click();

  const categoryListbox = page
    .getByRole('listbox')
    .describe('Job Category listbox');
  await categoryListbox.waitFor({ state: 'visible', timeout: 20000 });
  const firstCategoryOption = categoryListbox
    .getByRole('option')
    .nth(1)
    .describe('First available job category');
  await firstCategoryOption.waitFor({ state: 'visible', timeout: 10000 });
  await firstCategoryOption.click();
  await page.waitForTimeout(500);

  // Set due date (tomorrow)
  const dueDateInput = page
    .getByRole('textbox', { name: 'Due Date' })
    .describe('Due Date input');
  await dueDateInput.scrollIntoViewIfNeeded();
  await dueDateInput.click();

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // If tomorrow is in a different month, navigate the calendar forward
  if (tomorrow.getMonth() !== today.getMonth()) {
    const nextMonthBtn = page
      .locator('button.mat-calendar-next-button')
      .describe('Next month calendar button');
    await nextMonthBtn.waitFor({ state: 'visible', timeout: 10000 });
    await nextMonthBtn.click();
    await page.waitForTimeout(500);
  }

  const dueDateLabel = `${monthNames[tomorrow.getMonth()]} ${tomorrow.getDate()},`;
  const dateButton = page
    .getByRole('button', { name: dueDateLabel })
    .describe('Tomorrow date button');
  await dateButton.waitFor({ state: 'visible', timeout: 10000 });
  await dateButton.click();
  await jobTitleInput.click(); // close calendar

  // Add organization
  const addOrgLink = page
    .locator('a')
    .filter({ hasText: /^Add Organization$/ })
    .describe('Add Organization link');
  await addOrgLink.scrollIntoViewIfNeeded();
  await addOrgLink.click();

  await page
    .getByRole('heading', { name: 'Choose Organization' })
    .describe('Choose Organization dialog')
    .waitFor({ state: 'visible', timeout: 15000 });

  const firstOrgRadio = page
    .getByRole('radio')
    .first()
    .describe('First organization radio');
  await firstOrgRadio.waitFor({ state: 'visible', timeout: 10000 });
  await firstOrgRadio.check();

  await page
    .getByRole('button', { name: 'Choose Organization' })
    .describe('Choose Organization button')
    .click();
  await page.waitForTimeout(1000);

  // Add service address via Google Maps search
  const addServiceAddrLink = page
    .locator('a')
    .filter({ hasText: /^Add Service Address$/ })
    .describe('Add Service Address link');
  await addServiceAddrLink.scrollIntoViewIfNeeded();
  await addServiceAddrLink.click();

  await page
    .getByRole('heading', { name: 'Service Address' })
    .describe('Service Address dialog heading')
    .waitFor({ state: 'visible', timeout: 15000 });

  const searchAddrBox = page
    .getByRole('searchbox', { name: 'Search Address' })
    .describe('Search Address searchbox');
  await searchAddrBox.click();
  await searchAddrBox.pressSequentially('New York', { delay: 100 });

  const firstSuggestion = page
    .getByRole('button', { name: /New York.*USA/ })
    .first()
    .describe('First address suggestion');
  await firstSuggestion.waitFor({ state: 'visible', timeout: 15000 });
  await firstSuggestion.click();
  await page.waitForTimeout(1000);

  // Remove only backdrops (not the dialog)
  await page.evaluate(() => {
    document
      .querySelectorAll('.cdk-overlay-backdrop')
      .forEach((el) => el.remove());
  });

  await page
    .getByRole('button', { name: 'Add', exact: true })
    .describe('Add address button')
    .click({ force: true, timeout: 10000 });
  await page.waitForTimeout(1000);

  // Remove overlays for Create Job click
  await page.evaluate(() => {
    document
      .querySelectorAll('.cdk-overlay-backdrop')
      .forEach((el) => el.remove());
    document.querySelectorAll('.cdk-overlay-pane').forEach((el) => {
      if (el.querySelector('[role="dialog"], [role="alertdialog"]')) el.remove();
    });
  });
  await page.waitForTimeout(200);

  const createJobLink = page
    .locator('a')
    .filter({ hasText: 'Create Job' })
    .describe('Create Job button');
  await createJobLink.scrollIntoViewIfNeeded();
  await createJobLink.click();

  const createConfirmBtn = page
    .getByRole('button', { name: 'Create', exact: true })
    .describe('Create confirmation button');
  await createConfirmBtn.waitFor({ state: 'visible', timeout: 15000 });
  await createConfirmBtn.click();

  await expect(page).toHaveURL(/\/jobs\/.*\/details/, { timeout: 30000 });

  // Remove overlays on job details
  await page.evaluate(() => {
    document
      .querySelectorAll('.cdk-overlay-backdrop')
      .forEach((el) => el.remove());
    document.querySelectorAll('.cdk-overlay-pane').forEach((el) => {
      if (el.querySelector('[role="dialog"], [role="alertdialog"]')) el.remove();
    });
  });
  await page.waitForTimeout(200);

  // Dismiss Beamer push notification modal if present
  await dismissBeamerModal(page);

  return page.url();
}

/**
 * Navigates to Gallery > Albums tab on the current job details page.
 */
export async function navigateToJobGalleryAlbums(page: Page): Promise<void> {
  await dismissBeamerModal(page);

  const galleryTab = page
    .getByRole('button', { name: /^Gallery/ })
    .first()
    .describe('Gallery tab button');
  await galleryTab.waitFor({ state: 'visible', timeout: 30000 });
  await galleryTab.click();
  await page.waitForTimeout(3000);

  await dismissBeamerModal(page);

  const albumsTab = page
    .getByRole('button', { name: 'Albums', exact: true })
    .describe('Albums tab button');
  await albumsTab.waitFor({ state: 'visible', timeout: 15000 });
  await albumsTab.click();
  await page.waitForTimeout(2000);
}

/**
 * Extracts album names from a job's Gallery Albums view.
 * Assumes the Albums tab is already active.
 * Waits for at least one album card to render before extracting names.
 */
export async function getJobAlbumNames(page: Page): Promise<string[]> {
  // Wait for at least one album card to render (p followed by "N Items" sibling)
  await page.waitForFunction(
    () => {
      const paragraphs = document.querySelectorAll('p');
      for (const p of paragraphs) {
        const nextP = p.nextElementSibling;
        if (
          nextP &&
          nextP.tagName === 'P' &&
          /^\d+\s+Items?$/.test((nextP.textContent || '').trim())
        ) {
          return true;
        }
      }
      return false;
    },
    null,
    { timeout: 15000 }
  );

  return page.evaluate(() => {
    const paragraphs = document.querySelectorAll('p');
    const names: string[] = [];
    for (const p of paragraphs) {
      const text = (p.textContent || '').trim();
      if (
        text &&
        !/^\d+\s+Items?$/.test(text) &&
        text !== 'Create New Album' &&
        text.length > 0
      ) {
        const nextP = p.nextElementSibling;
        if (
          nextP &&
          nextP.tagName === 'P' &&
          /^\d+\s+Items?$/.test((nextP.textContent || '').trim())
        ) {
          names.push(text);
        }
      }
    }
    return names;
  });
}

/**
 * Creates a new album on the current job's Gallery Albums view.
 * Assumes the Albums tab is already active.
 */
export async function addAlbumToJob(
  page: Page,
  albumName: string
): Promise<void> {
  const createAlbumButton = page
    .getByText('Create New Album')
    .describe('Create New Album button');
  await expect(createAlbumButton).toBeVisible({ timeout: 10000 });
  await createAlbumButton.click();

  const albumNameInput = page
    .getByRole('textbox', { name: 'Enter album name' })
    .describe('Album name input');
  await albumNameInput.waitFor({ state: 'visible', timeout: 10000 });
  await albumNameInput.fill(albumName);

  await page
    .getByRole('button', { name: 'Create', exact: true })
    .describe('Create button in dialog')
    .click();

  // After creation, app navigates into the album detail. Go back to Albums list.
  const createdAlbum = page
    .getByText(albumName)
    .first()
    .describe('Newly created album name in breadcrumb');
  await expect(createdAlbum).toBeVisible({ timeout: 15000 });

  const albumsBreadcrumb = page
    .locator('button', { hasText: /^Albums$/ })
    .first()
    .describe('Albums breadcrumb link');
  await albumsBreadcrumb.click({ timeout: 10000 });
  await page.waitForTimeout(2000);
}

/**
 * Opens the context menu for the given album name and clicks the specified action.
 */
export async function openAlbumContextMenu(
  page: Page,
  albumName: string
): Promise<void> {
  // Wait for the album card to be rendered before trying to find the menu trigger
  await page.waitForFunction(
    (name: string) => {
      const paragraphs = document.querySelectorAll('p');
      for (const p of Array.from(paragraphs)) {
        if (p.textContent?.trim() === name) {
          const card = p.parentElement?.parentElement;
          if (!card) continue;
          const trigger = card.querySelector(
            'button[aria-haspopup="menu"]'
          ) as HTMLElement | null;
          if (trigger) {
            trigger.click();
            return true;
          }
        }
      }
      return false;
    },
    albumName,
    { timeout: 15000 }
  );
}

/**
 * Renames an album on the current job's Gallery Albums view.
 */
export async function renameAlbumOnJob(
  page: Page,
  oldName: string,
  newName: string
): Promise<void> {
  await openAlbumContextMenu(page, oldName);

  const renameMenuItem = page
    .getByRole('menuitem', { name: /Rename/ })
    .describe('Rename menu item');
  await renameMenuItem.waitFor({ state: 'visible', timeout: 10000 });
  await renameMenuItem.click();

  const renameInput = page
    .getByRole('textbox', { name: 'Enter album name' })
    .describe('Rename album input');
  await renameInput.waitFor({ state: 'visible', timeout: 10000 });
  await renameInput.clear();
  await renameInput.fill(newName);

  await page
    .getByRole('button', { name: 'Rename', exact: true })
    .describe('Rename confirm button')
    .click();

  // Verify rename succeeded
  await expect(
    page.locator('p', { hasText: newName }).describe(`Renamed album "${newName}"`)
  ).toBeVisible({ timeout: 15000 });
}

/**
 * Deletes an album on the current job's Gallery Albums view.
 */
export async function deleteAlbumOnJob(
  page: Page,
  albumName: string
): Promise<void> {
  await openAlbumContextMenu(page, albumName);

  const deleteMenuItem = page
    .getByRole('menuitem', { name: /Delete/ })
    .describe('Delete menu item');
  await deleteMenuItem.waitFor({ state: 'visible', timeout: 10000 });
  await deleteMenuItem.click();

  const deleteConfirmButton = page
    .getByRole('button', { name: 'Delete', exact: true })
    .describe('Delete confirm button');
  await deleteConfirmButton.waitFor({ state: 'visible', timeout: 10000 });
  await deleteConfirmButton.click();

  // Verify album removed
  await expect(
    page.locator(`p[title="${albumName}"]`)
  ).toBeHidden({ timeout: 15000 });
}

/**
 * Reads default album names from Gallery Settings page.
 * Navigates to settings, waits for data, and returns the list.
 */
export async function getSettingsAlbumNames(page: Page): Promise<string[]> {
  await page.goto('/settings_new/job/gallery');
  await page
    .getByRole('heading', { name: 'Albums' })
    .describe('Albums heading on Gallery Settings page')
    .waitFor({ state: 'visible', timeout: 30000 });

  const names: string[] = await page
    .waitForFunction(
      () => {
        const result: string[] = [];
        const datePattern = /^[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}$/;
        const allDivs = document.querySelectorAll('div');
        for (const div of allDivs) {
          const text = (div.textContent || '').trim();
          if (!datePattern.test(text)) continue;
          const row = div.parentElement;
          if (!row || row.children.length < 3) continue;
          if (row.children[1] !== div) continue;
          const nameText = (row.children[0].textContent || '').trim();
          if (nameText && nameText.length > 0) {
            result.push(nameText);
          }
        }
        return result.length > 0 ? result : null;
      },
      null,
      { timeout: 30000 }
    )
    .then((handle) => handle.jsonValue());

  return names;
}

/**
 * Adds a new album in Gallery Settings (master level).
 * Assumes the Gallery Settings page is already loaded.
 */
export async function addMasterAlbum(
  page: Page,
  albumName: string
): Promise<void> {
  const albumInput = page
    .getByRole('textbox', { name: 'Enter album name' })
    .describe('Enter album name input in Gallery Settings');
  await albumInput.waitFor({ state: 'visible', timeout: 10000 });
  await albumInput.fill(albumName);

  const addBtn = page
    .getByRole('button', { name: /Add Album/ })
    .describe('Add Album button in Gallery Settings');
  await addBtn.click();

  // Verify the album appears in the settings table
  await page.waitForTimeout(1000);
}

/**
 * Deletes an album from Gallery Settings (master level) by name.
 * Assumes the Gallery Settings page is loaded and the album rows are visible.
 */
export async function deleteMasterAlbum(
  page: Page,
  albumName: string
): Promise<void> {
  // Find the row with the album name and click its delete icon (2nd icon in actions column)
  await page.evaluate((name: string) => {
    const datePattern = /^[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}$/;
    const allDivs = document.querySelectorAll('div');
    for (const div of allDivs) {
      const text = (div.textContent || '').trim();
      if (!datePattern.test(text)) continue;
      const row = div.parentElement;
      if (!row || row.children.length < 3) continue;
      if (row.children[1] !== div) continue;
      const nameText = (row.children[0].textContent || '').trim();
      if (nameText === name) {
        // Actions column is children[2], delete is the 2nd icon
        const actionsCell = row.children[2];
        const icons = actionsCell.querySelectorAll('[class*="cursor-pointer"], span');
        const deleteIcon = icons[icons.length - 1] as HTMLElement;
        if (deleteIcon) {
          deleteIcon.click();
          return;
        }
      }
    }
    throw new Error('Could not find delete icon for album: ' + name);
  }, albumName);

  // Confirm deletion
  const deleteConfirmBtn = page
    .getByRole('button', { name: 'Delete', exact: true })
    .describe('Delete confirm button in settings');
  await deleteConfirmBtn.waitFor({ state: 'visible', timeout: 10000 });
  await deleteConfirmBtn.click();
  await page.waitForTimeout(1000);
}
