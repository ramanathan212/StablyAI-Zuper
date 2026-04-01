import { test, expect } from './fixtures/cache-fixtures.js';
import { LoginPage } from './pages/LoginPage.js';
import { testData } from './test-data.js';
import { CustomerPage } from './pages/CustomerPage.js';

test.describe('Customer Management', () => {
  let testResults = {
    testName: 'Create new customer with complete details',
    startTime: null,
    endTime: null,
    duration: null,
    overallStatus: 'PASSED',
    steps: []
  };

  test.beforeEach(async ({ page }) => {
    // Navigate immediately so the browser is never stuck on about:blank in Playwright UI
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  });

  test.afterEach(async () => {
    testResults.endTime = new Date();
    testResults.duration = ((testResults.endTime - testResults.startTime) / 1000).toFixed(2);

    // Print detailed test results
    console.log('\n' + '='.repeat(80));
    console.log('CUSTOMER CREATION TEST RESULTS');
    console.log('='.repeat(80));
    console.log(`Test: ${testResults.testName}`);
    console.log(`Status: ${testResults.overallStatus}`);
    console.log(`Duration: ${testResults.duration}s`);
    console.log(`Start Time: ${testResults.startTime?.toISOString() ?? 'N/A'}`);
    console.log(`End Time: ${testResults.endTime?.toISOString() ?? 'N/A'}`);
    console.log('\nTest Steps:');
    console.log('-'.repeat(80));

    testResults.steps.forEach((step, index) => {
      const statusColor = step.status === 'PASS' ? '\x1b[32m' : '\x1b[31m';
      console.log(`\n${index + 1}. ${step.name}`);
      console.log(`   Status: ${statusColor}${step.status}\x1b[0m`);
      console.log(`   Duration: ${step.duration}s`);
      if (step.error) {
        console.log(`   Error: ${step.error}`);
      }
      console.log('-'.repeat(80));
    });

    console.log('\n' + '='.repeat(80) + '\n');
  });

  test('Create new customer with complete details', async ({ page, autoClearCache }) => {
    testResults.startTime = new Date();

    // Helper function to track step execution
    const executeStep = async (stepName, stepFunction) => {
      const stepStart = new Date();
      const stepResult = {
        name: stepName,
        status: 'PENDING',
        startTime: stepStart,
        endTime: null,
        duration: null,
        error: null
      };

      try {
        await test.step(stepName, stepFunction);
        stepResult.status = 'PASS';
        console.log(`✓ ${stepName} - PASSED`);
      } catch (error) {
        stepResult.status = 'FAIL';
        stepResult.error = error.message;
        testResults.overallStatus = 'FAILED';
        console.log(`✗ ${stepName} - FAILED: ${error.message}`);
        throw error;
      } finally {
        stepResult.endTime = new Date();
        stepResult.duration = ((stepResult.endTime - stepResult.startTime) / 1000).toFixed(2);
        testResults.steps.push(stepResult);
      }
    };

    // Initialize pages
    const loginPage = new LoginPage(page);
    const customerPage = new CustomerPage(page);

    // Step 1: Login (after cache is cleared by autoClearCache fixture)
    await executeStep('Login', async () => {
      await loginPage.login(testData.login.companyName, testData.login.email, testData.login.password);
      await loginPage.dismissOnboarding();
    });

    // Step 2: Navigate to Contacts
    await executeStep('Navigate to Contacts page', async () => {
      await customerPage.navigateToContacts();
    });

    // Step 3: Create new contact
    await executeStep('Click New Contact', async () => {
      await customerPage.clickNewContact();
    });

    // Step 4: Fill and save customer using the page object
    await executeStep('Fill and save customer details', async () => {
      await customerPage.createCustomer(testData.customer);
    });

    // Step 5: Verify customer created successfully
    await executeStep('Verify customer creation', async () => {
      const verificationResults = await customerPage.verifyCustomerCreated(testData.customer.email);

      // Assert that all critical verifications passed
      expect(verificationResults.success).toBe(true);

      if (!verificationResults.success) {
        const failedChecks = verificationResults.checks.filter(c => c.status === 'FAIL');
        const failureMessage = `Customer creation verification failed:\n${failedChecks.map(c => c.error).join('\n')}`;
        throw new Error(failureMessage);
      }
    });

    // Step 6: Verify detailed customer information
    await executeStep('Verify customer details', async () => {
      const detailsVerification = await customerPage.verifyCustomerDetails(testData.customer);

      // Assert that all critical verifications passed
      expect(detailsVerification.success).toBe(true);

      if (!detailsVerification.success) {
        const failedChecks = detailsVerification.checks.filter(c => c.status === 'FAIL');
        const failureMessage = `Customer details verification failed:\n${failedChecks.map(c => c.error).join('\n')}`;
        throw new Error(failureMessage);
      }
    });

    // Step 7: Final assertion on customer details section
    await executeStep('Final customer details section check', async () => {
      await expect(customerPage.customerDetailsSection).toBeVisible();
    });
  });
});
