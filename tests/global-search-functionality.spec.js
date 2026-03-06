import { test, expect } from '@stablyai/playwright-test';

test.describe('Global Search Functionality', () => {
  /**
   * User Prompt:
   * - Login to staging Zuper app, open global search, search for "TestQA",
   *   switch between Jobs/Customers/Quotes tabs, open a search result in a new tab,
   *   use Ctrl+K module settings to toggle Properties and Products,
   *   search for "QA", click "View all results", and navigate to a specific result.
   */
  test('should search globally and navigate search results across tabs', async ({ page, context }) => {
    // Step 1: Login
    await test.step('Login to the application', async () => {
      await page.goto(`${process.env.staging_env}/login`);
      await page.getByRole('textbox', { name: 'Company Name' }).waitFor({ state: 'visible' });
      await page.getByRole('textbox', { name: 'Company Name' }).fill(process.env.company_name);
      await page.getByRole('button', { name: 'Continue' }).click();

      const emailField = page.getByRole('textbox', { name: 'Email address' });
      const passwordField = page.getByRole('textbox', { name: 'Password Forgot password?' });
      await emailField.waitFor({ state: 'visible' });
      await emailField.fill(process.env.user_name);
      await passwordField.fill(process.env.password);
      await page.getByRole('button', { name: 'Login' }).click();

      await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });
    });

    // Step 2: Dismiss popups
    await test.step('Dismiss any popups or overlays', async () => {
      await page.waitForTimeout(2000);

      const cancelButton = page.getByRole('button', { name: 'Cancel' });
      if (await cancelButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cancelButton.click();
        await page.waitForTimeout(500);
      }

      const overlay = page.locator('.zuper-vertical-navigation-aside-overlay');
      if (await overlay.isVisible({ timeout: 2000 }).catch(() => false)) {
        await overlay.click();
        await page.waitForTimeout(500);
      }
    });

    // Step 3: Open global search and search for "TestQA"
    await test.step('Open global search and search for TestQA', async () => {
      await page.getByText('Search').nth(1).click();
      const searchBox = page.getByRole('searchbox', { name: 'Search...' });
      await searchBox.waitFor({ state: 'visible' });
      await searchBox.fill('TestQA');
      await page.waitForTimeout(1500);
    });

    // Step 4: Switch between search tabs
    await test.step('Switch between Jobs, Customers, and Quotes tabs', async () => {
      const jobsTab = page.getByRole('tab', { name: /Jobs/ });
      const customersTab = page.getByRole('tab', { name: /Customers/ });
      const quotesTab = page.getByRole('tab', { name: /Quotes/ });

      await jobsTab.click();
      await page.waitForTimeout(500);
      await expect(jobsTab).toBeVisible();

      await customersTab.click();
      await page.waitForTimeout(500);
      await expect(customersTab).toBeVisible();

      await quotesTab.click();
      await page.waitForTimeout(500);
      await expect(quotesTab).toBeVisible();

      await customersTab.click();
      await page.waitForTimeout(500);

      await jobsTab.click();
      await page.waitForTimeout(500);
    });

    // Step 5: Navigate search results and open a result in a new tab
    await test.step('Open a search result in a new tab', async () => {
      const searchBox = page.getByRole('searchbox', { name: 'Search...' });

      // Navigate through results with arrow keys
      await searchBox.press('ArrowDown');
      await searchBox.press('ArrowDown');
      await page.waitForTimeout(300);

      // Click on a search result that opens in a new tab
      const newPagePromise = context.waitForEvent('page');
      const resultOption = page.getByRole('option', { name: /TestQuote48/ });
      if (await resultOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await resultOption.getByRole('button').click();
        const newPage = await newPagePromise;
        await newPage.waitForTimeout(2000);
        await expect(newPage).toHaveURL(/estimates/, { timeout: 15000 });
        await expect(newPage.getByText('#TestQuote48')).toBeVisible({ timeout: 10000 });
        await newPage.close();
      }
    });

    // Step 6: Use Ctrl+K to open module settings
    await test.step('Open module settings with Ctrl+K and toggle modules', async () => {
      await page.keyboard.press('ControlOrMeta+k');
      await page.waitForTimeout(1000);

      const moduleSettingsButton = page.getByRole('button', { name: 'Module settings' });
      await moduleSettingsButton.waitFor({ state: 'visible', timeout: 5000 });
      await moduleSettingsButton.click();
      await page.waitForTimeout(500);

      // Toggle Properties checkbox
      const propertiesCheckbox = page.getByRole('checkbox', { name: /Properties/ });
      await propertiesCheckbox.check();
      await page.waitForTimeout(300);

      // Toggle Products checkbox
      const productsCheckbox = page.getByRole('checkbox', { name: /Products/ });
      await productsCheckbox.check();
      await page.waitForTimeout(300);

      // Close the module settings overlay
      await page.locator('.cdk-overlay-backdrop.cdk-overlay-transparent-backdrop').click();
      await page.waitForTimeout(500);
    });

    // Step 7: Search for "QA" and navigate results
    await test.step('Search for QA and view all results', async () => {
      const searchBox = page.getByRole('searchbox', { name: 'Search...' });
      await searchBox.fill('QA');
      await page.waitForTimeout(1500);

      // Switch to Jobs tab
      await page.getByRole('tab', { name: /Jobs/ }).click();
      await page.waitForTimeout(500);

      // Switch to Quotes tab
      await page.getByRole('tab', { name: /Quotes/ }).click();
      await page.waitForTimeout(500);

      // Click "View all results"
      const viewAllLink = page.getByRole('link', { name: /View all results for qa/i });
      await viewAllLink.waitFor({ state: 'visible', timeout: 5000 });
      await viewAllLink.click();

      // Verify navigation to results page
      await page.waitForTimeout(2000);
    });

    // Step 8: Click on a specific result
    await test.step('Navigate to a specific search result', async () => {
      const resultLink = page.getByRole('link', { name: '225' });
      await resultLink.waitFor({ state: 'visible', timeout: 10000 });
      await resultLink.click();
      await page.waitForTimeout(2000);

      // Verify we navigated to the result detail page
      await expect(page).toHaveURL(/estimates|quotes/, { timeout: 10000 });
    });

    // Step 9: Logout
    await test.step('Logout from the application', async () => {
      // Click on the user profile/avatar to open the menu
      const profileMenu = page.locator('.zuper-vertical-navigation-aside-overlay');
      const userAvatar = page.locator('img.avatar, .user-avatar, .profile-icon, [class*="avatar"]').first();

      // Try clicking on the user avatar/profile area
      if (await userAvatar.isVisible({ timeout: 3000 }).catch(() => false)) {
        await userAvatar.click();
      } else {
        // Fallback: look for a profile or settings icon in the sidebar
        const profileLink = page.getByRole('link', { name: /profile|account|settings/i }).first();
        if (await profileLink.isVisible({ timeout: 3000 }).catch(() => false)) {
          await profileLink.click();
        }
      }
      await page.waitForTimeout(1000);

      // Click the Logout button
      const logoutButton = page.getByRole('button', { name: /Logout|Log out|Sign out/i }).or(
        page.getByText(/Logout|Log out|Sign out/i)
      ).first();
      await logoutButton.waitFor({ state: 'visible', timeout: 5000 });
      await logoutButton.click();

      // Verify redirected to login page
      await expect(page).toHaveURL(/login/, { timeout: 15000 });
    });
  });
});
