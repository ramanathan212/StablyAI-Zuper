import { test, expect } from './fixtures/cache-fixtures.js';
import { LoginPage } from './pages/LoginPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { testData } from './config/test-data-config.js';

test.describe('Settings Search Functionality', () => {
  let settingsPage;

  // Test results tracking
  const testResults = {
    testName: 'Settings Search Functionality',
    startTime: null,
    endTime: null,
    duration: null,
    steps: [],
    overallStatus: 'PENDING'
  };

  test.beforeEach(async ({ page }) => {
    // Navigate immediately so the browser is never stuck on about:blank in Playwright UI
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

    settingsPage = new SettingsPage(page);

    // Reset test results
    testResults.startTime = new Date();
    testResults.steps = [];
    testResults.overallStatus = 'RUNNING';
  });

  test.afterEach(async () => {
    testResults.endTime = new Date();
    testResults.duration = ((testResults.endTime - testResults.startTime) / 1000).toFixed(2);

    // Print test results summary
    console.log('\n' + '='.repeat(80));
    console.log('TEST EXECUTION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Test Name: ${testResults.testName}`);
    console.log(`Start Time: ${testResults.startTime?.toLocaleString() ?? 'N/A'}`);
    console.log(`End Time: ${testResults.endTime?.toLocaleString() ?? 'N/A'}`);
    console.log(`Duration: ${testResults.duration ?? 'N/A'} seconds`);
    console.log(`Overall Status: ${testResults.overallStatus}`);
    console.log('\nStep Details:');
    console.log('-'.repeat(80));

    testResults.steps.forEach((step, index) => {
      const statusIcon = step.status === 'PASS' ? '✓' : '✗';
      const statusColor = step.status === 'PASS' ? '\x1b[32m' : '\x1b[31m';
      console.log(`${index + 1}. ${statusIcon} ${step.name}`);
      console.log(`   Status: ${statusColor}${step.status}\x1b[0m`);
      console.log(`   Duration: ${step.duration}s`);
      if (step.error) {
        console.log(`   Error: ${step.error}`);
      }
      console.log('-'.repeat(80));
    });

    const passedSteps = testResults.steps.filter(s => s.status === 'PASS').length;
    const failedSteps = testResults.steps.filter(s => s.status === 'FAIL').length;
    console.log(`\nSummary: ${passedSteps} PASSED, ${failedSteps} FAILED out of ${testResults.steps.length} steps`);
    console.log('='.repeat(80) + '\n');
  });

  test('Verify search results for different categories', async ({ page, autoClearCache }) => {
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

    // Login to application
    await executeStep('Login to application', async () => {
      const loginPage = new LoginPage(page);
      const { login } = testData;
      await loginPage.login(login.companyName, login.email, login.password);
      await loginPage.dismissOnboarding();
    });

    // Navigate to Settings
    await executeStep('Navigate to Settings', async () => {
      await settingsPage.navigateToSettings();
    });

    // Test 1: Search for "job" and verify results
    await executeStep('Search and verify "job" results', async () => {
      await settingsPage.searchSettings('job');
      await settingsPage.verifyJobSearchResults();
      await settingsPage.clearSearch();
    });

    // Test 2: Search for "users" and verify results
    await executeStep('Search and verify "users" results', async () => {
      await settingsPage.searchSettings('users');
      await settingsPage.verifyUsersSearchResults();
      await settingsPage.clearSearch();
    });

    // Test 3: Search for "purchasing" and verify results
    await executeStep('Search and verify "purchasing" results', async () => {
      await settingsPage.searchSettings('purchasing');
      await settingsPage.verifyPurchasingSearchResults();
    });

    // Click on Purchasing and verify details page
    await executeStep('Verify purchasing details page', async () => {
      await settingsPage.clickPurchasingLink();
      await settingsPage.verifyPurchasingDetailsPage();
      await settingsPage.clearSearch();
    });

    // Test 4: Search for "project" and verify results
    await executeStep('Search and verify "project" results', async () => {
      await settingsPage.searchSettings('project');
      await settingsPage.verifyProjectSearchResults();
      await settingsPage.clearSearch();
    });

    // Test 5: Search for "parts" and verify results
    await executeStep('Search and verify "parts" results', async () => {
      await settingsPage.searchSettings('parts');
      await settingsPage.verifyPartsSearchResults();
    });

    // Click on Parts & Services General and verify details page
    await executeStep('Verify parts & services details page', async () => {
      await settingsPage.clickPartsServicesLink();
      await settingsPage.verifyPartsServicesDetailsPage();
      await settingsPage.clearSearch();
    });

    // Test 6: Search for "import" and verify results
    await executeStep('Search and verify "import" results', async () => {
      await settingsPage.searchSettings('import');
      await settingsPage.verifyImportSearchResults();
      await settingsPage.clearSearch();
    });

    // Test 7: Search for "request" and verify results
    await executeStep('Search and verify "request" results', async () => {
      await settingsPage.searchSettings('request');
      await settingsPage.verifyRequestSearchResults();
    });

    // Navigate back to workspace
    await executeStep('Navigate back to workspace', async () => {
      await settingsPage.navigateBackToWorkspace();
    });

    // Mark test as passed if all steps succeeded
    testResults.overallStatus = 'PASSED';
    console.log('\n✓ Settings search test passed successfully!');

    // Print final summary
    printTestSummary();
  });

  // Helper function to print test summary
  function printTestSummary() {
    testResults.endTime = new Date();
    testResults.duration = ((testResults.endTime - testResults.startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(80));
    console.log('TEST EXECUTION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Test Name: ${testResults.testName}`);
    console.log(`Start Time: ${testResults.startTime?.toLocaleString() ?? 'N/A'}`);
    console.log(`End Time: ${testResults.endTime?.toLocaleString() ?? 'N/A'}`);
    console.log(`Duration: ${testResults.duration ?? 'N/A'} seconds`);
    console.log(`Overall Status: ${testResults.overallStatus}`);
    console.log('\nStep Details:');
    console.log('-'.repeat(80));

    testResults.steps.forEach((step, index) => {
      const statusIcon = step.status === 'PASS' ? '✓' : '✗';
      const statusColor = step.status === 'PASS' ? '\x1b[32m' : '\x1b[31m';
      console.log(`${index + 1}. ${statusIcon} ${step.name}`);
      console.log(`   Status: ${statusColor}${step.status}\x1b[0m`);
      console.log(`   Duration: ${step.duration}s`);
      if (step.error) {
        console.log(`   Error: ${step.error}`);
      }
      console.log('-'.repeat(80));
    });

    const passedSteps = testResults.steps.filter(s => s.status === 'PASS').length;
    const failedSteps = testResults.steps.filter(s => s.status === 'FAIL').length;
    console.log(`\nSummary: ${passedSteps} PASSED, ${failedSteps} FAILED out of ${testResults.steps.length} steps`);
    console.log('='.repeat(80) + '\n');
  }
});
