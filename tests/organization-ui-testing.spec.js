import { test, expect } from '@stablyai/playwright-test';
import { LoginPage } from './pages/LoginPage.js';

test.describe('Organization Module - UI Testing', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login('zuper-pro', 'ragupathy.s@zuper.co', 'Test@1234');
    await loginPage.dismissOnboarding();
    const cancelBtn = page.getByRole('button', { name: 'Cancel' }).describe('Cancel timezone dialog');
    if (await cancelBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cancelBtn.click();
    }
  });

  /**
   * User Prompt:
   * - Log in this environment- https://uat.zuperpro.com/
   *   Company Name: zuper-pro, username: ragupathy.s@zuper.co, password: Test@1234
   * - After logged in Cancel the pop up in the dashboard
   * - Navigate to the Organization module and check all the UI testing like UI breaking, Icons, Click actions, Redirections, Alignment
   */
  test('Organization list page - UI elements, icons, click actions, redirections, and alignment', async ({ page }) => {
    await page.goto('/organizations');
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(2000);

    // === UI LAYOUT VERIFICATION ===
    await test.step('Verify Organizations page layout and header elements', async () => {
      await expect(page).toHaveTitle(/Organizations/);
      await expect(page).toHaveURL(/\/organizations/);

      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]').describe('Organizations breadcrumb');
      await expect(breadcrumb).toBeVisible();

      const newOrgLink = page.locator('a[href="/organizations/new"]').describe('New Organization button');
      await expect(newOrgLink).toBeVisible();
    });

    // === FILTER AND SEARCH UI ===
    await test.step('Verify filter bar and search elements', async () => {
      await expect(page.getByText('All Organizations').describe('All Organizations dropdown')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Filter' }).describe('Filter button')).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Search' }).describe('Search textbox')).toBeVisible();
      await expect(page.getByRole('button', { name: /Columns/ }).describe('Columns button')).toBeVisible();
    });

    // === TABLE STRUCTURE ===
    await test.step('Verify Organizations table headers', async () => {
      await expect(page.locator('table').first().describe('Organizations table')).toBeVisible();

      const headers = ['Organization Name', 'Status', 'Created By', 'Created On'];
      for (const header of headers) {
        await expect(page.getByRole('columnheader', { name: new RegExp(header) }).describe(`${header} header`)).toBeVisible();
      }
      await expect(page.getByRole('checkbox', { name: 'Select all' }).describe('Select all checkbox')).toBeVisible();
    });

    // === TABLE DATA ROWS ===
    await test.step('Verify table rows are interactive', async () => {
      const firstRow = page.locator('table tbody tr').first().describe('First data row');
      await expect(firstRow).toBeVisible();
      await expect(page.getByRole('checkbox', { name: 'Select row' }).first().describe('Row checkbox')).toBeVisible();

      const orgLink = firstRow.locator('a').first().describe('Org name link');
      await expect(orgLink).toBeVisible();
      await expect(orgLink).toHaveAttribute('href', /\/organizations\/.+\/details/);
    });

    // === CLICK ACTIONS ===
    await test.step('Verify filter and search click actions', async () => {
      await page.getByRole('button', { name: 'Filter' }).describe('Filter button').click();
      await page.waitForTimeout(1000);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      const overlay = page.locator('.cdk-overlay-backdrop').describe('CDK overlay');
      if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
        await overlay.click({ force: true });
        await page.waitForTimeout(500);
      }

      const searchBox = page.getByRole('textbox', { name: 'Search' }).describe('Search textbox');
      await searchBox.click({ force: true });
      await searchBox.fill('Zuper');
      await page.waitForTimeout(1500);
      await expect(searchBox).toHaveValue('Zuper');
      await searchBox.clear();
      await page.waitForTimeout(1500);
    });

    // === REDIRECTIONS ===
    await test.step('Verify New Organization button redirects correctly', async () => {
      await page.locator('a[href="/organizations/new"]').describe('New Organization button').click();
      await page.waitForTimeout(3000);
      await expect(page).toHaveURL(/\/organizations\/new/);
      await page.goBack();
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
      await page.waitForTimeout(2000);
    });

    await test.step('Verify clicking an org redirects to detail', async () => {
      const firstLink = page.locator('table tbody tr').first().locator('a').first().describe('First org link');
      const href = await firstLink.getAttribute('href');
      await firstLink.click();
      await page.waitForTimeout(3000);
      await expect(page).toHaveURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      await page.goBack();
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
      await page.waitForTimeout(2000);
    });

    // === PAGINATION ===
    await test.step('Verify pagination elements', async () => {
      await expect(page.getByText('Rows per page').describe('Rows per page')).toBeVisible();
      await expect(page.getByText(/Page \d+ of \d+/).describe('Page info')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Next page' }).describe('Next page button')).toBeVisible();
    });

    // === VISUAL ALIGNMENT ===
    await test.step('Verify overall page alignment', async () => {
      await expect(page).aiAssert(
        'The Organizations list page has proper layout: sidebar on the left, header bar at top, breadcrumb showing "Organizations" with count, New Organization button right-aligned, filter bar, data table with aligned columns showing org names/status/created by/created on, and pagination at bottom. No UI elements appear broken, overlapping, or misaligned.',
        { timeout: 60000 }
      );
    });
  });

  /**
   * User Prompt:
   * - Log in this environment- https://uat.zuperpro.com/
   *   Company Name: zuper-pro, username: ragupathy.s@zuper.co, password: Test@1234
   * - After logged in Cancel the pop up in the dashboard
   * - Navigate to the Organization module, open an organization detail page and check all the UI testing like UI breaking, Icons, Click actions, Redirections, Alignment
   */
  test('Organization detail page - UI elements, tabs, sections, icons, and alignment', async ({ page }) => {
    await page.goto('/organizations');
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(2000);

    // Click first organization
    const firstLink = page.locator('table tbody tr').first().locator('a').first().describe('First org link');
    await firstLink.waitFor({ state: 'visible', timeout: 60000 });
    await firstLink.click();
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/organizations\/.+\/details/);

    // === BREADCRUMB ===
    await test.step('Verify detail page breadcrumb', async () => {
      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]').describe('Breadcrumb');
      await expect(breadcrumb).toBeVisible();

      const orgsLink = page.getByRole('link', { name: 'Organizations' }).describe('Organizations breadcrumb link');
      await expect(orgsLink).toBeVisible();
      await expect(orgsLink).toHaveAttribute('href', '/organizations');
    });

    // === HEADER ACTIONS ===
    await test.step('Verify header action buttons', async () => {
      await expect(page.getByText('More Actions').describe('More Actions button')).toBeVisible();
    });

    // === ORG HEADER ===
    await test.step('Verify organization header with avatar, name, and address', async () => {
      // Organization name should be visible
      const orgName = page.locator('p').filter({ hasText: /^[A-Z]/ }).first().describe('Org name');
      await expect(orgName).toBeVisible();
    });

    // === QUICK ACTION BUTTONS ===
    await test.step('Verify quick action buttons', async () => {
      await expect(page.getByText('Mail').first().describe('Mail button')).toBeVisible();
      await expect(page.getByText('Add Note').first().describe('Add Note button')).toBeVisible();
    });

    // === NAVIGATION TABS ===
    await test.step('Verify navigation tabs', async () => {
      const tabs = ['Details', 'Notes', 'Activity', 'Jobs'];
      for (const tab of tabs) {
        await expect(page.getByRole('button', { name: new RegExp('^' + tab + '\\b') }).describe(`${tab} tab`)).toBeVisible();
      }
    });

    // === PRIMARY DETAILS SECTION ===
    await test.step('Verify Primary Details section', async () => {
      await expect(page.getByRole('heading', { name: 'Primary Details' }).describe('Primary Details heading')).toBeVisible();

      const fields = ['Email', 'Organization Status', 'Created At', 'Created By'];
      for (const field of fields) {
        await expect(page.getByText(field, { exact: false }).first().describe(`${field} label`)).toBeVisible();
      }
    });

    // === TAX DETAILS SECTION ===
    await test.step('Verify Tax Details section', async () => {
      await expect(page.getByRole('heading', { name: 'Tax Details' }).describe('Tax Details heading')).toBeVisible();
    });

    // === ADDRESS SECTION ===
    await test.step('Verify Address section', async () => {
      await expect(page.getByRole('heading', { name: 'Address' }).first().describe('Address heading')).toBeVisible();
      await expect(page.getByText('Service Address').describe('Service Address label')).toBeVisible();
      await expect(page.getByText('Billing Address').describe('Billing Address label')).toBeVisible();
      await expect(page.getByRole('img', { name: 'Location Preview' }).describe('Location map preview')).toBeVisible();
    });

    // === RIGHT PANEL ACCORDION SECTIONS ===
    await test.step('Verify right panel accordion sections', async () => {
      const sections = [
        'Contacts Associated',
        'Properties Associated',
        'Requests Associated',
        'Projects Associated',
        'Quotes Associated',
        'Invoices Associated',
        'Contracts Associated',
        'Assets Associated'
      ];
      for (const section of sections) {
        const btn = page.getByRole('button', { name: new RegExp(section) }).describe(`${section} accordion`);
        await expect(btn).toBeVisible();
      }
    });

    // === TAB CLICK ACTIONS ===
    await test.step('Verify tab click actions', async () => {
      await page.getByRole('button', { name: /^Jobs\b/ }).describe('Jobs tab').click();
      await page.waitForTimeout(1500);

      await page.getByRole('button', { name: /^Notes\b/ }).describe('Notes tab').click();
      await page.waitForTimeout(1500);

      await page.getByRole('button', { name: /^Details\b/ }).describe('Details tab').click();
      await page.waitForTimeout(1500);
    });

    // === BREADCRUMB REDIRECTION ===
    await test.step('Verify breadcrumb "Organizations" link redirects to list', async () => {
      await page.getByRole('link', { name: 'Organizations' }).describe('Organizations breadcrumb link').click();
      await page.waitForTimeout(3000);
      await expect(page).toHaveURL(/\/organizations$/);
    });

    // === VISUAL ALIGNMENT ===
    await test.step('Verify detail page layout and alignment', async () => {
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
      await page.locator('table tbody tr').first().locator('a').first().click();
      await page.waitForTimeout(3000);

      await expect(page).aiAssert(
        'The Organization detail page has proper layout: breadcrumb at top showing Organizations > org name, header with avatar/name/address, quick action buttons (Mail, New, Add Note), horizontal navigation tabs (Details, Notes, Activity, Jobs), left panel with Primary Details/Tax Details/Address sections with aligned labels and values, and right panel with accordion sections for Contacts/Properties/Quotes/Invoices etc. No UI elements appear broken, overlapping, or misaligned.',
        { timeout: 60000 }
      );
    });
  });
});
