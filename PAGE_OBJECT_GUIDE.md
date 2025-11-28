# Page Object Model (POM) Guide

## Overview

This project uses the **Page Object Model (POM)** design pattern to organize test automation code. Page Objects encapsulate page-specific locators and actions, making tests more maintainable and readable.

## Architecture

### Page Object Structure

```
tests/
├── pages/
│   ├── CustomerPage.js      # Customer/Contact page object
│   ├── OrganizationPage.js  # Organization page object
│   ├── LoginPage.js         # Login page object (if needed)
│   └── ...                  # Other page objects
├── create-customer.spec.js  # Customer tests (uses CustomerPage)
├── create-org.spec.js       # Organization tests (uses OrganizationPage)
└── test-data.js            # Centralized test data
```

## CustomerPage Class

### File: [tests/pages/CustomerPage.js](tests/pages/CustomerPage.js)

#### Locators (Defined in Constructor)

All locators are defined once in the constructor and reused throughout the class:

```javascript
constructor(page) {
  this.page = page;

  // Navigation locators
  this.noThanksButton = page.getByRole('button', { name: 'No, thanks' });
  this.customerOrgNavigationButton = page.locator("//zuper-vertical-navigation-aside-item[@id='customer_organization_property']");
  this.contactsLink = page.getByRole('link', { name: 'Contacts' });
  this.newContactLink = page.getByRole('link', { name: ' New Contact' });

  // Primary details locators
  this.firstNameInput = page.getByRole('textbox', { name: 'First Name *' });
  this.lastNameInput = page.getByRole('textbox', { name: 'Last Name', exact: true });
  this.organizationInput = page.getByRole('textbox', { name: 'Organization' });
  // ... more locators
}
```

#### Key Methods

| Method | Description |
|--------|-------------|
| `dismissWelcomeNotification()` | Dismiss welcome popup if present |
| `navigateToContacts()` | Navigate to Contacts page |
| `clickNewContact()` | Click New Contact button |
| `fillPrimaryDetails(customerData)` | Fill first name and last name |
| `selectOrganization(organizationName)` | Search and select organization |
| `fillEmailAddress(email)` | Fill email field |
| `fillServiceAddress(addressData)` | Fill and select service address |
| `checkSameAsServiceAddress()` | Check billing address checkbox |
| `saveContact()` | Save the contact |
| `verifyCustomerCreated(email)` | Verify customer by email |
| `verifyCustomerDetails(customerData)` | Verify detailed customer info |
| `createCustomer(customerData)` | **Complete workflow method** |

#### Complete Workflow Method

The `createCustomer()` method is a convenience method that executes the entire customer creation flow:

```javascript
async createCustomer(customerData) {
  await this.fillPrimaryDetails(customerData);
  await this.selectOrganization(customerData.organization);
  await this.fillEmailAddress(customerData.email);
  await this.fillServiceAddress(customerData.serviceAddress);

  if (customerData.serviceAddress.sameAsBilling) {
    await this.checkSameAsServiceAddress();
  }

  await this.saveContact();
}
```

## OrganizationPage Class

### File: [tests/pages/OrganizationPage.js](tests/pages/OrganizationPage.js)

Similar structure to CustomerPage with organization-specific locators and methods.

#### Key Methods

| Method | Description |
|--------|-------------|
| `navigateToOrganizations()` | Navigate to Organizations page |
| `clickNewOrganization()` | Click New Organization button |
| `fillOrganizationBasicInfo(orgData)` | Fill name and email |
| `addServiceAddress(addressData)` | Fill service address |
| `fillCustomFields(customFields)` | Fill custom fields (text, date, time) |
| `saveOrganization()` | Save the organization |
| `getOrganizationName()` | Get organization name after creation |

## Using Page Objects in Tests

### Example: Customer Test

```javascript
import { test, expect } from '@playwright/test';
import { testData } from './test-data.js';
import { CustomerPage } from './pages/CustomerPage.js';

test.describe('Customer Management', () => {
  test('Create customer', async ({ page }) => {
    // 1. Initialize page object
    const customerPage = new CustomerPage(page);

    // 2. Navigate
    await page.goto('/');
    await customerPage.dismissWelcomeNotification();
    await customerPage.navigateToContacts();

    // 3. Create customer (complete workflow)
    await customerPage.clickNewContact();
    await customerPage.createCustomer(testData.customer);

    // 4. Verify
    const emailVisible = await customerPage.verifyCustomerCreated(testData.customer.email);
    expect(emailVisible).toBeTruthy();

    await customerPage.verifyCustomerDetails(testData.customer);
    await expect(customerPage.customerDetailsSection).toBeVisible();
  });
});
```

### Example: Organization Test

```javascript
import { test, expect } from '@playwright/test';
import { testData } from './test-data.js';
import { OrganizationPage } from './pages/OrganizationPage.js';

test.describe('Organization Management', () => {
  test('Create organization', async ({ page }) => {
    const orgPage = new OrganizationPage(page);

    await page.goto('/');
    await orgPage.navigateToOrganizations();
    await orgPage.clickNewOrganization();
    await orgPage.fillOrganizationBasicInfo(testData.organization);
    await orgPage.addServiceAddress(testData.organization.serviceAddress);
    await orgPage.fillCustomFields(testData.organization.customFields);
    await orgPage.saveOrganization();

    const orgName = await orgPage.getOrganizationName();
    expect(orgName).toContain(testData.organization.name);
  });
});
```

## Benefits of Page Object Model

### ✅ Maintainability
- **Single Source of Truth**: Locators defined once in page objects
- **Easy Updates**: Change a locator in one place, affects all tests
- **Reduced Duplication**: Reusable methods across tests

