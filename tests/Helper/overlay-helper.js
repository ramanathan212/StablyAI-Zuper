/**
 * Helper utility to handle CDK overlays and backdrop issues in tests
 * This is especially useful for CI environments where timing can be different
 */

/**
 * Waits for any CDK overlay backdrops to disappear
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {number} timeout - Maximum time to wait in milliseconds
 */
export async function waitForOverlayToDisappear(page, timeout = 5000) {
  try {
    // Wait for all overlay backdrops to be hidden (not detached - CDK keeps
    // the overlay container in the DOM permanently)
    await page.waitForSelector('.cdk-overlay-backdrop', {
      state: 'hidden',
      timeout
    });
  } catch (error) {
    // If no overlay exists or it didn't hide in time, that's fine - continue
    console.log('No overlay to wait for or overlay already hidden');
  }
}

/**
 * Forcibly removes all CDK overlay backdrops and blocking overlay panes from the DOM via JavaScript.
 * Removes backdrops and overlay panes that contain mat-dialog content.
 * Does NOT remove overlay panes used for navigation menus, dropdowns, tooltips, etc.
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function forceRemoveOverlays(page) {
  try {
    await page.evaluate(() => {
      // Remove all backdrop elements (these are always blocking)
      document.querySelectorAll('.cdk-overlay-backdrop').forEach(el => el.remove());
      // Remove overlay panes that contain mat-dialog content only
      document.querySelectorAll('.cdk-overlay-pane').forEach(el => {
        const hasDialog = el.querySelector(
          'mat-dialog-container, .mat-dialog-container, .mat-mdc-dialog-container, ' +
          '[role="dialog"], [role="alertdialog"], .modal-content'
        );
        if (hasDialog) {
          el.remove();
        }
      });
    });
    await page.waitForTimeout(200);
  } catch {
    // Page may not be ready or navigating
  }
}

/**
 * Checks whether a blocking CDK dialog (mat-dialog) is currently visible.
 * Returns true only if there is a mat-dialog-container inside a cdk-overlay-pane,
 * which means a real modal dialog is open (not just a menu/dropdown/tooltip).
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
async function hasBlockingDialog(page) {
  try {
    return await page.evaluate(() => {
      const panes = document.querySelectorAll('.cdk-overlay-pane');
      for (const pane of panes) {
        if (pane.querySelector('mat-dialog-container, .mat-dialog-container, .mat-mdc-dialog-container')) {
          // Check if the pane is actually visible
          const style = getComputedStyle(pane);
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            return true;
          }
        }
      }
      return false;
    });
  } catch {
    return false;
  }
}

/**
 * Clicks an element with retry logic to handle overlay interceptions.
 * Strategy: dismiss only actual blocking dialogs before clicking.
 * Avoids inadvertently closing menus/dropdowns that should stay open.
 * @param {import('@playwright/test').Locator} locator - Playwright locator
 * @param {Object} options - Click options
 */
