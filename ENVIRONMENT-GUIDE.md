# Environment Configuration Guide

This guide explains how to run tests across different environments (Development, Staging, UAT).

## 📋 Available Environments

| Environment | URL | Credentials File |
|------------|-----|------------------|
| **Development** | `https://developmentv3.zuperpro.com/v2` | `dev-staging-data.js` |
| **Staging** | `https://staging.zuperpro.com` | `dev-staging-data.js` |
| **UAT** | `https://uat.zuperpro.com` | `test-data-config.js` |

## 🚀 Running Tests

### Method 1: Using NPM Scripts (Recommended)

```bash
# Run tests in Development environment
npm run test:dev

# Run tests in Staging environment
npm run test:staging

# Run tests in UAT environment (default)
npm run test:uat

# Run with UI Mode for debugging
npm run test:dev:ui
npm run test:staging:ui
npm run test:uat:ui
```

### Method 2: Using Shell Scripts

```bash
# Development
./run-dev.sh                                    # All tests
./run-dev.sh tests/parts-service-colours.spec.js   # Specific test

# Staging
./run-staging.sh                                # All tests
./run-staging.sh tests/create-org.spec.js       # Specific test

# UAT
./run-uat.sh                                    # All tests
./run-uat.sh tests/create-job-mr-po-workflow.spec.js
```

### Method 3: Using Environment Variable

```bash
# Set environment variable and run
TEST_ENV=development npx playwright test
TEST_ENV=staging npx playwright test tests/parts-service-colours.spec.js
TEST_ENV=uat npx playwright test --headed
```

### Method 4: Using Playwright CLI directly

```bash
# Run specific test in dev environment with headed browser
TEST_ENV=development npx playwright test tests/parts-service-colours.spec.js --headed

# Run with debug mode
TEST_ENV=development npx playwright test --debug

# Run specific project (browser)
TEST_ENV=development npx playwright test --project=chromium
```

## 🔐 Credentials Configuration

### Development & Staging Credentials
Located in: `tests/config/dev-staging-data.js`

```javascript
login: {
  companyName: 'sofyaizuper',
  email: 'ramanathan.m@zuper.co',
  password: 'Test@123'
}
```

### UAT Credentials
Located in: `tests/config/test-data-config.js`

```javascript
login: {
  companyName: 'zuper-pro',
  email: 'vignesh.s@zuper.co',
  password: 'Vicky@123'
}
```

## 📝 Test Data

Each environment can have its own test data. The system automatically selects the correct data based on the `TEST_ENV` variable:

- **Development/Staging**: Uses `devStagingData` from `dev-staging-data.js`
- **UAT**: Uses `testData` from `test-data-config.js`

## 🎯 Examples

### Run Parts & Services test in Development
```bash
npm run test:dev tests/parts-service-colours.spec.js
```

### Run Organization creation in Staging with UI
```bash
npm run test:staging:ui tests/create-org.spec.js
```

### Run all tests in UAT (default environment)
```bash
npm run test:uat
```

### Debug a failing test in Development
```bash
TEST_ENV=development npx playwright test tests/parts-service-colours.spec.js --debug
```

### Run with Playwright Inspector
```bash
TEST_ENV=development npx playwright test --headed --debug
```

## 🔄 CI/CD Integration

For CI/CD pipelines, set the `TEST_ENV` environment variable:

```yaml
# GitHub Actions example
- name: Run Tests in Development
  run: npm run test:dev
  env:
    TEST_ENV: development

# Or using environment variable directly
- name: Run Tests
  run: npx playwright test
  env:
    TEST_ENV: ${{ secrets.TEST_ENVIRONMENT }}
```

## 🛠️ Troubleshooting

### Authentication Issues
If you get authentication errors:
1. Delete the auth file: `rm tests/.auth/user.json`
2. Re-run the test - it will re-authenticate

### Environment Not Switching
Make sure to set the environment variable BEFORE running the command:
```bash
# ❌ Wrong
npx playwright test TEST_ENV=development

# ✅ Correct
TEST_ENV=development npx playwright test
```

### Cache Issues
Clear the Playwright cache:
```bash
npm run clear-cache:all
```

## 📊 Environment-Specific Features

### Development Environment
- Best for: Feature development and debugging
- Data: Uses dev-specific test data with comprehensive part catalogs
- URL: `https://developmentv3.zuperpro.com/v2`

### Staging Environment
- Best for: Pre-production testing
- Data: Uses staging-specific test data
- URL: `https://staging.zuperpro.com`

### UAT Environment
- Best for: User acceptance testing
- Data: Uses production-like test data
- URL: `https://uat.zuperpro.com`

## 🔍 Tips

1. **Use UI Mode for debugging**: `npm run test:dev:ui`
2. **Check console logs**: The setup script logs which environment and credentials are being used
3. **Verify base URL**: Check the console output during global setup to confirm the correct URL
4. **Environment defaults to UAT**: If no `TEST_ENV` is set, tests run against UAT

## 📚 Additional Resources

- Playwright Documentation: https://playwright.dev
- Project Configuration: `playwright.config.js`
- Global Setup: `tests/global-setup.js`
