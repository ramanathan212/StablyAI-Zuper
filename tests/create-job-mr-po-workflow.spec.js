import { test, expect } from './fixtures/cache-fixtures.js';
import { JobPage } from './pages/JobPage.js';
import { MaterialRequestPage } from './pages/MaterialRequestPage.js';
import { PurchaseOrderPage } from './pages/PurchaseOrderPage.js';
import { QuotePage } from './pages/QuotePage.js';
import { testData } from './test-data.js';

test.describe('Complete Job, MR, PO, and Quote Workflow', () => {
  let jobPage;
  let materialRequestPage;
  let purchaseOrderPage;
  let quotePage;
  let jobNumber;
  let mrPage;
  let poPage;

  // Test results tracking
  const testResults = {
    testName: 'Job Creation → MR → PO → Quote Workflow',
    startTime: null,
    endTime: null,
    duration: null,
    steps: [],
    overallStatus: 'PENDING'
  };

  test.beforeEach(async ({ page }) => {
    jobPage = new JobPage(page);
    materialRequestPage = new MaterialRequestPage(page);
    purchaseOrderPage = new PurchaseOrderPage(page);
    quotePage = new QuotePage(page);

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

  test('should create job, request materials, process PO, and create quote', async ({ page, autoClearCache }) => {
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

    // Step 1: Navigate to Jobs and create new job
    await executeStep('Navigate to Jobs page and initiate job creation', async () => {
      await jobPage.navigateToJobs();
      await jobPage.clickNewJob();
    });

    // Step 2: Fill job basic information
    await executeStep('Fill job basic information', async () => {
      await jobPage.fillJobBasicInfo(testData.job);
    });

    // Step 3: Add line items to job
    await executeStep('Add line items to job', async () => {
      await jobPage.addLineItems(testData.job.products);
    });

    // Step 4: Fill custom fields
    await executeStep('Fill custom fields', async () => {
      await jobPage.fillCustomFields(testData.job.customFieldValue);
    });

    // Step 5: Add organization to job
    await executeStep('Add organization to job', async () => {
      await jobPage.addOrganizationToJob(testData.job.organization);
    });

    // Step 6: Create job
    await executeStep('Create job', async () => {
      await jobPage.createJob();
    });

    // Step 7: Verify job details
    await executeStep('Verify job details', async () => {
      await jobPage.verifyJobDetails(testData.job.expectedVerification);
      // Use regex to match any number of contacts - flexible pattern
      // Matches patterns like: "20 Contacts", "1 Contact", with optional case sensitivity
      await expect(page.getByText(/\d+\s*Contacts?/i)).toBeVisible();
      await expect(page.getByText('705 Pike St, Seattle , Washington ,')).toBeVisible();
    });

    // Step 8: Verify line items
    await executeStep('Verify job line items', async () => {
      await jobPage.verifyLineItems(['#T1 - 001 - Monitor', '#T2 - 002 - Keyboard', '#T4 - 004 - Mobile']);

      // Switch back to Details tab
      await page.getByRole('button', { name: 'Details' }).click();
    });

    // Step 9: Request materials from job
    await executeStep('Request materials from job', async () => {
      await page.getByRole('button', { name: 'Line Items' }).click();
      await jobPage.requestMaterialFromJob(testData.materialRequestFromJob.products);
    });

    // Step 10: Verify MR form is displayed
    await executeStep('Verify material request form', async () => {
      await expect(page.getByRole('textbox', { name: 'Material Request Title *' })).toBeVisible();

      // Verify products are added
      for (const product of testData.materialRequestFromJob.verifyProducts) {
        await expect(page.getByRole('link', { name: product })).toBeVisible();
      }
      // Reuse the MaterialRequestPage saveAndSubmit method
      await materialRequestPage.saveAndSubmit();
      console.log('✓ Material Request saved and submitted successfully');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/material_requests\/.*\/details/);
      console.log('✓ Navigated to Material Request details page');
    });

    // // Step 11: Verify MR details
    // await executeStep('Verify material request details', async () => {
    //   // Verify MR was created
    //   // await expect(page.getByRole('definition').filter({ hasText: 'Direct Shipment to Job\'s site' })).toBeVisible();
    // });

    // Step 11: Navigate back to job and verify MR status
    await executeStep('Verify job shows waiting for MR status', async () => {
      const jobLinkPromise = page.waitForEvent('popup');
      await page.getByRole('link', { name: testData.job.title, exact: true }).click();
      const jobDetailsPage = await jobLinkPromise;
      await jobDetailsPage.waitForLoadState('networkidle');

      await expect(jobDetailsPage.locator('span').filter({ hasText: 'Waiting for MR' }).first()).toBeVisible();

      //Close the job details page and go back to MR page
      await jobDetailsPage.close();
      
    });

    // Step 12: Create Purchase Order from MR
    await executeStep('Create purchase order from material request', async () => {
      // We're already on the MR page from Step 11, so just create PO directly
      await materialRequestPage.createPOFromMR('Zuper Pro');
    });

    // Step 13: Open and verify Purchase Order
    await executeStep('Open and verify purchase order', async () => {
      // Reuse the MaterialRequestPage openPurchaseOrder method
      poPage = await materialRequestPage.openPurchaseOrder();

      // Verify PO details
      await expect(poPage.getByTitle('Zuper Pro')).toBeVisible();
      await expect(poPage.getByLabel('Vendor').getByText('4/63,4/780, Valmiki Nagar,')).toBeVisible();

      // Initialize PO page object with the new page
      purchaseOrderPage = new PurchaseOrderPage(poPage);
    });

    // Step 14: Process Purchase Order through workflow
    await executeStep('Process purchase order workflow', async () => {
      await purchaseOrderPage.markAsSubmitted();
      await purchaseOrderPage.markAsSentToVendor();
      await purchaseOrderPage.markAsVendorAccepted();
      // // Verify status changed - look for status badge/chip, not buttons or dialog text
      // await expect(poPage.locator('.status, [class*="status"], .badge, [class*="badge"]').filter({ hasText: 'Vendor Accepted' }).first()).toBeVisible();
    
      await purchaseOrderPage.updateReceivedQuantities(testData.purchaseOrder.receivedQuantities);
      await purchaseOrderPage.clickUpdateButton();

      // await expect(poPage.locator('span').filter({ hasText: 'Fulfilled' }).first()).toBeVisible();
    });

    // Step 15: Verify received quantities
    await executeStep('Verify PO items received quantities', async () => {
      await poPage.getByRole('button', { name: 'PO Items' }).click();

      await expect(poPage.getByRole('cell', { name: '1' }).nth(2)).toBeVisible();
      await expect(poPage.getByRole('cell', { name: '1' }).nth(3)).toBeVisible();
      await expect(poPage.getByRole('cell', { name: '1' }).nth(4)).toBeVisible();
      await expect(poPage.getByRole('cell', { name: '1' }).nth(5)).toBeVisible();

      await expect(poPage.locator('span').filter({ hasText: 'Received' }).first()).toBeVisible();
    });

    // Step 16: Complete PO workflow
    await executeStep('Complete purchase order workflow (Invoiced → Paid → Closed)', async () => {
      await purchaseOrderPage.markAsInvoiced();
      // await expect(poPage.locator('span').filter({ hasText: 'Invoiced' }).first()).toBeVisible();

      await purchaseOrderPage.markAsPaid();
      // await expect(poPage.locator('span').filter({ hasText: 'Paid' }).first()).toBeVisible();

      await purchaseOrderPage.markAsClosed();
      // await expect(poPage.locator('span').filter({ hasText: 'Closed' }).first()).toBeVisible();
    });

    // // Step 19: Verify MR status after PO completion
    // await executeStep('Verify material request status after PO completion', async () => {
    //   const mrPagePromise = poPage.waitForEvent('popup');
    //   await poPage.getByRole('link', { name: /MR for Job/, exact: true }).click();
    //   mrPage = await mrPagePromise;
    //   await mrPage.waitForLoadState('networkidle');

    //   await expect(mrPage.getByRole('link', { name: testData.job.title, exact: true })).toBeVisible();
    // });

    // Step 17: Navigate to job and update status to Completed
    await executeStep('Update job status to Completed', async () => {
      // Navigate back to job from PO page
      const jobLinkPromise = poPage.waitForEvent('popup');
      await poPage.getByRole('link', { name: testData.job.title, exact: true }).click();
      const jobDetailsPage = await jobLinkPromise;
      await jobDetailsPage.waitForLoadState('networkidle');

      // Update job status to Completed using JobPage methods
      const jobPageObj = new JobPage(jobDetailsPage);
      await jobPageObj.updateJobStatus('Completed', true);

      // Verify status was updated
      await expect(jobDetailsPage.locator('span').filter({ hasText: 'Completed' }).first()).toBeVisible();

      console.log('✓ Job status updated to Completed successfully');
    });

    // Mark test as passed if all steps succeeded
    testResults.overallStatus = 'PASSED';
    console.log('\n✓ Complete workflow test passed successfully!');
  });
});
