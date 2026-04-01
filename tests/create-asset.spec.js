import { test, expect } from './fixtures/cache-fixtures.js';
import { LoginPage } from './pages/LoginPage.js';
import { AssetPage } from './pages/AssetPage.js';
import { testData } from './config/test-data-config.js';

test.describe('Asset Management', () => {
  let assetPage;

  // Test results tracking
  const testResults = {
    testName: 'Create New Asset',
    startTime: null,
    endTime: null,
    duration: null,
    steps: [],
    overallStatus: 'PENDING'
  };

  // Test data
  const assetData = testData.asset;

  test.beforeEach(async ({ page }) => {
    // Navigate immediately so the browser is never stuck on about:blank in Playwright UI
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

    assetPage = new AssetPage(page);

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

  test('Create new asset with organization and contact', async ({ page, autoClearCache }) => {
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

    // Step 1: Login to application
    await executeStep('Login to application', async () => {
      const loginPage = new LoginPage(page);
      const { login } = testData;
      await loginPage.login(login.companyName, login.email, login.password);
      await loginPage.dismissOnboarding();
    });

    // Step 2: Navigate to Assets page
    await executeStep('Navigate to Assets page', async () => {
      await assetPage.navigateToAssets();
    });

    // Step 2: Verify Assets page elements
    await executeStep('Verify Assets page elements', async () => {
      await assetPage.verifyAssetsPageElements();
    });

    // Step 3: Click New Asset button
    await executeStep('Open New Asset form', async () => {
      await assetPage.clickNewAsset();
    });

    // Step 4: Fill asset basic information
    await executeStep('Fill asset basic information', async () => {
      await assetPage.fillAssetBasicInfo(assetData);
    });

    // Step 5: Select organization
    await executeStep('Select organization', async () => {
      await assetPage.selectOrganization(assetData.organization);
    });

    // Step 6: Select contact
    await executeStep('Select contact', async () => {
      await assetPage.selectContact(assetData.contact);
    });

    // Step 7: Verify address field is visible
    await executeStep('Verify address field is visible', async () => {
      await assetPage.verifyAddressFieldVisible();
    });

    // Step 8: Save asset
    await executeStep('Save asset', async () => {
      await assetPage.saveAsset();
    });

    // Step 9: Verify asset created
    await executeStep('Verify asset created', async () => {
      await assetPage.verifyAssetCreated(assetData.code);
    });

    // Mark test as passed if all steps succeeded
    testResults.overallStatus = 'PASSED';
    console.log('\n✓ Asset creation test passed successfully!');

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
