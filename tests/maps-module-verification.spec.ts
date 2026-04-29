import { test, expect } from '@stablyai/playwright-test';
import { LoginPage } from './pages/LoginPage.js';

// Override base config's aggressive cache-disabling which prevents external
// map tile libraries (Leaflet / OpenStreetMap) from loading properly.
// Also pre-configure geolocation so the Maps component can initialize.
test.use({
  launchOptions: {
    args: ['--disable-blink-features=AutomationControlled'],
  },
  contextOptions: {
    serviceWorkers: 'allow' as const,
  },
  geolocation: { latitude: 13.0827, longitude: 80.2707 },
  permissions: ['geolocation'],
});

test.describe('Maps Module Verification', () => {
  test.beforeEach(async ({ page }) => {
    const companyName = process.env.companyName!;
    const email = process.env.email!;
    const password = process.env.password!;

    const loginPage = new LoginPage(page);
    await loginPage.login(companyName, email, password);
    await loginPage.dismissOnboarding();
  });

  /**
   * User Prompt:
   * - Navigate to the Maps module.
   * - Verify the map loads successfully.
   * - Verify that location-based data (users/jobs or entries) is displayed.
   * - Verify that switching tabs (Users, Jobs, etc.) loads data successfully.
   * - If the map or data does not load, mark the test as failed indicating a possible location permission issue.
   */
  test('should load Maps module, display location data, and switch tabs successfully', async ({
    page,
  }) => {
    await test.step('Navigate to Maps module', async () => {
      await page.goto('/maps');

      await expect(page).toHaveURL(/\/maps/, { timeout: 30000 });
      await expect(page).toHaveTitle(/Maps/, { timeout: 30000 });

      // Wait for Angular Maps component to finish rendering (tabs appear)
      await page.locator('nav').filter({ hasText: 'Users' }).waitFor({
        state: 'visible',
        timeout: 30000,
      });
    });

    await test.step('Dismiss all popups on Maps page', async () => {
      // 1. Dismiss timezone popup if present ("Your timezone has changed")
      const cancelBtn = page.getByRole('button', { name: 'Cancel' });
      if (await cancelBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await cancelBtn.click();
        await page.waitForTimeout(500);
      }

      // 2. Dismiss geolocation popup if present ("Geo-location service not enabled")
      const geoPopupOk = page.getByRole('button', { name: 'OK' });
      if (await geoPopupOk.isVisible({ timeout: 3000 }).catch(() => false)) {
        await geoPopupOk.click();
        await page.waitForTimeout(500);
      }

      // 3. Dismiss notification permission popup if present
      const noThanksBtn = page.getByRole('button', { name: 'No, thanks' });
      if (await noThanksBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await noThanksBtn.click();
        await page.waitForTimeout(500);
      }
    });

    await test.step('Verify map loads successfully', async () => {
      // Verify the Angular map component wrapper rendered
      const mapWrapper = page.locator('.map-container');
      await expect(
        mapWrapper,
        'Map container should render. If not found, the Maps module failed to load — possible location permission issue.'
      ).toBeAttached({ timeout: 20000 });

      // Verify Leaflet map library initialized (creates .leaflet-container inside .map-container)
      // Leaflet loads asynchronously; retry until it appears
      await expect(async () => {
        const leafletStatus = await page.evaluate(() => {
          const lc = document.querySelector('.leaflet-container');
          if (!lc) return 'not-found';
          return lc.offsetWidth > 0 ? 'visible' : 'zero-size';
        });
        expect(
          leafletStatus,
          'Leaflet map container should initialize. If "not-found", the map library did not load — possible location permission or network issue.'
        ).toBe('visible');
      }).toPass({ timeout: 30000 });

      // Verify map tiles have loaded (confirms tile server connectivity)
      await expect(async () => {
        const tileCount = await page.evaluate(
          () => document.querySelectorAll('.leaflet-tile-loaded').length
        );
        expect(
          tileCount,
          'Map tiles should be loaded. If 0, this may indicate a location permission issue preventing map rendering.'
        ).toBeGreaterThan(0);
      }).toPass({ timeout: 15000 });
    });

    await test.step('Verify map tabs are visible', async () => {
      const tabsNav = page.locator('nav').filter({ hasText: 'Users' });
      await expect(tabsNav).toBeVisible();

      const expectedTabs = [
        'Users',
        'Jobs',
        'Routes',
        'Assets',
        'Properties',
        'Customers',
        'Organizations',
      ];
      for (const tabName of expectedTabs) {
        const tab = tabsNav.locator('a').filter({ hasText: tabName });
        await expect(tab).toBeVisible();
      }
    });

    await test.step('Verify location-based data is displayed', async () => {
      // Map controls should be visible indicating the map is functional
      const zoomIn = page.getByRole('button', { name: 'Zoom in' });
      await expect(zoomIn).toBeVisible();

      const addressSearch = page.getByRole('textbox', { name: 'Enter an address' });
      await expect(addressSearch).toBeVisible();

      // Verify the left panel shows user/entity data with a count
      // The Users tab shows "Users <count>" header and Online/Offline status
      const usersHeader = page.locator('text=/Users\\s+\\d+/').first();
      await expect(
        usersHeader,
        'Users panel should display a count of entries (e.g. "Users 44"). If not visible, location-based data may not be loading.'
      ).toBeVisible({ timeout: 10000 });

      // Verify pagination select is attached (it exists in DOM but is below the scroll area)
      const paginationSelect = page.locator('select#page-size');
      await expect(paginationSelect).toBeAttached();
    });

    await test.step('Verify switching to Jobs tab loads data', async () => {
      const tabsNav = page.locator('nav').filter({ hasText: 'Users' });
      const jobsTab = tabsNav.locator('a').filter({ hasText: 'Jobs' });
      await jobsTab.click();

      // Active tab gets bg-indigo class
      await expect(jobsTab).toHaveClass(/bg-indigo/, { timeout: 10000 });

      // Map should retain tiles after tab switch
      await expect(async () => {
        const tileCount = await page.evaluate(
          () => document.querySelectorAll('.leaflet-tile-loaded').length
        );
        expect(tileCount).toBeGreaterThan(0);
      }).toPass({ timeout: 10000 });
    });

    await test.step('Verify switching to Users tab loads data', async () => {
      const tabsNav = page.locator('nav').filter({ hasText: 'Users' });
      const usersTab = tabsNav.locator('a').filter({ hasText: 'Users' }).first();
      await usersTab.click();

      await expect(usersTab).toHaveClass(/bg-indigo/, { timeout: 10000 });

      // Map should still be visible
      await expect(page.locator('.leaflet-container')).toBeVisible();
    });

    await test.step('Verify switching to Properties tab loads data', async () => {
      const tabsNav = page.locator('nav').filter({ hasText: 'Users' });
      const propertiesTab = tabsNav.locator('a').filter({ hasText: 'Properties' });
      await propertiesTab.click();

      await expect(propertiesTab).toHaveClass(/bg-indigo/, { timeout: 10000 });

      // Map container should remain visible and tiles should still be present
      await expect(page.locator('.leaflet-container')).toBeVisible();

      await expect(async () => {
        const tileCount = await page.evaluate(
          () => document.querySelectorAll('.leaflet-tile-loaded').length
        );
        expect(
          tileCount,
          'Map tiles should remain loaded after switching tabs. If 0, this may indicate a location permission issue.'
        ).toBeGreaterThan(0);
      }).toPass({ timeout: 10000 });
    });
  });
});
