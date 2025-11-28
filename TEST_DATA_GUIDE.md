# Test Data Management Guide

## Overview

All test data is now centralized in [tests/test-data.js](tests/test-data.js), making it easy to maintain and update test configurations across all test files.

## Architecture

### 1. Centralized Test Data ([tests/test-data.js](tests/test-data.js))

All test data is stored in a single exportable object:

```javascript
export const testData = {
  login: { ... },           // Login credentials
  organization: { ... },    // Organization data
  customer: { ... },        // Customer/Contact data
  vendor: { ... },          // Vendor data
  materialRequest: { ... }, // Material request data
  purchaseOrder: { ... },   // Purchase order data
  jobClone: { ... }         // Job clone data
};
```

### 2. Global Authentication ([tests/global-setup.js](tests/global-setup.js))

**Features:**
- Logs in once before all tests
- Saves authentication state to `tests/.auth/user.json`
- Uses centralized test data from `test-data.js`
- Exports reusable `loginToApplication()` function

**Key Function:**
```javascript
export async function loginToApplication(page, credentials)
```

This function can be imported and reused in any test that needs manual login.

### 3. Test Files

#### Organization Tests ([tests/create-org.spec.js](tests/create-org.spec.js))
- Uses `testData.organization` for all organization details
- No login required - uses global authentication
- Clean, maintainable structure

#### Customer Tests ([tests/create-customer.spec.js](tests/create-customer.spec.js))
- Uses `testData.customer` for all customer details
- No login required - uses global authentication
- Structured with helper functions

## Usage Examples

### Using Test Data in Your Tests

```javascript
import { test, expect } from '@playwright/test';
import { testData } from './test-data.js';

test('My test', async ({ page }) => {
  // Access organization data
  const orgName = testData.organization.name;
  const orgEmail = testData.organization.email;

  // Access customer data
  const customerFirstName = testData.customer.firstName;
  const customerEmail = testData.customer.email;

  // Your test logic here...
});
```

### Using the Login Function (If Needed)

If you need to login manually in a specific test:

```javascript
import { loginToApplication } from './global-setup.js';
import { testData } from './test-data.js';

test('Manual login test', async ({ page }) => {
  // Login manually with different credentials
  await loginToApplication(page, testData.login);

  // Or with custom credentials
  await loginToApplication(page, {
    companyName: 'other-company',
    email: 'other@email.com',
    password: 'password123'
  });
});
```

## File Structure

```
tests/
├── global-setup.js         # Global authentication setup
├── test-data.js           # Centralized test data
├── create-org.spec.js     # Organization test (uses testData)
├── create-customer.spec.js # Customer test (uses testData)
├── .auth/
│   └── user.json          # Saved authentication state (gitignored)
└── ...
```

## Benefits

### ✅ Single Source of Truth
- All test data in one place
- Easy to update and maintain
- No duplication across tests

### ✅ Reusable Functions
- `loginToApplication()` can be used anywhere
- Helper functions in tests are modular

### ✅ Global Authentication
- Login once, run many tests
- Much faster test execution
- Reduced network overhead

### ✅ Easy Configuration
- Change data in one place
- Tests automatically pick up changes
- Supports dynamic data (using Date.now())

## Modifying Test Data

### Static Data
For tests that need consistent data:

```javascript
organization: {
  name: 'UAT Validation',
  email: 'uatvalidation@gmail.com',
  // ...
}
```

### Dynamic Data
For tests that need unique data each run:

```javascript
vendor: {
  name: `Test Vendor ${Date.now()}`,
  email: `vendor${Date.now()}@test.com`,
  // ...
}
```

## Adding New Test Data

1. Open [tests/test-data.js](tests/test-data.js)
2. Add your new data section:

```javascript
export const testData = {
  // Existing data...

  // Your new data
  myNewData: {
    field1: 'value1',
    field2: 'value2',
    nestedData: {
      subField: 'subValue'
    }
  }
};
```

3. Use it in your tests:

```javascript
import { testData } from './test-data.js';

test('My test', async ({ page }) => {
  await page.fill('#field', testData.myNewData.field1);
});
```

## Best Practices

### ✅ DO:
- Import testData at the top of your test files
- Use descriptive property names
- Group related data together
- Use dynamic data when uniqueness is required
- Keep sensitive data in environment variables (see below)

### ❌ DON'T:
- Hardcode test data in test files
- Duplicate data across files
- Store real credentials in test-data.js
- Mix test logic with data definitions

## Environment Variables (Future Enhancement)

For sensitive data like passwords, consider using environment variables:

```javascript
// test-data.js
export const testData = {
  login: {
    companyName: 'zuper-pro',
    email: process.env.TEST_EMAIL || 'vignesh.s@zuper.co',
    password: process.env.TEST_PASSWORD || 'Vicky@123'
  }
};
```

Then create a `.env` file (add to .gitignore):
```
TEST_EMAIL=vignesh.s@zuper.co
TEST_PASSWORD=Vicky@123
```

## Running Tests

All tests now use the centralized data automatically:

```bash
# Run all tests
npx playwright test

# Run specific test
npx playwright test create-org.spec.js
npx playwright test create-customer.spec.js

# Run with UI
npx playwright test --ui

# Run in headed mode
npx playwright test --headed
```

## Troubleshooting

### Authentication State Expired
If tests fail with authentication errors:

```bash
# Delete auth state and re-run
rm -rf tests/.auth/
npx playwright test
```

### Test Data Not Updating
Make sure you're importing correctly:

```javascript
// ✅ Correct
import { testData } from './test-data.js';

// ❌ Wrong
import testData from './test-data.js';
```

### Can't Access Nested Data
Use dot notation:

```javascript
// ✅ Correct
testData.organization.serviceAddress.search

// ❌ Wrong
testData.organization[serviceAddress][search]
```

## Summary

Your test suite now has:
1. **Centralized test data** in `test-data.js`
2. **Global authentication** in `global-setup.js`
3. **Reusable login function** exported from global-setup
4. **Clean test files** using imported data
5. **Easy maintenance** - update once, apply everywhere

All tests are now more maintainable, faster, and follow best practices! 🎉
