import { test as base } from '@playwright/test';
import { createCacheUtils } from '../utils/cache-utils.js';

/**
 * Extended test fixture with cache clearing and automatic popup handling.
 */
export const test = base.extend({
  /**
   * Cache utilities available in every test
   * Usage: async ({ page, cacheUtils }) => { await cacheUtils.clearAllCache(); }
   */
  cacheUtils: async ({ page }, use) => {
    const cacheUtils = createCacheUtils(page);
    await use(cacheUtils);
  },

  /**
   * Auto-clear cache AND start the background popup handler before each test.
   * Tests using this will have cache cleared and popups auto-dismissed automatically.
   * Usage: async ({ page, autoClearCache }) => { ... }
   */
  autoClearCache: async ({ page }, use) => {
    // Navigate to the app first so localStorage/sessionStorage clearing targets
    // the correct origin (not about:blank) and Playwright UI shows the app.
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch {
      // Continue even if navigation fails — cache clearing will still proceed
    }
    const cacheUtils = createCacheUtils(page);
    await cacheUtils.clearAllCache();
    console.log('🧹 Auto cache clearing completed before test');
    await use();
  },
});

export { expect } from '@playwright/test';
