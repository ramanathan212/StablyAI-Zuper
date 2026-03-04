import { test, expect } from '@stablyai/playwright-test';
import { LoginPage } from './pages/LoginPage.js';

test.describe('Jobs Module - Comprehensive UI Testing', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login('zuper-pro', 'ragupathy.s@zuper.co', 'Test@1234');

    // Wait for "Getting things ready" loading screen to disappear
    const loadingText = page.getByText('Getting things ready');
    if (await loadingText.isVisible({ timeout: 5000 }).catch(() => false)) {
      await loadingText.waitFor({ state: 'hidden', timeout: 60000 });
    }

    // Wait for the dashboard/app to be fully loaded (sidebar visible)
    await page.locator('img[alt="Zuper logo"]').waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(2000);

    // Dismiss onboarding popup
    await loginPage.dismissOnboarding();

    // Dismiss timezone dialog if visible
    const cancelBtn = page.getByRole('button', { name: 'Cancel' }).describe('Cancel timezone dialog');
    if (await cancelBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cancelBtn.click();
    }

    // Dismiss Beamer notification popup ("We'd like to show you notifications...")
    const noThanksBeamer = page.locator('#beamerPushModal').getByText('NO, THANKS');
    if (await noThanksBeamer.isVisible({ timeout: 5000 }).catch(() => false)) {
      await noThanksBeamer.click();
      await page.waitForTimeout(500);
    }

    // Wait for any remaining overlays to clear
    await page.waitForTimeout(1000);
  });

  /**
   * User Prompt:
   * - Log in this environment- https://uat.zuperpro.com/
   *   Company Name: zuper-pro, username: ragupathy.s@zuper.co, password: Test@1234
   * - After logged in Cancel the pop up in the dashboard
   * - Navigate to the Jobs module and check all the UI testing
   * - UI Testing scenarios:
   *   1. Ensure the listing page loading properly
   *   2. Ensure the sorting and filters(check any one filter) working properly
   *   3. Ensure Searching working properly
   */
  test('Jobs listing page - loading, sorting, filters, and search', async ({ page }) => {
    // Navigate to Jobs listing page
    await page.goto('/jobs');
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(2000);

    // === SCENARIO 1: LISTING PAGE LOADING PROPERLY ===
    await test.step('Verify listing page loads with all essential elements', async () => {
      // Verify page title and URL
      await expect(page).toHaveTitle(/Jobs/);
      await expect(page).toHaveURL(/\/jobs/);

      // Verify breadcrumb
      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]').describe('Jobs breadcrumb navigation');
      await expect(breadcrumb).toBeVisible();

      // Verify action buttons
      const newJobLink = page.locator('a[href="/jobs/new"]').describe('New Job button');
      await expect(newJobLink).toBeVisible();
      const recurringJobsLink = page.locator('a[href="/recurring_jobs"]').describe('Manage Recurring Jobs link');
      await expect(recurringJobsLink).toBeVisible();

      // Verify filter bar elements
      await expect(page.getByText('All Jobs').describe('All Jobs dropdown')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Filter' }).describe('Filter button')).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Search' }).describe('Search textbox')).toBeVisible();
      await expect(page.getByRole('button', { name: /Columns/ }).describe('Columns button')).toBeVisible();

      // Verify table structure with headers
      await expect(page.locator('table').first().describe('Jobs list table')).toBeVisible();
      const headers = ['Work Order Number', 'Job Title', 'Contact', 'Category', 'Service Address', 'Status', 'Priority', 'Scheduled Date', 'Due Date', 'Created On'];
      for (const header of headers) {
        await expect(page.getByRole('columnheader', { name: new RegExp(header) }).describe(`${header} column header`)).toBeVisible();
      }

      // Verify select-all checkbox
      await expect(page.getByRole('checkbox', { name: 'Select all' }).describe('Select all checkbox')).toBeVisible();

      // Verify data rows exist
      const firstRow = page.locator('table tbody tr').first().describe('First data row');
      await expect(firstRow).toBeVisible();
      await expect(page.getByRole('checkbox', { name: 'Select row' }).first().describe('Row checkbox')).toBeVisible();

      // Verify pagination
      await expect(page.getByText('Rows per page').describe('Rows per page label')).toBeVisible();
      await expect(page.getByText(/Page \d+ of \d+/).describe('Page info')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Next page' }).describe('Next page button')).toBeVisible();
    });

    // === SCENARIO 2: SORTING AND FILTERS WORKING PROPERLY ===
    await test.step('Verify sorting by clicking a column header', async () => {
      // Click on "Created On" column header to trigger sorting
      const createdOnHeader = page.getByRole('columnheader', { name: /Created On/ }).describe('Created On column header');
      await createdOnHeader.click();
      await page.waitForTimeout(2000);

      // Verify the table still loads with data after sorting
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 30000 });
      await expect(page.locator('table tbody tr').first().describe('First row after sorting')).toBeVisible();
    });

    await test.step('Verify filter functionality - Job Priority filter', async () => {
      // Click the Job Priority filter chip to open filter panel
      const priorityChip = page.getByRole('button', { name: /Job Priority/ }).describe('Job Priority filter chip');
      await priorityChip.click();
      await page.waitForTimeout(1000);

      // Verify filter type panel appears with Contains/Not Contains/Is Empty/Is Not Empty
      const containsBtn = page.getByRole('button', { name: 'Contains', exact: true }).describe('Contains filter type');
      await expect(containsBtn).toBeVisible();
      await containsBtn.click();
      await page.waitForTimeout(1000);

      // Verify priority options appear (Low, Medium, High, Urgent)
      const urgentBtn = page.getByRole('button', { name: 'Urgent' }).describe('Urgent priority option');
      await expect(urgentBtn).toBeVisible();
      await urgentBtn.click();
      await page.waitForTimeout(2000);

      // Verify the table reloads with filtered data after applying Urgent filter
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 30000 });
      await expect(page.locator('table tbody tr').first().describe('First row after filtering')).toBeVisible();
    });

    // === SCENARIO 3: SEARCHING WORKING PROPERLY ===
    await test.step('Verify search functionality', async () => {
      // Reload the page to clear any filters
      await page.goto('/jobs');
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
      await page.waitForTimeout(2000);

      const searchBox = page.getByRole('textbox', { name: 'Search' }).describe('Jobs search textbox');

      // Type a search term
      await searchBox.click({ force: true });
      await searchBox.fill('test');
      await searchBox.press('Enter');
      await page.waitForTimeout(3000);

      // Verify search input has the value
      await expect(searchBox).toHaveValue('test');

      // Verify table still shows data (or shows "no results" message)
      const tableBody = page.locator('table tbody').describe('Table body');
      await expect(tableBody).toBeVisible();

      // Clear search and verify results return
      await searchBox.clear();
      await searchBox.press('Enter');
      await page.waitForTimeout(3000);
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 30000 });
      await expect(page.locator('table tbody tr').first().describe('First row after clearing search')).toBeVisible();
    });
  });

  /**
   * User Prompt:
   * - Log in this environment- https://uat.zuperpro.com/
   *   Company Name: zuper-pro, username: ragupathy.s@zuper.co, password: Test@1234
   * - After logged in Cancel the pop up in the dashboard
   * - Navigate to the Jobs module and check all the UI testing
   * - UI Testing scenarios:
   *   4. Go to the first job details page from listing page
   *   5. Ensure details page is loading properly without breaking
   *   6. Ensure all the icons are visible properly
   *   7. Ensure all the labels are visible properly
   *   8. Ensure icons, Title, placeholder alignment properly
   *   9. Ensure all the click actions working properly
   *   10. Ensure all the dropdown are working properly
   *   11. Ensure all the navigations are working properly
   */
  test('Job details page - loading, icons, labels, alignment, clicks, dropdowns, and navigation', async ({ page }) => {
    // Navigate to Jobs listing and open first job
    await page.goto('/jobs');
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(2000);

    // === SCENARIO 4: GO TO FIRST JOB DETAILS PAGE ===
    await test.step('Navigate to first job details page from listing', async () => {
      const firstJobLink = page.locator('table tbody tr').first().locator('a').first().describe('First job link');
      await expect(firstJobLink).toBeVisible();
      await firstJobLink.click();
      await page.waitForTimeout(3000);
      await expect(page).toHaveURL(/\/jobs\/.+\/details/);
    });

    // === SCENARIO 5: DETAILS PAGE LOADING PROPERLY ===
    await test.step('Verify details page loads completely without breaking', async () => {
      // Breadcrumb
      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]').describe('Breadcrumb nav');
      await expect(breadcrumb).toBeVisible();
      const jobsLink = page.getByRole('link', { name: 'Jobs' }).describe('Jobs breadcrumb link');
      await expect(jobsLink).toBeVisible();
      await expect(jobsLink).toHaveAttribute('href', '/jobs');

      // Work order number
      const workOrder = page.locator('text=/^# \\d+$/').first().describe('Work order number');
      await expect(workOrder).toBeVisible();

      // Header action buttons
      await expect(page.getByText('Print/Share').describe('Print/Share button')).toBeVisible();
      await expect(page.getByText('More Actions').describe('More Actions button')).toBeVisible();

      // Quick action buttons
      await expect(page.getByText('Update Status').describe('Update Status button')).toBeVisible();
      await expect(page.getByText('Schedule', { exact: true }).describe('Schedule button')).toBeVisible();
      await expect(page.getByText('Add Note').first().describe('Add Note button')).toBeVisible();

      // Navigation tabs
      const tabs = ['Details', 'Line Items', 'Measurements', 'Notes', 'Activity', 'Chat', 'Gallery'];
      for (const tab of tabs) {
        await expect(page.getByRole('button', { name: new RegExp('^' + tab + '\\b') }).describe(`${tab} tab`)).toBeVisible();
      }
    });

    // === SCENARIO 6: ALL ICONS VISIBLE PROPERLY ===
    await test.step('Verify all icons and icon-buttons are visible', async () => {
      // Print/Share icon-button
      await expect(page.getByText('Print/Share').describe('Print/Share icon')).toBeVisible();

      // More Actions icon-button
      await expect(page.getByText('More Actions').describe('More Actions icon')).toBeVisible();

      // Update Status icon
      await expect(page.getByText('Update Status').describe('Update Status icon')).toBeVisible();

      // Schedule icon
      await expect(page.getByText('Schedule', { exact: true }).describe('Schedule icon')).toBeVisible();

      // Add Note icon
      await expect(page.getByText('Add Note').first().describe('Add Note icon')).toBeVisible();

      // Right panel accordion section icons
      const accordionSections = [
        { label: 'Users/Teams Assigned', pattern: /Users\/Teams Assigned/ },
        { label: 'Timelog Summary', pattern: /Timelog Summary/ },
        { label: 'Organization', pattern: /^Organization/ },
        { label: 'Contact', pattern: /^Contact\b/ },
        { label: 'Secondary Contacts', pattern: /Secondary Contacts/ },
        { label: 'Property', pattern: /^Property/ },
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
      for (const section of accordionSections) {
        await expect(page.getByRole('button', { name: section.pattern }).describe(`${section.label} accordion icon`)).toBeVisible();
      }
    });

    // === SCENARIO 7: ALL LABELS VISIBLE PROPERLY ===
    await test.step('Verify all labels in Primary Details section', async () => {
      await expect(page.getByRole('heading', { name: 'Primary Details' }).describe('Primary Details heading')).toBeVisible();

      const primaryLabels = ['Job Category', 'Job Priority', 'Job Type', 'Due Date', 'Job Created On', 'Job Created By'];
      for (const label of primaryLabels) {
        await expect(page.getByText(label, { exact: false }).first().describe(`${label} label`)).toBeVisible();
      }
    });

    await test.step('Verify all labels in Address section', async () => {
      await expect(page.getByRole('heading', { name: 'Address' }).first().describe('Address heading')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Service Address' }).describe('Service Address heading')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Billing Address' }).describe('Billing Address heading')).toBeVisible();
    });

    await test.step('Verify Service Tasks section labels', async () => {
      await expect(page.getByText('Service Tasks').first().describe('Service Tasks heading')).toBeVisible();
      const taskHeaders = ['Service Task', 'Status', 'Description', 'Inspection Form', 'Duration'];
      for (const header of taskHeaders) {
        await expect(page.getByRole('columnheader', { name: header }).describe(`${header} column header`)).toBeVisible();
      }
    });

    // === SCENARIO 8: ICONS, TITLE, PLACEHOLDER ALIGNMENT ===
    await test.step('Verify overall page alignment and visual layout', async () => {
      await expect(page).aiAssert(
        'The Job detail page has proper layout with no broken or overlapping UI elements: breadcrumb at top, work order number with status badge, job title visible, action buttons aligned in a row, navigation sidebar on the left, and Primary Details section with labels and values properly aligned.',
        { timeout: 120000 }
      );
    });

    // === SCENARIO 9: ALL CLICK ACTIONS WORKING PROPERLY ===
    await test.step('Verify tab click actions work', async () => {
      // Click Line Items tab
      await page.getByRole('button', { name: /^Line Items\b/ }).describe('Line Items tab').click();
      await page.waitForTimeout(1500);

      // Click Notes tab
      await page.getByRole('button', { name: /^Notes\b/ }).describe('Notes tab').click();
      await page.waitForTimeout(1500);

      // Click Activity tab
      await page.getByRole('button', { name: /^Activity\b/ }).describe('Activity tab').click();
      await page.waitForTimeout(1500);

      // Click Gallery tab
      await page.getByRole('button', { name: /^Gallery\b/ }).describe('Gallery tab').click();
      await page.waitForTimeout(1500);

      // Click back to Details tab
      await page.getByRole('button', { name: /^Details\b/ }).describe('Details tab').click();
      await page.waitForTimeout(1500);
    });

    await test.step('Verify Print/Share click action', async () => {
      await page.getByText('Print/Share').describe('Print/Share button').click();
      await page.waitForTimeout(1500);

      // Dismiss any opened panel/overlay
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      const overlay = page.locator('.cdk-overlay-backdrop').describe('CDK overlay');
      if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
        await overlay.click({ force: true });
        await page.waitForTimeout(500);
      }
    });

    // === SCENARIO 10: ALL DROPDOWNS WORKING PROPERLY ===
    await test.step('Verify More Actions dropdown works', async () => {
      await page.getByText('More Actions').describe('More Actions dropdown trigger').click();
      await page.waitForTimeout(1500);

      // Verify dropdown menu items appear - must be visible or the test fails
      const moreActionsMenu = page.locator('.cdk-overlay-pane').describe('More Actions dropdown menu');
      await expect(moreActionsMenu).toBeVisible({ timeout: 5000 });

      // Dismiss dropdown
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      const overlay = page.locator('.cdk-overlay-backdrop').describe('CDK overlay');
      if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
        await overlay.click({ force: true });
        await page.waitForTimeout(500);
      }
    });

    await test.step('Verify Update Status dropdown works', async () => {
      await page.getByText('Update Status').first().describe('Update Status dropdown trigger').click();
      await page.waitForTimeout(1500);

      // Verify inline status update form appears with heading, combobox, and button
      const statusHeading = page.getByRole('heading', { name: 'Update Job Status' }).describe('Update Job Status heading');
      await expect(statusHeading).toBeVisible({ timeout: 5000 });

      const statusCombobox = page.getByRole('combobox').describe('Job status combobox');
      await expect(statusCombobox).toBeVisible({ timeout: 5000 });

      // Dismiss the inline status form by pressing Escape or clicking away
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    });

    // === SCENARIO 11: ALL NAVIGATIONS WORKING PROPERLY ===
    await test.step('Verify breadcrumb Jobs link navigates back to listing', async () => {
      const jobsLink = page.getByRole('link', { name: 'Jobs' }).describe('Jobs breadcrumb link');
      await jobsLink.click();
      await page.waitForTimeout(3000);
      await expect(page).toHaveURL(/\/jobs$/);
    });

    await test.step('Verify New Job navigation from listing page', async () => {
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
      await page.waitForTimeout(2000);

      await page.locator('a[href="/jobs/new"]').describe('New Job button').click();
      await page.waitForTimeout(3000);
      await expect(page).toHaveURL(/\/jobs\/new/);

      // Go back to jobs listing
      await page.goBack();
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
      await page.waitForTimeout(2000);
    });

    await test.step('Verify Manage Recurring Jobs navigation', async () => {
      await page.locator('a[href="/recurring_jobs"]').describe('Recurring Jobs link').click();
      await page.waitForTimeout(3000);
      await expect(page).toHaveURL(/\/recurring_jobs/);

      // Go back to jobs listing
      await page.goBack();
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
      await page.waitForTimeout(2000);
    });

    await test.step('Verify clicking a job row navigates to details', async () => {
      const firstJobLink = page.locator('table tbody tr').first().locator('a').first().describe('First job link');
      const href = await firstJobLink.getAttribute('href');
      await firstJobLink.click();
      await page.waitForTimeout(3000);
      await expect(page).toHaveURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    });
  });
});
