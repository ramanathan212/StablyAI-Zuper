import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage.js';
import { PartsPage } from './pages/PartsPage.js';
import { devStagingData } from './config/dev-staging-data.js';
import {
  getDevTestReadyPart,
  getDevTestReadyParts,
  getDevPartsMix
} from './utils/dev-staging-helper.js';

/**
 * Test Suite: Create Parts & Services - Development/Staging Environment
 *
 * This test suite is specifically configured for Development and Staging environments.
 * Uses dedicated login credentials and test data for dev/staging.
 *
 * Login Credentials:
 * - Company: sofyaizuper
 * - Email: ramanathan.m@zuper.co
 * - Password: Test@123
 */

test.describe('Parts & Services Creation - Development Environment', () => {
  let loginPage;
  let partsPage;

  test.beforeEach(async ({ page }) => {
    // Initialize page objects with development URL
    loginPage = new LoginPage(page, devStagingData.urls.development);
    partsPage = new PartsPage(page);

    // Perform login using dev/staging credentials
    await loginPage.navigate();
    await loginPage.login(
      devStagingData.login.companyName,
      devStagingData.login.email,
      devStagingData.login.password
    );

    // Dismiss onboarding if present
    await loginPage.dismissOnboarding();
  });

  test('should create a random part from catalog', async ({ page }) => {
    // Get a random part from the entire catalog
    const randomPart = getDevTestReadyPart();

    console.log(`[DEV] Creating part: ${randomPart.name}`);

    // Create part using page object
    await partsPage.createPart(randomPart);

    // Verify success
    await expect(page).toHaveURL(/.*parts/);
  });

  test('should create a random pipe part', async ({ page }) => {
    // Get a random part from pipes category
    const pipePart = getDevTestReadyPart('pipes');

    console.log(`[DEV] Creating pipe: ${pipePart.name} (${pipePart.partNumber})`);

    // Create part using page object
    await partsPage.createPart(pipePart);

    // Verify success
    await expect(page).toHaveURL(/.*parts/);
  });

  test('should create a random valve part', async ({ page }) => {
    // Get a random part from valves category
    const valvePart = getDevTestReadyPart('valves');

    console.log(`[DEV] Creating valve: ${valvePart.name} (${valvePart.partNumber})`);

    // Create part using page object
    await partsPage.createPart(valvePart);

    // Verify success
    await expect(page).toHaveURL(/.*parts/);
  });

  test('should create a random fitting part', async ({ page }) => {
    // Get a random part from fittings category
    const fittingPart = getDevTestReadyPart('fittings');

    console.log(`[DEV] Creating fitting: ${fittingPart.name} (${fittingPart.partNumber})`);

    // Create part using page object
    await partsPage.createPart(fittingPart);

    // Verify success
    await expect(page).toHaveURL(/.*parts/);
  });

  test('should create a random fixture part', async ({ page }) => {
    // Get a random part from fixtures category
    const fixturePart = getDevTestReadyPart('fixtures');

    console.log(`[DEV] Creating fixture: ${fixturePart.name} (${fixturePart.partNumber})`);

    // Create part using page object
    await partsPage.createPart(fixturePart);

    // Verify success
    await expect(page).toHaveURL(/.*parts/);
  });

  test('should create a random drainage part', async ({ page }) => {
    // Get a random part from drainage category
    const drainagePart = getDevTestReadyPart('drainage');

    console.log(`[DEV] Creating drainage: ${drainagePart.name} (${drainagePart.partNumber})`);

    // Create part using page object
    await partsPage.createPart(drainagePart);

    // Verify success
    await expect(page).toHaveURL(/.*parts/);
  });

  test('should create multiple random parts from catalog', async ({ page }) => {
    // Get 3 random unique parts
    const partsToCreate = getDevTestReadyParts(3);

    console.log(`[DEV] Creating ${partsToCreate.length} random parts`);

    for (const partData of partsToCreate) {
      console.log(`  - Creating: ${partData.name} (${partData.partNumber})`);
      await partsPage.createPart(partData);
      // Small delay between creations
      await page.waitForTimeout(1000);
    }
  });

  test('should create a mixed set of parts (pipes, valves, fittings)', async ({ page }) => {
    // Get a specific mix of parts: 2 pipes, 1 valve, 2 fittings
    const partsMix = getDevPartsMix({
      pipes: 2,
      valves: 1,
      fittings: 2
    });

    console.log(`[DEV] Creating ${partsMix.length} parts from mixed categories`);

    for (const partData of partsMix) {
      console.log(`  - Creating: ${partData.name}`);
      await partsPage.createPart(partData);
      await page.waitForTimeout(1000);
    }
  });

  test('should create all category parts (1 from each)', async ({ page }) => {
    // Create one part from each category
    const partsMix = getDevPartsMix({
      pipes: 1,
      fittings: 1,
      valves: 1,
      fixtures: 1,
      drainage: 1
    });

    console.log(`[DEV] Creating one part from each category`);

    for (const partData of partsMix) {
      console.log(`  - Creating: ${partData.name}`);
      await partsPage.createPart(partData);
      await page.waitForTimeout(1000);
    }
  });
});

/**
 * Test Suite for Staging Environment
 * Uncomment and update staging URL if needed
 */
/*
test.describe('Parts & Services Creation - Staging Environment', () => {
  let loginPage;
  let partsPage;

  test.beforeEach(async ({ page }) => {
    // Initialize page objects with staging URL
    loginPage = new LoginPage(page, devStagingData.urls.staging);
    partsPage = new PartsPage(page);

    // Perform login using dev/staging credentials
    await loginPage.navigate();
    await loginPage.login(
      devStagingData.login.companyName,
      devStagingData.login.email,
      devStagingData.login.password
    );

    // Dismiss onboarding if present
    await loginPage.dismissOnboarding();
  });

  test('should create a random part in staging', async ({ page }) => {
    const randomPart = getDevTestReadyPart();
    console.log(`[STAGING] Creating part: ${randomPart.name}`);
    await partsPage.createPart(randomPart);
    await expect(page).toHaveURL(/.*parts/);
  });
});
*/
