import { test as base } from '@playwright/test';
import { createCacheUtils } from '../utils/cache-utils.js';

/**
 * Extended test fixture with cache clearing capabilities
 * Use this in your tests to get automatic cache clearing functionality
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
   * Auto-clear cache before each test
   * Tests using this will have cache cleared automatically before running
   * Usage: async ({ page, autoClearCache }) => { ... }
   */
  autoClearCache: async ({ page }, use) => {
    const cacheUtils = createCacheUtils(page);
    await cacheUtils.clearAllCache();
    console.log('🧹 Auto cache clearing completed before test');
    await use();
  },
});

export { expect } from '@playwright/test';
