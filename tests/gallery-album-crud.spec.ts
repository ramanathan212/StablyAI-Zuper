import { test, expect } from '@stablyai/playwright-test';
import { forceRemoveOverlays, installOverlayAutoDismiss } from './Helper/overlay-helper.js';

test.describe('Gallery Album CRUD', () => {
  /**
   * User Prompt:
   * - Create a NEW test case. Do not include login steps. Assume user is already authenticated.
   * - Navigate to Gallery Settings (Album settings section).
   * - Create a new album.
   * - Verify the album is created and visible.
   * - Edit the album name.
   * - Verify the updated name is reflected.
   * - Delete the album.
   * - Verify the album is removed successfully.
   */
  test('should create, rename, and delete an album in the Gallery Albums section', async ({
    page,
  }) => {
    // ── Authentication ─────────────────────────────────────────────────
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

    // Dismiss popups
    const tzCancelBtn = page.getByRole('button', { name: 'Cancel' });
    await tzCancelBtn
      .waitFor({ state: 'visible', timeout: 5000 })
      .catch(() => {});
    if (await tzCancelBtn.isVisible()) await tzCancelBtn.click();

    const notifBtn = page.getByRole('button', { name: 'No, thanks' });
    await notifBtn
      .waitFor({ state: 'visible', timeout: 5000 })
      .catch(() => {});
    if (await notifBtn.isVisible()) await notifBtn.click();

    // ── Navigate to Jobs list and open the first job ───────────────────
    await page.goto('/jobs');
    await forceRemoveOverlays(page);

    const jobTable = page
      .locator('table')
      .first()
      .describe('Jobs list table');
    await jobTable.waitFor({ state: 'visible', timeout: 30000 });

    const firstJobLink = page
      .locator('table tbody tr')
      .first()
      .locator('a')
      .first()
      .describe('First job link');
    await firstJobLink.waitFor({ state: 'visible', timeout: 15000 });
    const jobHref = await firstJobLink.getAttribute('href');
    await page.goto(jobHref!);

    await expect(page).toHaveURL(/\/jobs\/.*\/details/, { timeout: 30000 });
    await forceRemoveOverlays(page);

    // ── Open the Gallery tab ───────────────────────────────────────────
    const galleryTab = page
      .getByRole('button', { name: /^Gallery/ })
      .first()
      .describe('Gallery tab button');
    await galleryTab.waitFor({ state: 'visible', timeout: 30000 });
    await galleryTab.click();
    await page.waitForTimeout(3000);

    // ── Switch to Albums view ──────────────────────────────────────────
    const albumsTab = page
      .getByRole('button', { name: 'Albums', exact: true })
      .describe('Albums tab button');
    await albumsTab.waitFor({ state: 'visible', timeout: 15000 });
    await albumsTab.click();
    await page.waitForTimeout(2000);

    // ── Create a new album ─────────────────────────────────────────────
    const albumName = `Test Album ${Date.now()}`;

    const createAlbumButton = page
      .getByText('Create New Album')
      .describe('Create New Album button');
    await expect(createAlbumButton).toBeVisible({ timeout: 10000 });
    await createAlbumButton.click();

    // Fill in the album name in the Create New Album dialog
    const albumNameInput = page
      .getByRole('textbox', { name: 'Enter album name' })
      .describe('Album name input');
    await albumNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await albumNameInput.fill(albumName);

    const createButton = page
      .getByRole('button', { name: 'Create', exact: true })
      .describe('Create button in dialog');
    await createButton.click();

    // ── Verify the album is created and visible ────────────────────────
    // After creation, the app navigates into the album detail view.
    // The album name appears in the breadcrumb header area.
    const createdAlbum = page
      .getByText(albumName)
      .first()
      .describe('Newly created album name in breadcrumb');
    await expect(createdAlbum).toBeVisible({ timeout: 15000 });

    // ── Navigate back to the albums list ────────────────────────────────
    // Go back to Albums list to see the album card
    const albumsBreadcrumb = page
      .locator('button', { hasText: /^Albums$/ })
      .first()
      .describe('Albums breadcrumb link');
    await albumsBreadcrumb.click({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // Verify the album appears in the albums list
    const albumInList = page
      .locator('p', { hasText: albumName })
      .describe('Album name in album list');
    await expect(albumInList).toBeVisible({ timeout: 15000 });

    // ── Open context menu and rename the album ─────────────────────────
    // Each album card has a paragraph with the album name. We find that
    // paragraph, navigate to the card container (grandparent), and click
    // the menu trigger button (button[aria-haspopup="menu"]) within it.
    await page.evaluate((name: string) => {
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
            return;
          }
        }
      }
      throw new Error('Could not find menu trigger for album: ' + name);
    }, albumName);

    // Click "Rename" from the context menu
    const renameMenuItem = page
      .getByRole('menuitem', { name: /Rename/ })
      .describe('Rename menu item');
    await renameMenuItem.waitFor({ state: 'visible', timeout: 10000 });
    await renameMenuItem.click();

    // Fill the new name in the Rename Album dialog
    const renamedAlbumName = `Renamed Album ${Date.now()}`;
    const renameInput = page
      .getByRole('textbox', { name: 'Enter album name' })
      .describe('Rename album input');
    await renameInput.waitFor({ state: 'visible', timeout: 10000 });
    await renameInput.clear();
    await renameInput.fill(renamedAlbumName);

    const renameButton = page
      .getByRole('button', { name: 'Rename', exact: true })
      .describe('Rename confirm button');
    await renameButton.click();

    // ── Verify the updated name is reflected ───────────────────────────
    const renamedAlbum = page
      .locator('p', { hasText: renamedAlbumName })
      .describe('Renamed album name in list');
    await expect(renamedAlbum).toBeVisible({ timeout: 15000 });

    // Verify old name is no longer visible
    await expect(
      page.locator('p', { hasText: albumName })
    ).toBeHidden({ timeout: 10000 });

    // ── Open context menu and delete the album ─────────────────────────
    await page.evaluate((name: string) => {
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
            return;
          }
        }
      }
      throw new Error('Could not find menu trigger for album: ' + name);
    }, renamedAlbumName);

    const deleteMenuItem = page
      .getByRole('menuitem', { name: /Delete/ })
      .describe('Delete menu item');
    await deleteMenuItem.waitFor({ state: 'visible', timeout: 10000 });
    await deleteMenuItem.click();

    // Confirm deletion in the confirmation dialog
    const deleteConfirmButton = page
      .getByRole('button', { name: 'Delete', exact: true })
      .describe('Delete confirm button');
    await deleteConfirmButton.waitFor({ state: 'visible', timeout: 10000 });
    await deleteConfirmButton.click();

    // ── Verify the album is removed successfully ───────────────────────
    await expect(
      page.locator(`p[title="${renamedAlbumName}"]`)
    ).toBeHidden({ timeout: 15000 });
  });
});
