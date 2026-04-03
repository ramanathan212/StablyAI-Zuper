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
    // Wait for all overlay backdrops to be detached from DOM
    await page.waitForSelector('.cdk-overlay-backdrop', {
      state: 'detached',
      timeout
    });
  } catch (error) {
    // If overlay didn't detach in time, force-remove via JS
    try {
      await page.evaluate(() => {
        document.querySelectorAll('.cdk-overlay-backdrop').forEach(el => el.remove());
      });
    } catch { /* page may not be ready */ }
  }
}

/**
 * Forcibly removes all CDK overlay backdrops and overlay panes from the DOM via JavaScript.
 * This is the nuclear option when Escape/click-based dismissal fails.
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function forceRemoveOverlays(page) {
  try {
    await page.evaluate(() => {
      // Remove all backdrop elements
      document.querySelectorAll('.cdk-overlay-backdrop').forEach(el => el.remove());
      // Remove all overlay panes (the modal content containers)
      document.querySelectorAll('.cdk-overlay-pane').forEach(el => el.remove());
    });
    await page.waitForTimeout(200);
  } catch {
    // Page may not be ready or navigating
  }
}

/**
 * Clicks an element with retry logic to handle overlay interceptions
 * @param {import('@playwright/test').Locator} locator - Playwright locator
 * @param {Object} options - Click options
 */
export async function clickWithOverlayHandling(locator, options = {}) {
  const maxAttempts = 3;
  const delayBetweenAttempts = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Dismiss any overlays FIRST so they don't block visibility detection
      const page = locator.page();
      await dismissOverlays(page);
      await waitForOverlayToDisappear(page, 2000);

      // On attempt 2+, force-remove overlays via JS before trying the click
      if (attempt >= 2) {
        await forceRemoveOverlays(page);
      }

      // Now wait for the element to be visible and stable
      await locator.waitFor({ state: 'visible', timeout: 10000 });

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
      // Dismiss overlays again before retrying
      try {
        const page = locator.page();
        await dismissOverlays(page);
        await waitForOverlayToDisappear(page, 2000);
      } catch { /* ignore dismissal errors during retry */ }
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
 * Dismisses any visible overlays or modals
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function dismissOverlays(page) {
  // Dismiss browser notification popup ("NO, THANKS")
  try {
    const noThanksButton = page.getByRole('button', { name: /NO,?\s*THANKS/i });
    if (await noThanksButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await noThanksButton.click({ force: true });
      await page.waitForTimeout(500);
      console.log('Dismissed notification popup');
    }
  } catch { /* no popup */ }

  // Dismiss "Trial Period Ending Soon" or similar modal via X/close button
  try {
    const closeSelectors = [
      '.cdk-overlay-container button.close',
      '.cdk-overlay-container .close',
      '.cdk-overlay-container [aria-label="Close"]',
      '.cdk-overlay-container [class*="close"]',
      'button.close',
      '[class*="modal"] button.close',
      '[class*="modal"] .close',
    ];
    for (const sel of closeSelectors) {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btn.click({ force: true });
        await page.waitForTimeout(500);
        console.log(`Dismissed modal via ${sel}`);
        break;
      }
    }
  } catch { /* no modal */ }

  // Try pressing Escape to close any CDK modal/dialog
  try {
    const overlay = page.locator('.cdk-overlay-pane').first();
    if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      console.log('Dismissed modal via Escape');
    }
  } catch { /* no overlay pane */ }

  // Click the backdrop itself to dismiss CDK dialogs (Angular CDK closes on backdrop click)
  try {
    const backdrop = page.locator('.cdk-overlay-backdrop');
    if (await backdrop.isVisible({ timeout: 1000 }).catch(() => false)) {
      await backdrop.click({ force: true });
      await page.waitForTimeout(500);
      console.log('Clicked backdrop to dismiss overlay');
    }
  } catch { /* no backdrop */ }

  // If backdrop still visible after clicking, try Escape again
  try {
    const backdrop = page.locator('.cdk-overlay-backdrop');
    if (await backdrop.isVisible({ timeout: 500 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      console.log('Pressed Escape to dismiss remaining overlay');
    }
  } catch { /* no backdrop */ }

  // Final fallback: force-remove any remaining overlays via JS
  try {
    const backdrop = page.locator('.cdk-overlay-backdrop');
    if (await backdrop.isVisible({ timeout: 500 }).catch(() => false)) {
      await forceRemoveOverlays(page);
      console.log('Force-removed remaining overlays via JS');
    }
  } catch { /* no backdrop */ }
}
