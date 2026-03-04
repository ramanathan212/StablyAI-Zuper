import { test, expect } from '@stablyai/playwright-test';
import { LoginPage } from './pages/LoginPage.js';

test.describe('Property Module - UI Testing', () => {
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
   * - Navigate to the Property module and check all the UI testing like UI breaking, Icons, Click actions, Redirections, Alignment
   */
  test('Property list page - UI elements, icons, click actions, redirections, and alignment', async ({ page }) => {
    await page.goto('/property');
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(2000);

    // === UI LAYOUT VERIFICATION ===
    await test.step('Verify Properties page layout and header elements', async () => {
      await expect(page).toHaveTitle(/Properties/);
      await expect(page).toHaveURL(/\/property/);

      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]').describe('Properties breadcrumb');
      await expect(breadcrumb).toBeVisible();

      const newPropertyLink = page.locator('a[href="/property/new"]').describe('New Property button');
      await expect(newPropertyLink).toBeVisible();
    });

    // === FILTER AND SEARCH UI ===
    await test.step('Verify filter bar and search elements', async () => {
      await expect(page.getByText('All Properties').describe('All Properties dropdown')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Filter' }).describe('Filter button')).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Search' }).describe('Search textbox')).toBeVisible();
      await expect(page.getByRole('button', { name: /Columns/ }).describe('Columns button')).toBeVisible();
    });

    // === TABLE STRUCTURE ===
    await test.step('Verify Properties table headers', async () => {
      await expect(page.locator('table').first().describe('Properties table')).toBeVisible();

      const headers = ['Property Name', 'Jobs Count', 'Contact', 'Status', 'Created On'];
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

      const propLink = firstRow.locator('a').first().describe('Property name link');
      await expect(propLink).toBeVisible();
      await expect(propLink).toHaveAttribute('href', /\/property\/.+\/details/);
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
      await searchBox.fill('Property');
      await page.waitForTimeout(1500);
      await expect(searchBox).toHaveValue('Property');
      await searchBox.clear();
      await page.waitForTimeout(1500);
    });

    // === REDIRECTIONS ===
    await test.step('Verify New Property button redirects correctly', async () => {
      await page.locator('a[href="/property/new"]').describe('New Property button').click();
      await page.waitForTimeout(3000);
      await expect(page).toHaveURL(/\/property\/new/);
      await page.goBack();
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
      await page.waitForTimeout(2000);
    });

    await test.step('Verify clicking a property redirects to detail', async () => {
      const firstLink = page.locator('table tbody tr').first().locator('a').first().describe('First property link');
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
        'The Properties list page has proper layout: sidebar on the left, header bar at top, breadcrumb showing "Properties" with count, New Property button right-aligned, filter bar, data table with aligned columns showing property name with address, jobs count, contact, status, created on, and pagination at bottom. No UI elements appear broken, overlapping, or misaligned.',
        { timeout: 60000 }
      );
    });
  });

  /**
   * User Prompt:
   * - Log in this environment- https://uat.zuperpro.com/
   *   Company Name: zuper-pro, username: ragupathy.s@zuper.co, password: Test@1234
   * - After logged in Cancel the pop up in the dashboard
   * - Navigate to the Property module, open a property detail page and check all the UI testing like UI breaking, Icons, Click actions, Redirections, Alignment
   */
  test('Property detail page - UI elements, tabs, sections, icons, and alignment', async ({ page }) => {
    await page.goto('/property');
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(2000);

    // Click first property
    const firstLink = page.locator('table tbody tr').first().locator('a').first().describe('First property link');
    await firstLink.waitFor({ state: 'visible', timeout: 60000 });
    await firstLink.click();
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/property\/.+\/details/);

    // === BREADCRUMB ===
    await test.step('Verify detail page breadcrumb', async () => {
      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]').describe('Breadcrumb');
      await expect(breadcrumb).toBeVisible();

      const propertiesLink = page.getByRole('link', { name: 'Properties' }).describe('Properties breadcrumb link');
      await expect(propertiesLink).toBeVisible();
      await expect(propertiesLink).toHaveAttribute('href', '/property');
    });

    // === HEADER ACTIONS ===
    await test.step('Verify header action buttons', async () => {
      await expect(page.getByText('More Actions').describe('More Actions button')).toBeVisible();
    });

    // === PROPERTY HEADER ===
    await test.step('Verify property header with name and address', async () => {
      const propName = page.locator('p').filter({ hasText: /^[A-Z]/ }).first().describe('Property name');
      await expect(propName).toBeVisible();
    });

    // === QUICK ACTION BUTTONS ===
    await test.step('Verify quick action buttons', async () => {
      await expect(page.getByText('Add Note').first().describe('Add Note button')).toBeVisible();
    });

    // === NAVIGATION TABS ===
    await test.step('Verify navigation tabs', async () => {
      const tabs = ['Details', 'Notes', 'Activity', 'Jobs', 'Gallery'];
      for (const tab of tabs) {
        await expect(page.getByRole('button', { name: new RegExp('^' + tab + '\\b') }).describe(`${tab} tab`)).toBeVisible();
      }
    });

    // === PRIMARY DETAILS SECTION ===
    await test.step('Verify Primary Details section', async () => {
      await expect(page.getByRole('heading', { name: 'Primary Details' }).describe('Primary Details heading')).toBeVisible();

      const fields = ['Status', 'Created At', 'Created By'];
      for (const field of fields) {
        await expect(page.getByText(field, { exact: false }).first().describe(`${field} label`)).toBeVisible();
      }
    });

    // === ADDRESS SECTION ===
    await test.step('Verify Address section', async () => {
      await expect(page.getByRole('heading', { name: /Address/ }).first().describe('Address heading')).toBeVisible();
      await expect(page.getByText('Service Address').describe('Service Address')).toBeVisible();
    });

    // === RIGHT PANEL ACCORDION SECTIONS ===
    await test.step('Verify right panel accordion sections', async () => {
      const sections = [
        { label: 'Organization', pattern: /^Organization/ },
        { label: 'Contact', pattern: /^Contact\b/ },
        { label: 'Contracts Associated', pattern: /Contracts Associated/ },
        { label: 'Assets Associated', pattern: /Assets Associated/ }
      ];
      for (const section of sections) {
        const btn = page.getByRole('button', { name: section.pattern }).describe(`${section.label} accordion`);
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
    await test.step('Verify breadcrumb "Properties" link redirects to list', async () => {
      await page.getByRole('link', { name: 'Properties' }).describe('Properties breadcrumb link').click();
      await page.waitForTimeout(3000);
      await expect(page).toHaveURL(/\/property$/);
    });

    // === VISUAL ALIGNMENT ===
    await test.step('Verify detail page layout and alignment', async () => {
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
      await page.locator('table tbody tr').first().locator('a').first().click();
      await page.waitForTimeout(3000);

      await expect(page).aiAssert(
        'The Property detail page has proper layout: breadcrumb at top showing Properties > property name, header with name/address, quick action buttons, horizontal navigation tabs (Details, Notes, Activity, Jobs, Gallery), left panel with Primary Details/Address sections with aligned labels and values, and right panel with accordion sections for Organization/Contact/Contracts/Assets. No UI elements appear broken, overlapping, or misaligned.',
        { timeout: 60000 }
      );
    });
  });
});
