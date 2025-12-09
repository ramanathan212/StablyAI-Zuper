import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage.js';
import { PartsPage } from './pages/PartsPage.js';
import { testData } from './test-data.js';
import {
  getTestReadyPart,
  getTestReadyParts,
  getPartsMix
} from './utils/parts-helper.js';

/**
 * Test Suite: Create Parts & Services
 *
 * This test suite validates the creation of parts/services in the system.
 * It uses the Page Object Model for maintainability and reusability.
 * Parts are dynamically selected from the comprehensive parts catalog.
 */

test.describe('Parts & Services Creation', () => {
  let loginPage;
  let partsPage;

  test.beforeEach(async ({ page }) => {
    // Initialize page objects
    loginPage = new LoginPage(page, 'https://developmentv3.zuperpro.com/v7');
    partsPage = new PartsPage(page);

    // Perform login using reusable login functionality
    await loginPage.navigate();
    await loginPage.login(
      testData.login.companyName,
      testData.login.email,
      testData.login.password
    );

    // Dismiss onboarding if present
    await loginPage.dismissOnboarding();
  });

  test('should create a random part from catalog', async ({ page }) => {
    // Get a random part from the entire catalog
    const randomPart = getTestReadyPart();

    console.log(`Creating part: ${randomPart.name}`);

    // Create part using page object
    await partsPage.createPart(randomPart);

    // Verify success
    await expect(page).toHaveURL(/.*parts/);
  });

  test('should create a random pipe part', async ({ page }) => {
    // Get a random part from pipes category
    const pipePart = getTestReadyPart('pipes');

    console.log(`Creating pipe: ${pipePart.name} (${pipePart.partNumber})`);

    // Create part using page object
    await partsPage.createPart(pipePart);

    // Verify success
    await expect(page).toHaveURL(/.*parts/);
  });

  test('should create a random valve part', async ({ page }) => {
    // Get a random part from valves category
    const valvePart = getTestReadyPart('valves');

    console.log(`Creating valve: ${valvePart.name} (${valvePart.partNumber})`);

    // Create part using page object
    await partsPage.createPart(valvePart);

    // Verify success
    await expect(page).toHaveURL(/.*parts/);
  });

  test('should create multiple random parts from catalog', async ({ page }) => {
    // Get 3 random unique parts
    const partsToCreate = getTestReadyParts(3);

    for (const partData of partsToCreate) {
      console.log(`Creating part: ${partData.name} (${partData.partNumber})`);
      await partsPage.createPart(partData);
      // Small delay between creations
      await page.waitForTimeout(1000);
    }
  });

  test('should create a mixed set of parts (pipes, valves, fittings)', async ({ page }) => {
    // Get a specific mix of parts: 2 pipes, 1 valve, 2 fittings
    const partsMix = getPartsMix({
      pipes: 2,
      valves: 1,
      fittings: 2
    });

    console.log(`Creating ${partsMix.length} parts from mixed categories`);

    for (const partData of partsMix) {
      console.log(`  - Creating: ${partData.name}`);
      await partsPage.createPart(partData);
      await page.waitForTimeout(1000);
    }
  });
});

/**
 * Alternative: Using global authentication state (if configured)
 * This test uses pre-authenticated state from global-setup.js
 */
test.describe('Parts Creation - Using Global Auth', () => {
  test.use({ storageState: 'tests/.auth/user.json' });

  test('should create random part using stored authentication', async ({ page }) => {
    const partsPage = new PartsPage(page);

    // Navigate directly to the application (already authenticated)
    await page.goto('https://developmentv3.zuperpro.com/v7/dashboard');

    // Get a random part from catalog
    const randomPart = getTestReadyPart();
    console.log(`Creating part (with global auth): ${randomPart.name}`);

    // Create part
    await partsPage.createPart(randomPart);

    // Verify success
    await expect(page).toHaveURL(/.*parts/);
  });

  test('should create multiple fixtures using stored authentication', async ({ page }) => {
    const partsPage = new PartsPage(page);

    // Navigate directly to the application (already authenticated)
    await page.goto('https://developmentv3.zuperpro.com/v7/dashboard');

    // Get 2 random fixtures
    const fixtures = getTestReadyParts(2, 'fixtures');

    for (const fixture of fixtures) {
      console.log(`Creating fixture: ${fixture.name}`);
      await partsPage.createPart(fixture);
      await page.waitForTimeout(1000);
    }
  });
});
