# Quick Reference - Cache Management

## Common Commands

### Running Tests

```bash
# Normal test run (with cached auth)
npx playwright test

# Test with cache cleared (keeps auth)
npm run test:clean

# Test with fresh start (clears everything)
npm run test:fresh

# Test specific file
npx playwright test tests/complete-vendor-mr-po-flow-refactored.spec.js

# Test with UI mode
npx playwright test --ui
```

### Cache Management

```bash
# Clear test results only
npm run clear-cache

# Clear including auth state
npm run clear-cache -- --auth

# Clear everything
npm run clear-cache:all
```

## When to Use Each Command

| Scenario | Command | Why |
|----------|---------|-----|
| Regular development | `npx playwright test` | Fast, uses cached auth |
| After code changes | `npm run test:clean` | Fresh cache, keeps auth |
| Login issues | `npm run test:fresh` | Complete fresh start |
| CI/CD pipeline | `npm run clear-cache:all && npx playwright test` | Guaranteed clean state |

## Troubleshooting

### Problem: "Could not find checkbox for product"
**Solution:** Might be old cached selectors
```bash
npm run clear-cache
npx playwright test
```

### Problem: Authentication fails repeatedly
**Solution:** Clear auth state
```bash
npm run test:fresh
```

### Problem: Test results seem cached
**Solution:** Clear test results
```bash
npm run clear-cache
```

### Problem: Browser behaving strangely
**Solution:** Full browser reset
```bash
npx playwright uninstall chromium
npx playwright install chromium
npm run test:fresh
```

## Cache Configuration

The project is configured to minimize caching:
- ✅ Browser cache disabled
- ✅ Application cache disabled
- ✅ Service workers blocked
- ✅ Disk cache set to 0

See `playwright.config.js` for details.

## Files Created

- `scripts/clear-cache.js` - Cache clearing script
- `CACHE-MANAGEMENT.md` - Detailed documentation
- `QUICK-REFERENCE.md` - This file

## npm Scripts Added

```json
{
  "test:clean": "npm run clear-cache && npx playwright test",
  "test:fresh": "npm run clear-cache -- --auth && npx playwright test",
  "clear-cache": "node scripts/clear-cache.js",
  "clear-cache:all": "node scripts/clear-cache.js --all"
}
```
