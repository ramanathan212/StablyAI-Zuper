import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage.js';
import { JobPage } from './pages/JobPage.js';
import { testData } from './test-data.js';
import { getEnvironment } from './config/environments.js';

test.describe('Job Management', () => {
  let loginPage;
  let jobPage;
  let env;

  // Test results tracking
  const testResults = {
    testName: 'Clone Job Workflow',
    startTime: null,
    endTime: null,
    duration: null,
    steps: [],
    overallStatus: 'PENDING'
  };

  test.beforeEach(async ({ page }) => {
    // Get environment configuration
    env = getEnvironment();

    loginPage = new LoginPage(page, env.baseURL);
    jobPage = new JobPage(page);

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
    console.log(`Start Time: ${testResults.startTime.toLocaleString()}`);
    console.log(`End Time: ${testResults.endTime.toLocaleString()}`);
    console.log(`Duration: ${testResults.duration} seconds`);
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

  test('should clone a job successfully', async ({ page }) => {
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

    // Get loop count from test data or environment variable
    const loopCount = process.env.CLONE_LOOP_COUNT
      ? parseInt(process.env.CLONE_LOOP_COUNT)
      : testData.jobClone.loopCount || 1;

    console.log(`\n🔄 Running job clone in loop mode: ${loopCount} iteration(s)\n`);

    // Step 1: Login (only once)
    await executeStep('Login to application', async () => {
      await loginPage.navigate();
      await loginPage.login(
        env.login.companyName,
        env.login.email,
        env.login.password
      );
      await loginPage.dismissOnboarding();

      // Verify successful login
      await expect(page).toHaveURL(/\/dashboard|\/vendors|\/organizations|\/jobs/);
    });

    // Step 2: Navigate to Jobs (only once)
    await executeStep('Navigate to Jobs', async () => {
      await jobPage.navigateToJobs();
      await expect(page).toHaveURL(/\/jobs/);
    });

    // Loop through cloning process
    for (let i = 1; i <= loopCount; i++) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🔁 CLONE ITERATION ${i} of ${loopCount}`);
      console.log('='.repeat(80) + '\n');

      // Step 3: Search for Job
      await executeStep(`[${i}/${loopCount}] Search for job`, async () => {
        await jobPage.searchJob(testData.jobClone.searchText);
      });

      // Step 4: Open Job
      await executeStep(`[${i}/${loopCount}] Open job details`, async () => {
        await jobPage.openJobByNumber(testData.jobClone.jobNumber);
      });

      // Step 5: Clone Job
      await executeStep(`[${i}/${loopCount}] Clone the job`, async () => {
        await jobPage.cloneJob();
      });

      // Step 6: Assign User
      await executeStep(`[${i}/${loopCount}] Assign user to cloned job`, async () => {
        await jobPage.assignUser(testData.jobClone.assignedUser);
      });

      // Step 7: Create Cloned Job
      await executeStep(`[${i}/${loopCount}] Create cloned job`, async () => {
        await jobPage.createClonedJob();

        // Verify job was created/cloned
        await page.waitForTimeout(2000);
        await expect(page).toHaveURL(/\/jobs\/.*\/details/);
      });

      console.log(`\n✓ Clone iteration ${i} completed successfully!\n`);

      // Navigate back to jobs list for next iteration (if not last iteration)
      if (i < loopCount) {
        await executeStep(`[${i}/${loopCount}] Navigate back to Jobs list`, async () => {
          await jobPage.navigateToJobs();
          await expect(page).toHaveURL(/\/jobs/);
        });
      }
    }

    // Mark test as passed if all steps succeeded
    testResults.overallStatus = 'PASSED';
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✓ Successfully cloned job ${loopCount} time(s)!`);
    console.log('='.repeat(80) + '\n');

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
    console.log(`Start Time: ${testResults.startTime.toLocaleString()}`);
    console.log(`End Time: ${testResults.endTime.toLocaleString()}`);
    console.log(`Duration: ${testResults.duration} seconds`);
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
