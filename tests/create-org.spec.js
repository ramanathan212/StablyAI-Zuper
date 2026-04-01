import { test, expect } from './fixtures/cache-fixtures.js';
import { testData } from './test-data.js';
import { LoginPage } from './pages/LoginPage.js';
import { OrganizationPage } from './pages/OrganizationPage.js';
import { clickWithOverlayHandling, waitForPageReady } from './Helper/overlay-helper.js';

test.describe('Organization Management', () => {
  let organizationPage;

  // Test results tracking
  const testResults = {
    testName: 'Create New Organization',
    startTime: null,
    endTime: null,
    duration: null,
    steps: [],
    overallStatus: 'PENDING'
  };

  test.beforeEach(async ({ page }) => {
    // Navigate immediately so the browser is never stuck on about:blank in Playwright UI
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

    organizationPage = new OrganizationPage(page);

    // Reset test results
    testResults.startTime = new Date();
    testResults.steps = [];
    testResults.overallStatus = 'RUNNING';
  });

  test.afterEach(async ({ page }) => {
    testResults.endTime = new Date();
    if (!testResults.startTime) { testResults.startTime = testResults.endTime; }
    testResults.duration = ((testResults.endTime - testResults.startTime) / 1000).toFixed(2);

    // Take screenshot on failure
    if (testResults.overallStatus === 'FAILED') {
      await page.screenshot({
        path: `test-results/organization-creation-failure-${Date.now()}.png`,
        fullPage: true
      });
    }

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

  test('Create new organization with complete details', async ({ page, autoClearCache }) => {
    test.setTimeout(300000); // 5 minutes
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

    // Step 2: Navigate to Organizations
    await executeStep('Navigate to Organizations page', async () => {
      await navigateToOrganizationsWithOverlay(page);
    });

    // Step 2: Click New Organization
    await executeStep('Open New Organization form', async () => {
      await organizationPage.clickNewOrganization();
    });

    // Step 3: Fill organization basic information
    await executeStep('Fill organization basic information', async () => {
      await organizationPage.fillOrganizationBasicInfo(testData.organization);
    });

    // Step 4: Add service address
    await executeStep('Add service address', async () => {
      await organizationPage.addServiceAddress(testData.organization.serviceAddress);
    });

    // Step 5: Fill custom fields
    await executeStep('Fill custom fields', async () => {
      await organizationPage.fillCustomFields(testData.organization.customFields);
    });

    // Step 6: Select options
    await executeStep('Select options', async () => {
      await selectOptions(page);
    });

    // Step 7: Handle modal dialogs
    await executeStep('Handle modal dialogs', async () => {
      await handleModalDialogs(page);
    });

    // Step 8: Save organization
    await executeStep('Save organization', async () => {
      await organizationPage.saveOrganization();
    });

    // Step 9: Wait for page to stabilize
    await executeStep('Wait for page to stabilize', async () => {
      await page.waitForLoadState('load');
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);
    });

    // Step 10: Verify organization was created successfully
    await executeStep('Verify organization created', async () => {
      const verificationResults = await organizationPage.verifyOrganizationCreated(testData.organization);

      // Assert that all critical verifications passed
      expect(verificationResults.success).toBe(true);

      if (!verificationResults.success) {
        const failedChecks = verificationResults.checks.filter(c => c.status === 'FAIL');
        const failureMessage = `Organization verification failed:\n${failedChecks.map(c => c.error).join('\n')}`;
        throw new Error(failureMessage);
      }
    });

    // Mark test as passed if all steps succeeded
    testResults.overallStatus = 'PASSED';
    console.log('\n✓ Organization creation test passed successfully!');

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

// Helper Functions

async function dismissOnboardingModal(page) {
  // Now handle the "Welcome back to Zuper" onboarding form
  try {
    const continueButton = page.getByRole('button', { name: 'Continue' });
    const isVisible = await continueButton.isVisible({ timeout: 3000 });

    if (isVisible) {
      // Check if there's a company name input that needs to be filled
      const companyNameInput = page.getByRole('textbox', { name: 'Company Name' });
      const inputVisible = await companyNameInput.isVisible({ timeout: 1000 }).catch(() => false);

      if (inputVisible) {
        // Fill in a dummy company name
        await companyNameInput.fill('Test Company');
        console.log('✓ Filled company name in onboarding modal');
      }

      await continueButton.click();
      await page.waitForTimeout(2000);
      console.log('✓ Clicked Continue button in onboarding modal');

      // After clicking continue, there might be more steps - keep clicking Continue until it's gone
      let continueAttempts = 0;
      while (continueAttempts < 5) {
        try {
          const nextContinueButton = page.getByRole('button', { name: 'Continue' });
          const stillVisible = await nextContinueButton.isVisible({ timeout: 2000 });

          if (stillVisible) {
            await nextContinueButton.click();
            await page.waitForTimeout(1000);
            console.log(`✓ Clicked Continue button (attempt ${continueAttempts + 2})`);
            continueAttempts++;
          } else {
            break;
          }
        } catch {
          break;
        }
      }

      // Try pressing Escape again to close any remaining modals
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  } catch (error) {
    console.log('⚠ No onboarding Continue button to click');
  }

  // Try clicking on backdrop to dismiss any remaining overlays
  try {
    const backdrops = page.locator('.cdk-overlay-backdrop, .modal-backdrop, [class*="backdrop"]');
    const count = await backdrops.count();
    for (let i = 0; i < count; i++) {
      try {
        await backdrops.nth(i).click({ timeout: 1000, force: true });
        await page.waitForTimeout(300);
      } catch (error) {
        // Continue if click fails
      }
    }
  } catch (error) {
    // Ignore if no backdrops found
  }

  // Wait for page to stabilize
  await page.waitForTimeout(2000);
}

/**
 * Navigate to Organizations page with overlay handling
 */
async function navigateToOrganizationsWithOverlay(page) {
  // Open navigation menu with overlay handling
  const navigationIcon = page.locator("//zuper-vertical-navigation-aside-item[@id='customer_organization_property']");
  await clickWithOverlayHandling(navigationIcon);

  // Click Organizations link with overlay handling
  const organizationsMenuItem = page.getByRole('link', { name: 'Organizations' });
  await clickWithOverlayHandling(organizationsMenuItem);

  await page.waitForLoadState('load');
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  // Dismiss any modals that appear after navigation
  await dismissOnboardingModal(page);

  console.log('✓ Navigated to Organizations page');
}

/**
 * Select options in the organization form
 */
async function selectOptions(page) {
  try {
    const optionCheckbox = page.getByRole('checkbox', { name: 'option 1' });
    await optionCheckbox.waitFor({ state: 'visible', timeout: 5000 });
    await optionCheckbox.check();
    console.log('✓ Selected option 1');
  } catch (error) {
    console.log('⚠ Option checkbox not found or already checked, continuing...');
  }
}

/**
 * Handle modal dialogs during organization creation
 */
async function handleModalDialogs(page) {
  try {
    const uatFilter = page.locator('a').filter({ hasText: 'UAT Single Line Text Multi' });
    await uatFilter.waitFor({ state: 'visible', timeout: 5000 });
    await uatFilter.click();

    const okButton = page.getByRole('button', { name: 'OK' });
    await okButton.waitFor({ state: 'visible', timeout: 5000 });
    await okButton.click();

    console.log('✓ Handled modal dialog');
  } catch (error) {
    console.log('⚠ Modal dialog not found, continuing...');
  }
}
