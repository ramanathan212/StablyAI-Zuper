# Cache Clearing Implementation Guide

## Overview
Cache clearing is now implemented across all tests using CDP (Chrome DevTools Protocol) for Chromium and standard methods for all browsers.

## Files Created
- `tests/utils/cache-utils.js` - Core cache clearing utilities
- `tests/fixtures/cache-fixtures.js` - Test fixtures for automatic cache clearing

---

## Method 1: Using Cache Fixtures (Recommended for Tests)

### Auto-clear cache before EVERY test:

```javascript
// Import the extended test with cache clearing
import { test, expect } from './fixtures/cache-fixtures.js';

test('my test with auto cache clearing', async ({ page, autoClearCache }) => {
  // Cache is automatically cleared before this test runs
  await page.goto('https://uat.zuperpro.com');
  // Your test code...
});
```

### Manual cache clearing in tests:

```javascript
import { test, expect } from './fixtures/cache-fixtures.js';

test('my test with manual cache control', async ({ page, cacheUtils }) => {
  // Clear cache at specific points
  await cacheUtils.clearAllCache();

  await page.goto('https://uat.zuperpro.com');

  // Clear cache again if needed
  await cacheUtils.clearCacheViaCDP(); // Chromium only

  // Your test code...
});
```

---

## Method 2: Using Cache Utils Directly in Page Objects

### In any Page Object (e.g., PurchaseOrderPage.js):

```javascript
import { CacheUtils } from '../utils/cache-utils.js';

export class MyPage {
  constructor(page) {
    this.page = page;
    this.cacheUtils = new CacheUtils(page);
  }

  async performActionWithCacheClear() {
    await this.cacheUtils.clearAllCache();
    // Your action code...
  }
}
```

---

## Method 3: Direct Import in Any Test File

```javascript
import { test, expect } from '@playwright/test';
import { createCacheUtils } from './utils/cache-utils.js';

test('direct cache clearing', async ({ page }) => {
  const cacheUtils = createCacheUtils(page);

  // Clear all cache
  await cacheUtils.clearAllCache();

  // Or use specific methods
  await cacheUtils.clearCacheViaCDP(); // Chromium only
  await cacheUtils.clearBrowserStorage(); // All browsers
  await cacheUtils.hardReload(); // Hard reload without cache

  await page.goto('https://uat.zuperpro.com');
});
```

---

## Available Cache Clearing Methods

### 1. `clearCacheViaCDP()`
- **Works on:** Chromium only (Chrome, Edge)
- **Clears:** Browser cache and cookies via Chrome DevTools Protocol
- **Usage:** Most aggressive cache clearing for Chromium

```javascript
await cacheUtils.clearCacheViaCDP();
```

### 2. `clearBrowserStorage()`
- **Works on:** All browsers (Chromium, Firefox, WebKit)
- **Clears:** Cookies, localStorage, sessionStorage
- **Usage:** Works everywhere, but less aggressive than CDP

```javascript
await cacheUtils.clearBrowserStorage();
```

### 3. `clearAllCache()` ⭐ **Recommended**
- **Works on:** All browsers
- **Clears:** Everything (CDP for Chromium + storage for all)
- **Usage:** Most comprehensive option

```javascript
await cacheUtils.clearAllCache();
```

### 4. `hardReload()`
- **Works on:** All browsers
- **Does:** Reloads page bypassing cache
- **Usage:** When you just need to refresh without cache

```javascript
await cacheUtils.hardReload();
```

### 5. `clearCacheAndReload()`
- **Works on:** All browsers
- **Does:** Clears all cache then reloads page
- **Usage:** One-shot cache clear + reload

```javascript
await cacheUtils.clearCacheAndReload();
```

---

## Example: Update Your Existing Tests

### Before:
```javascript
import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('https://uat.zuperpro.com');
  // test code...
});
```

### After (with auto cache clearing):
```javascript
import { test, expect } from './fixtures/cache-fixtures.js';

test('my test', async ({ page, autoClearCache }) => {
  // Cache automatically cleared before test starts
  await page.goto('https://uat.zuperpro.com');
  // test code...
});
```

### After (with manual control):
```javascript
import { test, expect } from './fixtures/cache-fixtures.js';

test('my test', async ({ page, cacheUtils }) => {
  await page.goto('https://uat.zuperpro.com');

  // Clear cache at a specific point
  await cacheUtils.clearAllCache();

  // Continue testing with fresh cache
  await page.goto('https://uat.zuperpro.com');
});
```

---

## Browser-Specific Notes

### Chromium (Chrome, Edge)
- Uses CDP for most aggressive cache clearing
- All methods work
- Recommended: `clearAllCache()`

### Firefox
- Uses browser preferences (configured in playwright.config.js)
- CDP methods will skip gracefully
- Uses `clearBrowserStorage()` instead

### WebKit (Safari)
- Uses launch args (configured in playwright.config.js)
- CDP methods will skip gracefully
- Uses `clearBrowserStorage()` instead

---

## Configuration Already Applied

Your `playwright.config.js` already has cache clearing configured at launch:

- **Chromium:** 7 cache-disabling flags
- **Firefox:** 4 cache-disabling preferences
- **WebKit:** 2 cache-disabling flags
- **All browsers:** Service workers blocked

The utilities in this guide provide **runtime** cache clearing on top of the launch configuration.

---

## Quick Reference

| Use Case | Method | Import |
|----------|--------|--------|
| Auto-clear before every test | `autoClearCache` fixture | `from './fixtures/cache-fixtures.js'` |
| Manual clearing in tests | `cacheUtils` fixture | `from './fixtures/cache-fixtures.js'` |
| Page object methods | `new CacheUtils(page)` | `from '../utils/cache-utils.js'` |
| Direct in test | `createCacheUtils(page)` | `from './utils/cache-utils.js'` |

---

## Example: Complete Test with Cache Clearing

```javascript
import { test, expect } from './fixtures/cache-fixtures.js';
import { JobPage } from './pages/JobPage.js';

test.describe('Job Workflow with Cache Clearing', () => {
  test('create job with fresh cache', async ({ page, autoClearCache }) => {
    // Cache automatically cleared before test
    const jobPage = new JobPage(page);

    await page.goto('https://uat.zuperpro.com/jobs');
    await jobPage.createNewJob();

    // Verify job created
    await expect(page.getByText('Job created successfully')).toBeVisible();
  });

  test('create job with manual cache control', async ({ page, cacheUtils }) => {
    const jobPage = new JobPage(page);

    // Clear cache before navigation
    await cacheUtils.clearAllCache();

    await page.goto('https://uat.zuperpro.com/jobs');
    await jobPage.createNewJob();

    // Clear cache before verification (if needed)
    await cacheUtils.clearBrowserStorage();

    await expect(page.getByText('Job created successfully')).toBeVisible();
  });
});
```
