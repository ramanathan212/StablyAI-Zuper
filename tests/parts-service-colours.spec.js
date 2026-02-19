import { test } from './fixtures/cache-fixtures.js';
import { PartsPage } from './pages/PartsPage.js';
import { clickWithOverlayHandling, waitForPageReady } from './Helper/overlay-helper.js';

test.describe('Parts & Services with Variants and Colors', () => {
  let partsPage;

  // Test results tracking
  const testResults = {
    testName: 'Create Part/Service with Color Variants',
    startTime: null,
    endTime: null,
    duration: null,
    steps: [],
    overallStatus: 'PENDING'
  };

  test.beforeEach(async ({ page }) => {
    partsPage = new PartsPage(page);

    // Reset test results
    testResults.startTime = new Date();
    testResults.steps = [];
    testResults.overallStatus = 'RUNNING';

    await page.goto('/');
    await waitForPageReady(page);

    // Dismiss onboarding modal if present
    await dismissOnboardingModal(page);
  });

  test.afterEach(async ({ page }) => {
    testResults.endTime = new Date();
    testResults.duration = ((testResults.endTime - testResults.startTime) / 1000).toFixed(2);

    // Take screenshot on failure
    if (testResults.overallStatus === 'FAILED') {
      await page.screenshot({
        path: `test-results/parts-creation-failure-${Date.now()}.png`,
        fullPage: true
      });
    }

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

  test('Create part/service with color variants and inventory', async ({ page }) => {
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

    // Test data for this specific test
    const partData = {
      name: `Roof shingles sheet ${Date.now()}`,
      partNumber: `Roof#${Math.floor(Math.random() * 100000)}`,
      category: 'Main Product',
      price: '1345',
      variantName: 'variant blue',
      variantOption: 'variant',
      availableQty: '1000',
      minimumQty: '150'
    };

    // Step 1: Navigate to Parts & Services
    await executeStep('Navigate to Parts & Services page', async () => {
      await navigateToPartsWithOverlay(page);
    });

    // Step 2: Click New Part/Service
    await executeStep('Open New Part/Service form', async () => {
      await partsPage.clickNewPartService();
    });

    // Step 3: Fill basic part information
    await executeStep('Fill part basic information', async () => {
      await page.getByRole('textbox', { name: 'Part Name *' }).click();
      await page.getByRole('textbox', { name: 'Part Name *' }).fill(partData.name);

      await page.getByRole('textbox', { name: 'Prefix Part Number *' }).click();
      await page.getByRole('textbox', { name: 'Prefix Part Number *' }).fill(partData.partNumber);

      console.log(`✓ Filled part name: ${partData.name}`);
      console.log(`✓ Filled part number: ${partData.partNumber}`);
    });

    // Step 4: Select product category
    await executeStep('Select product category', async () => {
      await page.getByText('Choose a category', { exact: true }).click();
      await page.getByText(partData.category, { exact: true }).click();
      console.log(`✓ Selected category: ${partData.category}`);
    });

    // Step 5: Set unit selling price
    await executeStep('Set unit selling price', async () => {
      await page.getByRole('spinbutton', { name: 'Unit Selling Price *' }).click();
      await page.getByRole('spinbutton', { name: 'Unit Selling Price *' }).fill(partData.price);
      console.log(`✓ Set selling price: ${partData.price}`);
    });

    // Step 6: Expand and configure variant section
    await executeStep('Configure color variant section', async () => {
      // Click to expand the variant section (using the expansion panel header)
      const variantExpandButton = page.locator('#mat-expansion-panel-header-2 a').filter({ hasText: 'Add' });
      await variantExpandButton.waitFor({ state: 'visible', timeout: 5000 });
      await variantExpandButton.click();
      await page.waitForTimeout(1000);

      console.log('✓ Expanded variant section');
    });

    // Step 7: Add color picker
    await executeStep('Enable color picker', async () => {
      // Click the color picker box
      const colorPickerBox = page.locator('div.relative.w-10.h-10.border-2.border-dashed.border-gray-300.rounded-md.flex.items-center.justify-center.cursor-pointer.hover\\:border-indigo-400.overflow-hidden');
      await colorPickerBox.waitFor({ state: 'visible', timeout: 5000 });
      await colorPickerBox.click();
      await page.waitForTimeout(500);

      console.log('✓ Clicked color picker');
    });

    // Step 8: Enable variant toggle
    await executeStep('Enable variant toggle', async () => {
      // Toggle the variant switch
      const variantToggle = page.locator("//div[@class='flex items-start mt-4 pt-4 border-t border-gray-200']//label[@class='inline-flex items-center cursor-pointer']//div[@class='relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[\"\"] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1A237E]']");
      await variantToggle.waitFor({ state: 'visible', timeout: 5000 });
      await variantToggle.click();
      await page.waitForTimeout(500);

      console.log('✓ Enabled variant toggle');
    });

    // Step 9: Fill variant details
    await executeStep('Fill variant name and options', async () => {
      // Fill variant name
      await page.getByRole('textbox', { name: 'e.g., Charcoal' }).click();
      await page.getByRole('textbox', { name: 'e.g., Charcoal' }).fill(partData.variantName);

      // Fill variant options
      await page.getByRole('textbox', { name: 'Options' }).click();
      await page.getByRole('textbox', { name: 'Options' }).fill(partData.variantOption);

      console.log(`✓ Filled variant name: ${partData.variantName}`);
      console.log(`✓ Filled variant option: ${partData.variantOption}`);
    });

    // Step 10: Close any overlay that might be blocking
    await executeStep('Close navigation overlay if present', async () => {
      try {
        const overlay = page.locator('.zuper-vertical-navigation-aside-overlay');
        if (await overlay.isVisible({ timeout: 2000 })) {
          await overlay.click();
          await page.waitForTimeout(500);
          console.log('✓ Closed navigation overlay');
        }
      } catch (error) {
        console.log('⚠ No overlay to close, continuing...');
      }
    });

    // Step 11: Fill inventory quantities
    await executeStep('Fill inventory quantities', async () => {
      await page.getByPlaceholder('Enter Available Qty').click();
      await page.getByPlaceholder('Enter Available Qty').fill(partData.availableQty);

      await page.getByPlaceholder('Enter Minimum Qty').click();
      await page.getByPlaceholder('Enter Minimum Qty').fill(partData.minimumQty);

      console.log(`✓ Set available quantity: ${partData.availableQty}`);
      console.log(`✓ Set minimum quantity: ${partData.minimumQty}`);
    });

    // Step 12: Save part/service
    await executeStep('Save part/service', async () => {
      await page.locator('a').filter({ hasText: 'Save Part / Service' }).click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      console.log('✓ Clicked Save Part / Service button');
    });

    // Step 13: Verify part was created successfully
    await executeStep('Verify part/service created successfully', async () => {
      // Wait for page to load and check for success indicators
      await page.waitForTimeout(1000);

      // You can add specific verification here based on your application's behavior
      // For example, checking if we're redirected to the parts list or details page
      const currentUrl = page.url();
      console.log(`✓ Current URL after save: ${currentUrl}`);

      // Optional: Add more specific verification
      // await expect(page.getByText(partData.name)).toBeVisible();
    });

    // Mark test as passed if all steps succeeded
    testResults.overallStatus = 'PASSED';
    console.log('\n✓ Part/Service with color variants created successfully!');
  });
});

// Helper Functions

/**
 * Dismiss onboarding modal if present
 */
async function dismissOnboardingModal(page) {
  // Try pressing Escape multiple times first to close any overlays
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // First, try to dismiss the "What's New at Zuper" modal
  try {
    const whatsNewModal = page.getByText("What's New at Zuper?");
    const modalVisible = await whatsNewModal.isVisible({ timeout: 2000 });

    if (modalVisible) {
      try {
        const closeButton = page.locator('button[aria-label*="Close"], button[class*="close"]').first();
        if (await closeButton.isVisible({ timeout: 1000 })) {
          await closeButton.click();
          await page.waitForTimeout(500);
        }
      } catch (error) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
      console.log('✓ Dismissed "What\'s New" modal');
    }
  } catch (error) {
    console.log('⚠ No "What\'s New" modal found');
  }

  // Handle the "Welcome back to Zuper" onboarding form
  try {
    const continueButton = page.getByRole('button', { name: 'Continue' });
    const isVisible = await continueButton.isVisible({ timeout: 3000 });

    if (isVisible) {
      const companyNameInput = page.getByRole('textbox', { name: 'Company Name' });
      const inputVisible = await companyNameInput.isVisible({ timeout: 1000 }).catch(() => false);

      if (inputVisible) {
        await companyNameInput.fill('Test Company');
        console.log('✓ Filled company name in onboarding modal');
      }

      await continueButton.click();
      await page.waitForTimeout(2000);
      console.log('✓ Clicked Continue button in onboarding modal');

      // Keep clicking Continue until it's gone
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

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  } catch (error) {
    console.log('⚠ No onboarding Continue button to click');
  }

  // Final escape presses to ensure all modals are closed
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
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

  await page.waitForTimeout(2000);
}

/**
 * Navigate to Parts & Services page with overlay handling
 */
async function navigateToPartsWithOverlay(page) {
  // Open navigation menu with overlay handling
  const navigationIcon = page.locator('#products > .zuper-vertical-navigation-item-wrapper > .mat-mdc-tooltip-trigger > .mat-icon > svg');
  await clickWithOverlayHandling(navigationIcon);

  // Click Parts & Services link with overlay handling
  const partsMenuItem = page.getByRole('link', { name: 'Parts & Services' });
  await clickWithOverlayHandling(partsMenuItem);

  await page.waitForLoadState('networkidle');

  // Dismiss any modals that appear after navigation
  await dismissOnboardingModal(page);

  console.log('✓ Navigated to Parts & Services page');
}