### ✅ Readability
- **Self-Documenting**: Method names describe actions
- **Clean Tests**: Tests read like business workflows
- **Separation of Concerns**: Test logic separate from page interactions

### ✅ Reusability
- **Shared Methods**: Multiple tests use same page object methods
- **Workflow Methods**: Complex flows encapsulated in single methods
- **Consistent Patterns**: All pages follow same structure

## Best Practices

### ✅ DO:

1. **Define all locators in constructor**
   ```javascript
   constructor(page) {
     this.page = page;
     this.submitButton = page.getByRole('button', { name: 'Submit' });
   }
   ```

2. **Use descriptive method names**
   ```javascript
   async fillCustomerEmail(email) { ... }
   async clickSaveButton() { ... }
   ```

3. **Add console logs for debugging**
   ```javascript
   async saveContact() {
     await this.saveButton.click();
     console.log('✓ Contact saved successfully');
   }
   ```

4. **Use waits for stability**
   ```javascript
   await this.element.waitFor({ state: 'visible', timeout: 10000 });
   ```

5. **Create workflow methods for common flows**
   ```javascript
   async createCustomer(data) {
     await this.fillPrimaryDetails(data);
     await this.fillAddress(data.address);
     await this.saveContact();
   }
   ```

6. **Return values from verification methods**
   ```javascript
   async verifyCustomerCreated(email) {
     const isVisible = await this.emailLocator(email).isVisible();
     return isVisible;
   }
   ```

### ❌ DON'T:

1. **Don't hardcode locators in test files**
   ```javascript
   // ❌ Bad
   await page.getByRole('button', { name: 'Submit' }).click();

   // ✅ Good
   await customerPage.clickSubmitButton();
   ```

2. **Don't include assertions in page objects**
   ```javascript
   // ❌ Bad (in page object)
   async verifyEmail() {
     expect(this.email).toBeVisible();
   }

   // ✅ Good (in page object)
   async isEmailVisible() {
     return await this.email.isVisible();
   }

   // ✅ Good (in test)
   const visible = await customerPage.isEmailVisible();
   expect(visible).toBeTruthy();
   ```

3. **Don't define locators inline in methods**
   ```javascript
   // ❌ Bad
   async clickButton() {
     await this.page.getByRole('button', { name: 'Click' }).click();
   }

   // ✅ Good
   constructor(page) {
     this.clickButton = page.getByRole('button', { name: 'Click' });
   }
   async clickButton() {
     await this.clickButton.click();
   }
   ```

4. **Don't mix test data with page objects**
   ```javascript
   // ❌ Bad
   async fillEmail() {
     await this.emailInput.fill('test@example.com');
   }

   // ✅ Good
   async fillEmail(email) {
     await this.emailInput.fill(email);
   }
   ```

## Creating a New Page Object

### Template

```javascript
export class MyPage {
  constructor(page) {
    this.page = page;

    // Define all locators here
    this.myButton = page.getByRole('button', { name: 'My Button' });
    this.myInput = page.getByRole('textbox', { name: 'My Input' });
  }

  /**
   * Navigate to my page
   */
  async navigateToMyPage() {
    await this.page.goto('/my-page');
    await this.page.waitForLoadState('networkidle');
    console.log('✓ Navigated to My Page');
  }

  /**
   * Fill input field
   * @param {string} value - Value to fill
   */
  async fillMyInput(value) {
    await this.myInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.myInput.fill(value);
    console.log(`✓ Filled input: ${value}`);
  }

  /**
   * Click my button
   */
  async clickMyButton() {
    await this.myButton.click();
    console.log('✓ Clicked My Button');
  }

  /**
   * Complete workflow
   * @param {Object} data - Data object
   */
  async completeWorkflow(data) {
    await this.fillMyInput(data.input);
    await this.clickMyButton();
    console.log('✓ Workflow completed');
  }
}
```

### Steps to Create

1. Create new file in `tests/pages/`
2. Export a class with page name
3. Define locators in constructor
4. Create methods for page actions
5. Add JSDoc comments for documentation
6. Include console logs for debugging
7. Add waits for stability
8. Create workflow methods for common patterns

## Integration with Test Data

Page objects work seamlessly with centralized test data:

```javascript
// test-data.js
export const testData = {
  customer: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com'
  }
};

// test file
import { CustomerPage } from './pages/CustomerPage.js';
import { testData } from './test-data.js';

test('Create customer', async ({ page }) => {
  const customerPage = new CustomerPage(page);
  await customerPage.createCustomer(testData.customer);
});
```

## Running Tests with Page Objects

```bash
# Run all tests
npx playwright test

# Run specific test
npx playwright test create-customer.spec.js

# Run with UI mode
npx playwright test --ui

# Run in headed mode
npx playwright test --headed

# Run with debugging
npx playwright test --debug
```

## Troubleshooting

### Locator Not Found
- Check if locator is defined in constructor
- Verify element is visible before interacting
- Add waits: `await element.waitFor({ state: 'visible' })`

### Method Not Working
- Check console logs for error messages
- Verify page object is properly imported
- Ensure page object is instantiated: `new CustomerPage(page)`

### Test Data Not Updating
- Verify test data import: `import { testData } from './test-data.js'`
- Check data structure matches page object expectations
- Console.log data to verify values

## Summary

Your test suite now uses the **Page Object Model**:

✅ **CustomerPage** - All customer/contact locators and methods
✅ **OrganizationPage** - All organization locators and methods
✅ **Clean Tests** - Tests read like business workflows
✅ **Maintainable** - Change locators in one place
✅ **Reusable** - Methods shared across tests
✅ **Scalable** - Easy to add new page objects

This architecture makes your tests more robust, maintainable, and easier to understand! 🎉
