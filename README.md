# Playwright Automation - Vendor, MR, PO Flow

This project contains automated tests for the complete Vendor, Material Request, and Purchase Order workflow in Zuper Pro.

## Project Structure

```
Playwrite-Automation/
├── tests/
│   ├── pages/
│   │   ├── LoginPage.js              # Login page object model
│   │   ├── VendorPage.js             # Vendor management page object
│   │   ├── MaterialRequestPage.js    # Material Request page object
│   │   └── PurchaseOrderPage.js      # Purchase Order page object
│   ├── test-data.js                  # Centralized test data configuration
│   ├── complete-vendor-mr-po-flow.js                    # Original test (legacy)
│   └── complete-vendor-mr-po-flow-refactored.spec.js    # Refactored test with POM
├── playwright.config.js              # Playwright configuration
└── package.json
```

## Improvements Made

### 1. **Page Object Model (POM) Pattern**
- Separated UI interactions into dedicated page classes
- Improved maintainability and reusability
- Better organization of selectors and actions

### 2. **Centralized Test Data**
- All test data moved to `tests/test-data.js`
- Dynamic data generation (timestamps for unique values)
- Easy to modify without touching test code

### 3. **Test Structure Improvements**
- Uses `test.step()` for better reporting
- Clear separation of test phases
- Descriptive step names

### 4. **Assertions Added**
- URL verification after navigation
- Status verification for PO closure
- Proper test validation at each step

### 5. **Configuration**
- Playwright config with proper timeouts
- Base URL configuration
- Video and screenshot on failure
- HTML and list reporters

### 6. **Better Selectors**
- More resilient selectors using roles
- Removed hardcoded IDs where possible
- Regex patterns for dynamic content

## Running the Tests

### Run in UI Mode (Interactive)
```bash
npx playwright test tests/complete-vendor-mr-po-flow-refactored.spec.js --ui
```

### Run in Headless Mode
```bash
npx playwright test tests/complete-vendor-mr-po-flow-refactored.spec.js
```

### Run in Headed Mode
```bash
npx playwright test tests/complete-vendor-mr-po-flow-refactored.spec.js --headed
```

### Debug Mode
```bash
npx playwright test tests/complete-vendor-mr-po-flow-refactored.spec.js --debug
```

### View HTML Report
```bash
npx playwright show-report
```

## Test Data Configuration

Edit `tests/test-data.js` to modify:
- Login credentials
- Vendor details
- Material request information
- Purchase order data

## Original vs Refactored Test

### Original Test Issues:
- ❌ Hardcoded data throughout
- ❌ Fragile selectors (`#undefined`, `#mat-input-7`)
- ❌ No assertions or validations
- ❌ Difficult to maintain
- ❌ Poor readability

### Refactored Test Benefits:
- ✅ Page Object Model pattern
- ✅ Centralized test data
- ✅ Assertions at each step
- ✅ Better selectors using accessibility roles
- ✅ Easy to maintain and extend
- ✅ Clear test structure with steps
- ✅ Proper error handling

## Known Issues

The test still uses some fragile selectors that exist in the original code:
- `#undefined` checkboxes (appears multiple times)
- Dynamic input IDs (`#mat-input-7`)

These should be updated in the application with proper test IDs for better automation.

## Recommendations

1. **Add Data-Test-IDs**: Request development team to add `data-testid` attributes to key elements
2. **Environment Variables**: Move credentials to `.env` file
3. **API Integration**: Consider using API calls for setup/teardown
4. **Parallel Execution**: Once stable, enable parallel test execution
5. **Visual Regression**: Add visual comparison tests for critical flows

## Contributing

When adding new tests:
1. Create page objects in `tests/pages/`
2. Add test data to `tests/test-data.js`
3. Use `test.step()` for clear reporting
4. Add assertions to validate behavior
5. Follow the existing naming conventions

To Record new test case:
 *    npx playwright codegen -o tests/new-test-name.spec.js https://your-app-url.com

