# Authentication Setup Guide

## How It Works

This project uses **Playwright's Global Setup** to handle authentication once, avoiding repeated logins in every test.

## Setup Overview

### 1. Global Setup File ([tests/global-setup.js](tests/global-setup.js))
- Runs **once** before all tests
- Logs into the application
- Dismisses welcome notifications automatically
- Saves authentication state to `tests/.auth/user.json`
- All tests reuse this authenticated session

### 2. Playwright Config ([playwright.config.js](playwright.config.js))
```javascript
globalSetup: './tests/global-setup.js',  // Login once
use: {
  storageState: 'tests/.auth/user.json',  // Reuse session
}
```

### 3. Tests Start from Main Screen
Tests no longer need to login - they start already authenticated:

```javascript
test('Create organization', async ({ page }) => {
  await page.goto('/');  // Already logged in!
  // Your test logic here...
});
```

## Benefits

✅ **Faster Tests** - Login happens once, not per test
✅ **Cleaner Code** - No login logic in every test
✅ **Better Maintenance** - Update credentials in one place
✅ **Parallel Execution** - Tests can run in parallel without auth conflicts

## Running Tests

```bash
# First run will trigger global-setup
npx playwright test

# Subsequent runs reuse the saved authentication
npx playwright test create-org.spec.js
```

## When to Re-authenticate

The auth state expires when:
- Session timeout on the server
- Credentials change
- Cookie/storage cleared

**Solution**: Delete the auth file to force re-login:
```bash
rm -rf tests/.auth/
npx playwright test
```

## Alternative Approaches

### Option 1: beforeEach Hook (Current Method - Global)
✅ Best for: Multiple tests sharing same user
✅ Fast and efficient

### Option 2: Fixture with beforeEach (Per-test login)
```javascript
test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  // Login code here
});
```
❌ Slower - repeats for each test

### Option 3: Page Object with Login Method
```javascript
const loginPage = new LoginPage(page);
await loginPage.login(email, password);
```
❌ Still requires login per test unless using storage state

## Best Practice

**For most projects**: Use Global Setup (current approach)
**For testing login flows**: Create separate tests without storageState
**For multiple user types**: Create multiple auth files (admin.json, user.json, etc.)

## Example: Multiple User Types

```javascript
// global-setup-admin.js - saves to admin.json
// global-setup-user.js - saves to user.json

// playwright.config.js
projects: [
  {
    name: 'admin-tests',
    use: { storageState: 'tests/.auth/admin.json' },
  },
  {
    name: 'user-tests',
    use: { storageState: 'tests/.auth/user.json' },
  },
]
```
