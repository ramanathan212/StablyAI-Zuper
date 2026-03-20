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
    // Wait for all overlay backdrops to be hidden
    await page.waitForSelector('.cdk-overlay-backdrop', {
      state: 'hidden',
      timeout
    });
  } catch (error) {
    // If no overlay exists, that's fine - continue
    console.log('No overlay to wait for or overlay already hidden');
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
      // Wait for the element to be visible and stable
      await locator.waitFor({ state: 'visible', timeout: 10000 });

      // Dismiss any overlays that may be blocking
      const page = locator.page();
      await dismissOverlays(page);
      await waitForOverlayToDisappear(page, 2000);

      // Attempt the click with force option on final attempt
      if (attempt === maxAttempts) {
        await locator.click({ ...options, force: true });
      } else {
        await locator.click(options);
      }

      console.log(`✓ Successfully clicked element on attempt ${attempt}`);
      return; // Success
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error(`✗ Failed to click after ${maxAttempts} attempts:`, error.message);
        throw error;
      }
      console.log(`⚠ Click attempt ${attempt} failed, retrying in ${delayBetweenAttempts}ms...`);
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
    console.log('⚠ Network idle timeout, proceeding with domcontentloaded');
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

  console.log('✓ Page is ready');
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
      await noThanksButton.click();
      await page.waitForTimeout(500);
      console.log('✓ Dismissed notification popup');
    }
  } catch { /* no popup */ }

  // Dismiss "Trial Period Ending Soon" or similar modal via X/close button
  try {
    // Try multiple selectors for the close button
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
        console.log(`✓ Dismissed modal via ${sel}`);
        break;
      }
    }
  } catch { /* no modal */ }

  // Try pressing Escape as final fallback for any modal
  try {
    const overlay = page.locator('.cdk-overlay-pane').first();
    if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      console.log('✓ Dismissed modal via Escape');
    }
  } catch { /* no overlay pane */ }

  // Dismiss any remaining overlay backdrop
  try {
    const backdrop = page.locator('.cdk-overlay-backdrop');
    if (await backdrop.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      console.log('✓ Dismissed overlay via Escape');
    }
  } catch {
    // No overlay to dismiss
  }
}
