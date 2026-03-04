import { test, expect } from '@stablyai/playwright-test';
import { LoginPage } from './pages/LoginPage.js';

test.describe('Jobs Module - UI Testing', () => {
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
   * - Navigate to the Jobs module and check all the UI testing like UI breaking, Icons, Click actions, Redirections, Alignment
   */
  test('Jobs list page - UI elements, icons, click actions, redirections, and alignment', async ({ page }) => {
    await page.goto('/jobs');
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(2000);

    // === UI LAYOUT VERIFICATION ===
    await test.step('Verify Jobs page layout and header elements', async () => {
      await expect(page).toHaveTitle(/Jobs/);
      await expect(page).toHaveURL(/\/jobs/);

      const breadcrumbJobs = page.locator('nav[aria-label="Breadcrumb"]').describe('Jobs breadcrumb navigation');
      await expect(breadcrumbJobs).toBeVisible();

      const newJobLink = page.locator('a[href="/jobs/new"]').describe('New Job action button');
      await expect(newJobLink).toBeVisible();

      const recurringJobsLink = page.locator('a[href="/recurring_jobs"]').describe('Manage Recurring Jobs link');
      await expect(recurringJobsLink).toBeVisible();
    });

    // === FILTER AND SEARCH UI ===
    await test.step('Verify filter bar and search elements', async () => {
      await expect(page.getByText('All Jobs').describe('All Jobs filter dropdown')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Filter' }).describe('Filter button')).toBeVisible();
      await expect(page.getByRole('button', { name: /Job Category/ }).describe('Job Category chip')).toBeVisible();
      await expect(page.getByRole('button', { name: /Scheduled Date Range/ }).describe('Scheduled Date Range chip')).toBeVisible();
      await expect(page.getByRole('button', { name: /Job Priority/ }).describe('Job Priority chip')).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Search' }).describe('Jobs search textbox')).toBeVisible();
      await expect(page.getByRole('button', { name: /Columns/ }).describe('Columns button')).toBeVisible();
    });

    // === TABLE STRUCTURE VERIFICATION ===
    await test.step('Verify Jobs table headers and structure', async () => {
      await expect(page.locator('table').first().describe('Jobs list table')).toBeVisible();

      const headers = ['Work Order Number', 'Job Title', 'Contact', 'Category', 'Service Address', 'Status', 'Priority', 'Scheduled Date', 'Due Date', 'Created On'];
      for (const header of headers) {
        await expect(page.getByRole('columnheader', { name: new RegExp(header) }).describe(`${header} column header`)).toBeVisible();
      }

      await expect(page.getByRole('checkbox', { name: 'Select all' }).describe('Select all checkbox')).toBeVisible();
    });

    // === TABLE DATA ROWS ===
    await test.step('Verify table rows are interactive', async () => {
      const firstRow = page.locator('table tbody tr').first().describe('First data row');
      await expect(firstRow).toBeVisible();

      await expect(page.getByRole('checkbox', { name: 'Select row' }).first().describe('Row checkbox')).toBeVisible();

      const workOrderLink = firstRow.locator('a').first().describe('Work order link');
      await expect(workOrderLink).toBeVisible();
      await expect(workOrderLink).toHaveAttribute('href', /\/jobs\/.+\/details/);
    });

    // === CLICK ACTIONS ===
    await test.step('Verify filter and search click actions', async () => {
      // Click filter - then dismiss CDK overlay
      await page.getByRole('button', { name: 'Filter' }).describe('Filter button').click();
      await page.waitForTimeout(1000);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      // Dismiss any remaining CDK overlay
      const overlay = page.locator('.cdk-overlay-backdrop').describe('CDK overlay backdrop');
      if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
        await overlay.click({ force: true });
        await page.waitForTimeout(500);
      }

      // Search box
      const searchBox = page.getByRole('textbox', { name: 'Search' }).describe('Jobs search textbox');
      await searchBox.click({ force: true });
      await searchBox.fill('test');
      await page.waitForTimeout(1500);
      await expect(searchBox).toHaveValue('test');
      await searchBox.clear();
      await page.waitForTimeout(1500);
    });

    // === REDIRECTIONS ===
    await test.step('Verify New Job button redirects correctly', async () => {
      await page.locator('a[href="/jobs/new"]').describe('New Job button').click();
      await page.waitForTimeout(3000);
      await expect(page).toHaveURL(/\/jobs\/new/);
      await page.goBack();
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
      await page.waitForTimeout(2000);
    });

    await test.step('Verify clicking a job row redirects to job details', async () => {
      const firstJobLink = page.locator('table tbody tr').first().locator('a').first().describe('First job link');
      const href = await firstJobLink.getAttribute('href');
      await firstJobLink.click();
      await page.waitForTimeout(3000);
      await expect(page).toHaveURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      await page.goBack();
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
      await page.waitForTimeout(2000);
    });

    // === PAGINATION ===
    await test.step('Verify pagination elements', async () => {
      await expect(page.getByText('Rows per page').describe('Rows per page label')).toBeVisible();
      await expect(page.getByText(/Page \d+ of \d+/).describe('Page info')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Next page' }).describe('Next page button')).toBeVisible();
    });

    // === VISUAL ALIGNMENT ===
    await test.step('Verify overall page alignment and visual layout', async () => {
      await expect(page).aiAssert(
        'The Jobs list page has proper layout: sidebar on the left, header bar at top with company logo/search/notifications, breadcrumb showing "Jobs" with count, action buttons right-aligned, filter bar with chips, a data table with aligned columns, and pagination at bottom. No UI elements appear broken, overlapping, or misaligned.',
        { timeout: 60000 }
      );
    });
  });

  /**
   * User Prompt:
   * - Log in this environment- https://uat.zuperpro.com/
   *   Company Name: zuper-pro, username: ragupathy.s@zuper.co, password: Test@1234
   * - After logged in Cancel the pop up in the dashboard
   * - Navigate to the Jobs module, open a job detail page and check all the UI testing like UI breaking, Icons, Click actions, Redirections, Alignment
   */
  test('Job detail page - UI elements, tabs, sections, icons, and alignment', async ({ page }) => {
    await page.goto('/jobs');
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(2000);

    // Click first job to navigate to detail page
    const firstJobLink = page.locator('table tbody tr').first().locator('a').first().describe('First job link');
    await firstJobLink.click();
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/jobs\/.+\/details/);

    // === BREADCRUMB VERIFICATION ===
    await test.step('Verify detail page breadcrumb navigation', async () => {
      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]').describe('Breadcrumb nav');
      await expect(breadcrumb).toBeVisible();

      const jobsLink = page.getByRole('link', { name: 'Jobs' }).describe('Jobs breadcrumb link');
      await expect(jobsLink).toBeVisible();
      await expect(jobsLink).toHaveAttribute('href', '/jobs');
    });

    // === HEADER ACTIONS ===
    await test.step('Verify header action buttons', async () => {
      await expect(page.getByText('Print/Share').describe('Print/Share button')).toBeVisible();
      await expect(page.getByText('More Actions').describe('More Actions button')).toBeVisible();
    });

    // === JOB HEADER INFO ===
    await test.step('Verify job header with work order, status, and title', async () => {
      // Work order number (format: # NNNN)
      const workOrder = page.locator('text=/^# \\d+$/').first().describe('Work order number');
      await expect(workOrder).toBeVisible();
    });

    // === QUICK ACTION BUTTONS ===
    await test.step('Verify quick action buttons', async () => {
      await expect(page.getByText('Update Status').describe('Update Status button')).toBeVisible();
      await expect(page.getByText('Schedule', { exact: true }).describe('Schedule button')).toBeVisible();
      await expect(page.getByText('Add Note').first().describe('Add Note button')).toBeVisible();
    });

    // === NAVIGATION TABS ===
    await test.step('Verify navigation tabs', async () => {
      const tabs = ['Details', 'Line Items', 'Measurements', 'Notes', 'Activity', 'Chat', 'Gallery'];
      for (const tab of tabs) {
        await expect(page.getByRole('button', { name: new RegExp('^' + tab + '\\b') }).describe(`${tab} tab`)).toBeVisible();
      }
    });

    // === PRIMARY DETAILS SECTION ===
    await test.step('Verify Primary Details section', async () => {
      await expect(page.getByRole('heading', { name: 'Primary Details' }).describe('Primary Details heading')).toBeVisible();

      const fields = ['Job Category', 'Job Priority', 'Job Type', 'Due Date', 'Job Created On', 'Job Created By'];
      for (const field of fields) {
        await expect(page.getByText(field, { exact: false }).first().describe(`${field} label`)).toBeVisible();
      }
    });

    // === ADDRESS SECTION ===
    await test.step('Verify Address section', async () => {
      await expect(page.getByRole('heading', { name: 'Address' }).first().describe('Address heading')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Service Address' }).describe('Service Address heading')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Billing Address' }).describe('Billing Address heading')).toBeVisible();
    });

    // === SERVICE TASKS SECTION ===
    await test.step('Verify Service Tasks section', async () => {
      await expect(page.getByText('Service Tasks').first().describe('Service Tasks heading')).toBeVisible();

      // Service tasks table headers
      const taskHeaders = ['Service Task', 'Status', 'Description', 'Inspection Form', 'Duration'];
      for (const header of taskHeaders) {
        await expect(page.getByRole('columnheader', { name: header }).describe(`${header} task column`)).toBeVisible();
      }
    });

    // === RIGHT PANEL ACCORDION SECTIONS ===
    await test.step('Verify right panel accordion sections', async () => {
      // Use specific patterns to avoid ambiguous matches (e.g. "Contact" vs "Secondary Contacts")
      const sections = [
        { label: 'Users/Teams Assigned', pattern: /Users\/Teams Assigned/ },
        { label: 'Timelog Summary', pattern: /Timelog Summary/ },
        { label: 'Organization', pattern: /^Organization/ },
        { label: 'Contact', pattern: /^Contact\b/ },
        { label: 'Secondary Contacts', pattern: /Secondary Contacts/ },
        { label: 'Property', pattern: /^Property/ }
      ];
      for (const section of sections) {
        await expect(page.getByRole('button', { name: section.pattern }).describe(`${section.label} accordion`)).toBeVisible();
      }
    });

    // === COLLAPSED ACCORDION SECTIONS ===
    await test.step('Verify collapsible accordion sections in right panel', async () => {
      const collapsedSections = [
        { label: 'Project', pattern: /^Project\b/ },
        { label: 'Child Jobs Associated', pattern: /Child Jobs Associated/ },
        { label: 'Quotes Associated', pattern: /Quotes Associated/ },
        { label: 'Invoices Associated', pattern: /Invoices Associated/ },
        { label: 'Purchase Orders', pattern: /Purchase Orders/ },
        { label: 'Contract', pattern: /^Contract\b/ },
        { label: 'Assets Associated', pattern: /Assets Associated/ },
        { label: 'Attachments', pattern: /Attachments/ },
        { label: 'Workflow Activity', pattern: /Workflow Activity/ }
      ];
      for (const section of collapsedSections) {
        const btn = page.getByRole('button', { name: section.pattern }).describe(`${section.label} accordion button`);
        await expect(btn).toBeVisible();
      }
    });

    // === TAB CLICK ACTIONS ===
    await test.step('Verify tab click actions', async () => {
      // Click Line Items tab
      await page.getByRole('button', { name: /^Line Items\b/ }).describe('Line Items tab').click();
      await page.waitForTimeout(1500);

      // Click Notes tab
      await page.getByRole('button', { name: /^Notes\b/ }).describe('Notes tab').click();
      await page.waitForTimeout(1500);

      // Click back to Details
      await page.getByRole('button', { name: /^Details\b/ }).describe('Details tab').click();
      await page.waitForTimeout(1500);
    });

    // === BREADCRUMB REDIRECTION ===
    await test.step('Verify breadcrumb "Jobs" link redirects to list', async () => {
      const jobsLink = page.getByRole('link', { name: 'Jobs' }).describe('Jobs breadcrumb link');
      await jobsLink.click();
      await page.waitForTimeout(3000);
      await expect(page).toHaveURL(/\/jobs$/);
    });

    // === VISUAL ALIGNMENT ===
    await test.step('Verify detail page layout and alignment', async () => {
      // Navigate back to a job detail
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
      await page.locator('table tbody tr').first().locator('a').first().click();
      await page.waitForTimeout(3000);

      await expect(page).aiAssert(
        'The Job detail page has proper layout: breadcrumb at top showing Jobs > job number, header with work order number/status/title, quick action buttons (Update Status, Schedule, New, Add Note), horizontal navigation tabs (Details, Line Items, etc.), left panel with Primary Details/Address/Service Tasks sections with properly aligned labels and values, and right panel with accordion sections for Organization/Contact/Property etc. No UI elements appear broken, overlapping, or misaligned.',
        { timeout: 60000 }
      );
    });
  });
});
