/**
 * Cache clearing utilities for Playwright tests
 */

export class CacheUtils {
  constructor(page) {
    this.page = page;
  }

  /**
   * Clear browser cache via CDP (Chrome DevTools Protocol)
   * Only works with Chromium-based browsers
   */
  async clearCacheViaCDP() {
    try {
      const client = await this.page.context().newCDPSession(this.page);
      await client.send('Network.clearBrowserCache');
      await client.send('Network.clearBrowserCookies');
      await client.detach();
      console.log('✓ Cache cleared via CDP (Chromium)');
    } catch (error) {
      console.log('⚠️  CDP cache clearing not available (likely not Chromium browser):', error.message);
    }
  }

  /**
   * Clear cookies, localStorage, and sessionStorage
   * Works across all browsers
   */
  async clearBrowserStorage() {
    try {
      // Clear cookies
      await this.page.context().clearCookies();

      // Clear localStorage and sessionStorage
      await this.page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      console.log('✓ Browser storage, cookies cleared');
    } catch (error) {
      console.error('❌ Failed to clear browser storage:', error.message);
    }
  }

  /**
   * Comprehensive cache clearing (CDP + Storage)
   * Uses CDP for Chromium, falls back to storage clearing for other browsers
   */
  async clearAllCache() {
    await this.clearCacheViaCDP();
    await this.clearBrowserStorage();
    console.log('✓ All cache clearing completed');
  }

  /**
   * Hard reload the page without cache
   */
  async hardReload() {
    await this.page.reload({ waitUntil: 'networkidle' });
    console.log('✓ Page hard reloaded');
  }

  /**
   * Clear cache and hard reload in one operation
   */
  async clearCacheAndReload() {
    await this.clearAllCache();
    await this.hardReload();
    console.log('✓ Cache cleared and page reloaded');
  }
}

/**
 * Helper function to create CacheUtils instance
 */
export function createCacheUtils(page) {
  return new CacheUtils(page);
}
