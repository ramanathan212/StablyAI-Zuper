# Testing Guide

This project uses Playwright for both unit and end-to-end (E2E) testing.

## Test Structure

- **Unit Tests** (`tests/unit/*.test.js`) - Fast tests that validate logic and configuration without browser automation
- **E2E Tests** (`tests/*.spec.js`) - Full browser automation tests that interact with the UAT environment

## Running Tests Locally

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers (only needed for E2E tests)
npx playwright install chromium
```

### Available Commands

```bash
# Run all tests (unit + E2E)
npm test

# Run only unit tests (fast, no browser required)
npm run test:unit

# Run only E2E tests (requires credentials and browser)
npm run test:e2e

# Run original Playwright tests
npm run test:playwright
```

### Local Development

For local development, test credentials are stored in `tests/config/test-data-config.js`. The default values work for the UAT environment.

## CI/CD Configuration

The GitHub Actions workflow is configured to run both unit and E2E tests.

### Workflow Jobs

1. **Build Job** - Runs on Node.js 18.x, 20.x, and 22.x
   - Installs dependencies
   - Runs unit tests (fast validation)
   - Runs build if present

2. **E2E Tests Job** - Runs on Node.js 20.x only
   - Installs Playwright browsers
   - Runs E2E tests with credentials from GitHub Secrets
   - Uploads test reports as artifacts

### Setting Up GitHub Secrets

To enable E2E tests in CI, add the following secrets to your GitHub repository:

1. Go to your repository on GitHub
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret** and add:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `COMPANY_NAME` | Company name for login | `zuper-pro` |
| `LOGIN_EMAIL` | User email for authentication | `user@example.com` |
| `LOGIN_PASSWORD` | User password for authentication | `your-password` |

### GitHub Secrets Setup Steps

```bash
# Using GitHub CLI (recommended)
gh secret set COMPANY_NAME -b "zuper-pro"
gh secret set LOGIN_EMAIL -b "your-email@example.com"
gh secret set LOGIN_PASSWORD -b "your-password"

# Or via GitHub Web UI:
# Settings > Secrets and variables > Actions > New repository secret
```

## Test Reports

### Local Reports

After running tests locally:
- Unit test report: `playwright-report-unit/index.html`
- E2E test report: `playwright-report/index.html`

```bash
# View reports
npx playwright show-report
npx playwright show-report playwright-report-unit
```

### CI Reports

E2E test reports are automatically uploaded as GitHub Actions artifacts:
1. Go to the **Actions** tab in your repository
2. Click on the workflow run
3. Download the `playwright-report` artifact

## Configuration Files

- `playwright.unit.config.js` - Configuration for unit tests
- `playwright.e2e.config.js` - Configuration for E2E tests
- `playwright.config.js` - Default configuration (legacy)
- `tests/config/test-data-config.js` - Test data with environment variable support

## Environment Variables

The test suite supports environment variables for sensitive data:

```bash
# Example: Override credentials locally
COMPANY_NAME="test-company" \
LOGIN_EMAIL="test@example.com" \
LOGIN_PASSWORD="test-password" \
npm run test:e2e
```

## Troubleshooting

### E2E Tests Failing Locally

1. Ensure Playwright browsers are installed:
   ```bash
   npx playwright install chromium
   ```

2. Check credentials in `tests/config/test-data-config.js`

3. Verify UAT environment is accessible:
   ```bash
   curl -I https://uat.zuperpro.com
   ```

### CI Tests Failing

1. Verify GitHub Secrets are set correctly
2. Check the workflow file: `.github/workflows/node.js.yml`
3. Review test reports in GitHub Actions artifacts

### Authentication Issues

If authentication fails:
1. Verify credentials are correct
2. Check `tests/.auth/user.json` exists after running tests
3. Review `tests/global-setup.js` for login logic

## Best Practices

1. **Unit Tests**
   - Keep them fast and focused
   - No browser automation
   - Test data validation and utility functions

2. **E2E Tests**
   - Use Page Object Model (see `tests/pages/`)
   - Generate unique test data (timestamps, random values)
   - Clean up test data when possible
   - Use meaningful test descriptions

3. **CI/CD**
   - Unit tests run on all Node.js versions
   - E2E tests run only on Node.js 20.x
   - Never commit credentials to the repository
   - Use GitHub Secrets for sensitive data

## Adding New Tests

### Unit Test Example

Create a new file in `tests/unit/`:

```javascript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('should do something', () => {
    expect(true).toBe(true);
  });
});
```

### E2E Test Example

Create a new file in `tests/`:

```javascript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('should complete user workflow', async ({ page }) => {
    await page.goto('/dashboard');
    // Your test logic here
  });
});
```

## Contact

For questions or issues with the test suite, please open an issue in the repository.