export async function clickWithOverlayHandling(locator, options = {}) {
  const maxAttempts = 3;
  const delayBetweenAttempts = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const page = locator.page();

      // Dismiss blocking dialogs (mat-dialogs) on every attempt.
      // This is safe because it only targets actual modal dialogs,
      // not navigation menus or dropdowns.
      await dismissOverlays(page);
      await waitForOverlayToDisappear(page, 2000);

      // On attempt 3: force-remove overlays via JS as last resort
      if (attempt >= 3) {
        await forceRemoveOverlays(page);
      }

      // Wait for the element to be visible and stable
      await locator.waitFor({ state: 'visible', timeout: 15000 });

      // Attempt the click - use force on attempt 2+
      if (attempt >= 2) {
        await locator.click({ ...options, force: true });
      } else {
        await locator.click(options);
      }

      console.log(`Successfully clicked element on attempt ${attempt}`);
      return; // Success
    } catch (error) {
      if (attempt === maxAttempts) {
        // Last resort: force-remove overlays and use JS click
        try {
          const page = locator.page();
          await forceRemoveOverlays(page);
          await locator.evaluate(el => el.click());
          console.log('Successfully clicked element via JS evaluate on final attempt');
          return;
        } catch (jsError) {
          console.error(`Failed to click after ${maxAttempts} attempts:`, error.message);
          throw error;
        }
      }
      console.log(`Click attempt ${attempt} failed, retrying in ${delayBetweenAttempts}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
    }
  }
}

/**
 * Waits for page to be ready (no overlays, network idle, no loading spinners)
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function waitForPageReady(page) {
  // Wait for network to be idle with a timeout
  try {
    await page.waitForLoadState('networkidle', { timeout: 30000 });
  } catch (error) {
    console.log('Network idle timeout, proceeding with domcontentloaded');
    await page.waitForLoadState('domcontentloaded');
  }

  // Dismiss any overlays and wait for them to disappear
  await dismissOverlays(page);
  await waitForOverlayToDisappear(page);

  // Wait for common loading indicators to disappear
  try {
    await page.waitForSelector('.loading, .spinner, [data-loading="true"]', {
      state: 'hidden',
      timeout: 5000
    });
  } catch {
    // No loading indicators found, that's fine
  }

  console.log('Page is ready');
}

/**
 * Dismisses any visible blocking overlays or modals.
 * IMPORTANT: Only targets actual modal dialogs (mat-dialog) and known popups.
 * Does NOT press Escape or click backdrops indiscriminately, because that
 * would close navigation submenus and dropdowns that should stay open.
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function dismissOverlays(page) {
  // Dismiss browser notification popup ("No, thanks" / "NO, THANKS")
  try {
    const noThanksButton = page.getByRole('button', { name: /no,?\s*thanks/i });
    if (await noThanksButton.isVisible().catch(() => false)) {
      await noThanksButton.click({ force: true });
      await page.waitForTimeout(500);
      console.log('Dismissed notification popup');
    }
  } catch { /* no popup */ }

  // Check if a blocking mat-dialog is present
  const dialogPresent = await hasBlockingDialog(page);
  if (!dialogPresent) {
    return; // No blocking dialog - do nothing to avoid closing menus/dropdowns
  }

  console.log('Blocking dialog detected, attempting to dismiss...');

  // Strategy 1: Try clicking known dialog dismiss buttons inside the overlay
  // This handles timezone popups ("Cancel"), trial modals ("Close"), etc.
  try {
    const dismissButtonSelectors = [
      // Specific dialog buttons
      '.cdk-overlay-pane button.close',
      '.cdk-overlay-pane [aria-label="Close"]',
      'button.close',
      // Generic dismiss buttons inside dialogs - Cancel, Skip, No thanks, etc.
      '.mat-mdc-dialog-container button:has-text("Cancel")',
      '.mat-mdc-dialog-container button:has-text("Skip")',
      '.mat-mdc-dialog-container button:has-text("Close")',
      '.mat-mdc-dialog-container button:has-text("No")',
      '.mat-dialog-container button:has-text("Cancel")',
      '.mat-dialog-container button:has-text("Skip")',
      '.mat-dialog-container button:has-text("Close")',
      '.mat-dialog-container button:has-text("No")',
    ];
    for (const sel of dismissButtonSelectors) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible().catch(() => false)) {
          await btn.click({ force: true });
          await page.waitForTimeout(500);
          console.log(`Dismissed dialog via ${sel}`);
          // Check if dialog is gone
          if (!(await hasBlockingDialog(page))) {
            return;
          }
        }
      } catch { /* selector didn't match */ }
    }
  } catch { /* no dismiss button found */ }

  // Strategy 2: Try Escape key (only if dialog is still present)
  if (await hasBlockingDialog(page)) {
    try {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      console.log('Pressed Escape to dismiss dialog');
      if (!(await hasBlockingDialog(page))) {
        return;
      }
    } catch { /* Escape didn't work */ }
  }

  // Strategy 3: Click backdrop (only if dialog is still present)
  if (await hasBlockingDialog(page)) {
    try {
      const backdrop = page.locator('.cdk-overlay-backdrop');
      if (await backdrop.isVisible().catch(() => false)) {
        await backdrop.click({ force: true });
        await page.waitForTimeout(500);
        console.log('Clicked backdrop to dismiss dialog');
        if (!(await hasBlockingDialog(page))) {
          return;
        }
      }
    } catch { /* no backdrop */ }
  }

  // Strategy 4: Force-remove via JS (nuclear option)
  if (await hasBlockingDialog(page)) {
    await forceRemoveOverlays(page);
    console.log('Force-removed blocking dialog via JS');
  }
}
