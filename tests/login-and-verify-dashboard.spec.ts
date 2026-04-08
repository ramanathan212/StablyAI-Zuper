import { test, expect } from '@stablyai/playwright-test';
import {
  loginToApp,
  dismissPopups,
  loginAndDismissPopups,
} from './helpers/auth.helper';
import {
  navigateToJobs,
  navigateToOrganizations,
  openNewOrganizationForm,
  fillAndSaveOrganization,
} from './helpers/navigation.helper';

test.describe('Authentication to Organization Management', () => {
  /**
   * User Prompt:
   * - Add a Playwright test suite covering the end-to-end flow from
   *   authentication to organization management.
   * - Implement robust login and navigation logic using page.evaluate
   *   to bypass UI overlays and banner obstructions.
   * - Automate organization creation with unique naming conventions
   *   and Google Maps address autocomplete integration.
   * - Include handling for recurring UI popups such as timezone settings
   *   and notification prompts to ensure test stability.
   */

  test('should authenticate and display the dashboard', async ({ page }) => {
    // Login using page.evaluate to bypass banner overlay
    await loginToApp({ page });

    // Verify dashboard is displayed
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page).toHaveTitle(/Dashboard/);

    // Dismiss recurring popups (timezone, notifications)
    await dismissPopups({ page });

    // Verify key dashboard widgets are present after popups are cleared
    await expect(page.getByText('Jobs By Category').first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('Job Statistics').first()).toBeVisible();
  });

  test('should navigate to the Jobs page from the dashboard', async ({
    page,
  }) => {
    await loginAndDismissPopups({ page });

    // Navigate to Jobs via sidebar
    await navigateToJobs({ page });

    // Verify Jobs page loaded
    await expect(page).toHaveURL(/\/jobs/);
    await expect(page).toHaveTitle(/Jobs/);
  });

  test('should navigate to the Organizations list page', async ({ page }) => {
    await loginAndDismissPopups({ page });

    // Navigate to Organizations via sidebar
    await navigateToOrganizations({ page });

    // Verify Organizations page loaded
    await expect(page).toHaveURL(/\/organizations/);
    await expect(page).toHaveTitle(/Organizations/);

    // Verify the "New Organization" action is available
    await expect(
      page.getByRole('link', { name: ' New Organization' })
    ).toBeVisible({ timeout: 10000 });
  });

  test('should create a new organization with complete details', async ({
    page,
  }) => {
    await loginAndDismissPopups({ page });

    // Navigate to Organizations and open the new form
    await navigateToOrganizations({ page });
    await openNewOrganizationForm({ page });

    // Generate unique name/email to avoid 409 Conflict on repeated runs
    const uniqueSuffix = Date.now().toString().slice(-6);
    const orgName = `test uat8/4_${uniqueSuffix}`;
    const orgEmail = `uat8_4_${uniqueSuffix}@gmail.com`;

    // Fill the form and save — address autocomplete + Same As Service Address
    await fillAndSaveOrganization({
      page,
      orgName,
      orgEmail,
      streetSearch: '4/966 Gandhi St Perungudi Chennai',
    });

    // Verify the organization was created and we're on its detail page
    await expect(page).toHaveURL(/\/organizations\/.*\/details/, {
      timeout: 30000,
    });
    await expect(page).toHaveTitle(
      new RegExp(orgName.replace(/[/]/g, '\\/'))
    );
  });
});
