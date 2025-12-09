import { test, expect } from '@playwright/test';
import { VendorPage } from './pages/VendorPage.js';
import { MaterialRequestPage } from './pages/MaterialRequestPage.js';
import { PurchaseOrderPage } from './pages/PurchaseOrderPage.js';
import { testData } from './test-data.js';

test.describe('Complete Vendor, MR, and PO Flow', () => {
  let vendorPage;
  let materialRequestPage;
  let purchaseOrderPage;

  // Test results tracking
  const testResults = {
    testName: 'Complete Vendor, MR, and PO Workflow',
    startTime: null,
    endTime: null,
    duration: null,
    steps: [],
    overallStatus: 'PENDING'
  };

  test.beforeEach(async ({ page }) => {
    vendorPage = new VendorPage(page);
    materialRequestPage = new MaterialRequestPage(page);
    purchaseOrderPage = new PurchaseOrderPage(page);

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

  test('should complete full vendor, material request, and purchase order workflow', async ({ page }) => {
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

    // Authentication is handled by global-setup.js
    // The test will start with an authenticated session
    // Navigate to the app first to ensure we're on an authenticated page
    // await page.goto('/dashboard');
    // await page.waitForLoadState('networkidle');

    // Step 1: Create Vendor
    await executeStep('Create new vendor', async () => {
      await vendorPage.navigateToVendors();
      await vendorPage.clickNewVendor();

      // Fill vendor basic information
      await vendorPage.fillVendorBasicInfo(testData.vendor);

      // Add products
      await vendorPage.addProducts(testData.vendor.products);

      // Update work number (required after product selection)
      await vendorPage.vendorWorkNumberInput.click();
      await vendorPage.vendorWorkNumberInput.fill(testData.vendor.workNumber);

      // Add billing address
      await vendorPage.addBillingAddress(testData.vendor.billingAddress);

      // Add bank details
      await vendorPage.addBankDetails(testData.vendor.bankDetails);

      // Save vendor
      await vendorPage.saveVendor();

      // Verify vendor creation
      await expect(page).toHaveURL(/\/vendors\/.*\/details/);
    });

    // Step 2: Create Material Request
    let mrNumber;
    await executeStep('Create material request', async () => {
      await materialRequestPage.navigateToMaterialRequests();
      await materialRequestPage.clickNewMaterialRequest();

      // Fill MR basic information
      await materialRequestPage.fillMRBasicInfo(testData.materialRequest);

      // Link job/quote
      await materialRequestPage.linkJobQuote(
        testData.materialRequest.jobSearch,
        testData.materialRequest.jobNumber
      );

      // Add products
      await materialRequestPage.addProducts(testData.materialRequest.products);

      // Save and submit
      await materialRequestPage.saveAndSubmit();

      // Verify MR is in correct state
      await expect(page).toHaveURL(/\/material_requests\/.*\/details/);
    });

    // Step 3: Create Purchase Order from MR
    let poPage;
    await executeStep('Create purchase order from material request', async () => {
      // Create PO from MR with vendor selection
      await materialRequestPage.createPOFromMR(testData.purchaseOrder.vendor);

      // Open the created purchase order
      poPage = await materialRequestPage.openPurchaseOrder();

      // Verify PO was created
      await expect(poPage).toHaveURL(/\/purchase_order\/.*\/details/);
    });

    // Step 4: Process Purchase Order
    await executeStep('Process purchase order through workflow', async () => {
      purchaseOrderPage = new PurchaseOrderPage(poPage);

      // Mark as submitted
      await purchaseOrderPage.markAsSubmitted();

      // Mark as sent to vendor
      await purchaseOrderPage.markAsSentToVendor();

      // Mark as vendor accepted
      await purchaseOrderPage.markAsVendorAccepted();

      // Update received quantities
      await purchaseOrderPage.updateReceivedQuantities(
        testData.purchaseOrder.receivedQuantities
      );

      // Click update button to save received quantities
      await purchaseOrderPage.clickUpdateButton();

      // //Click update Mark as Invoiced
      // await purchaseOrderPage.markAsInvoiced();

      // //Click Mark as Paid
      // await purchaseOrderPage.markAsPaid();

      // Mark as closed
      // await purchaseOrderPage.markAsClosed();

      // Verify PO is closed
    //   await expect(poPage.locator('.status, .po-status, [class*="status"]')).toContainText(/closed/i, { timeout: 10000 });
    });

    // Step 5: Verify MR link from PO
    await executeStep('Verify material request link from purchase order', async () => {
      const mrPage = await purchaseOrderPage.openLinkedMR();

      // Verify we're on the MR page
      await expect(mrPage).toHaveURL(/\/material_requests\/.*\/details/);

      // Close the MR page
      await mrPage.close();
    });

    // Mark test as passed if all steps succeeded
    testResults.overallStatus = 'PASSED';
    console.log('\n✓ Complete workflow test passed successfully!');

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
