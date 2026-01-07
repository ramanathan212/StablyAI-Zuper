# Cache Management Guide

This guide explains how to manage caches in the Playwright test suite to avoid stale data and ensure clean test runs.

## Quick Start

### Clear Cache Before Running Tests

```bash
# Clear cache and run tests
npm run test:clean

# Clear all caches including auth state
npm run test:fresh
```

## Available Commands

### 1. Clear Cache Only

```bash
# Clear test results and playwright cache
npm run clear-cache

# Clear all caches including authentication
npm run clear-cache:all
```

### 2. Run Tests with Cache Clearing

```bash
# Clear cache, then run tests (auth preserved)
npm run test:clean

# Clear ALL caches including auth, then run tests
npm run test:fresh
```

### 3. Manual Script Usage

```bash
# Basic cache clear
node scripts/clear-cache.js

# Clear including authentication
node scripts/clear-cache.js --auth

# Clear everything
node scripts/clear-cache.js --all
```

## What Gets Cleared?

### Standard Cache Clear (`npm run clear-cache`)
- ✓ `test-results/` - Test execution results
- ✓ `playwright-report/` - HTML test reports
- ✓ `.cache/` - Temporary cache files
- ✓ `.eslintcache` - ESLint cache
- ✗ Authentication state (preserved)

### Full Cache Clear (`npm run clear-cache:all`)
- ✓ Everything from standard clear
- ✓ `tests/.auth/` - Authentication state (requires re-login)

## Automatic Cache Prevention

The `playwright.config.js` has been configured to minimize caching:

```javascript
launchOptions: {
  args: [
    '--disable-cache',
    '--disable-application-cache',
    '--disable-offline-load-stale-cache',
    '--disk-cache-size=0'
  ]
}
```

This ensures:
- Browser cache is disabled
- Application cache is disabled
- Service workers are blocked
- No disk cache is created

## When to Clear Cache

### You Should Clear Cache When:

1. **Tests are failing unexpectedly** - Stale cache might contain old data
2. **After code changes** - Page objects or selectors have been updated
3. **Authentication issues** - Use `npm run test:fresh`
4. **Inconsistent test results** - Different results on different runs
5. **Before CI/CD runs** - Ensure clean environment
6. **After updating dependencies** - Playwright or Node modules updated

### Example Scenarios:

```bash
# Scenario 1: Updated page object selectors
npm run clear-cache
npx playwright test

# Scenario 2: Login issues or auth errors
npm run test:fresh

# Scenario 3: Quick test after small change
npx playwright test  # Auth cache helps speed up tests

# Scenario 4: Complete fresh start
npm run clear-cache:all
npx playwright test
```

## Best Practices

### 1. Regular Development
```bash
# Normal test runs (uses cached auth)
npx playwright test
```

### 2. After Major Changes
```bash
# Clear cache before testing
npm run test:clean
```

### 3. Troubleshooting
```bash
# Complete fresh start
npm run test:fresh
```

### 4. CI/CD Pipeline
```yaml
# In your CI/CD config
- run: npm run clear-cache:all
- run: npx playwright test
```

## Troubleshooting Cache Issues

### Issue: Tests pass locally but fail in CI

**Solution:** Ensure CI clears cache before running
```bash
npm run clear-cache:all
npx playwright test
```

### Issue: Stale selectors or old page data

**Solution:** Clear browser cache
```bash
npm run clear-cache
```

### Issue: Authentication keeps failing

**Solution:** Clear auth state and re-authenticate
```bash
npm run test:fresh
```

### Issue: Node modules seem corrupted

**Solution:** Clear node_modules and reinstall
```bash
rm -rf node_modules package-lock.json
npm install
npm run clear-cache:all
npx playwright test
```

## Cache Directory Structure

```
Playwrite-Automation/
├── test-results/          # Test execution results (cleared)
├── playwright-report/     # HTML reports (cleared)
├── tests/.auth/          # Auth state (optional clear)
├── .cache/               # Temporary cache (cleared)
└── .eslintcache         # ESLint cache (cleared)
```

## Integration with Global Setup

The `global-setup.js` automatically:
- Creates a fresh browser context
- Logs in once
- Saves authentication state
- Reuses auth across test runs

This means:
- **Without clearing auth**: Tests start authenticated (faster)
- **After clearing auth**: Global setup re-authenticates (slower, but fresh)

## Performance Considerations

| Command | Speed | Freshness | Use Case |
|---------|-------|-----------|----------|
| `npx playwright test` | ⚡⚡⚡ | Medium | Regular development |
| `npm run test:clean` | ⚡⚡ | High | After code changes |
| `npm run test:fresh` | ⚡ | Highest | Troubleshooting |

## Automated Cache Clearing

To automatically clear cache before every test run, you can modify `package.json`:

```json
{
  "scripts": {
    "test": "npm run clear-cache && npx playwright test"
  }
}
```

**Note:** This will make tests slower but guarantees fresh state.

## Additional Tips

1. **Use `.gitignore`** - Cache directories are already ignored
2. **Monitor cache size** - Large test-results can slow down IDE
3. **Clear regularly** - Weekly cache clears during development
4. **Document issues** - Note when cache clearing fixed an issue

## Questions?

If cache issues persist:
1. Clear ALL caches: `npm run clear-cache:all`
2. Remove node_modules: `rm -rf node_modules && npm install`
3. Clear Playwright browsers: `npx playwright uninstall && npx playwright install`
4. Check browser DevTools for application cache/storage

---

**Last Updated:** 2025-12-23
