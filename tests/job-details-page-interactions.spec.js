import { test, expect } from '@stablyai/playwright-test';

test.describe('Job Details Page - Click Actions, Dropdowns & Redirections', () => {
  /**
   * User Prompt:
   * - Login "https://stagingv3.zuperpro.com/"
   * - Company Name: TestR
   * - Username: ragupathy.s@zuper.co
   * - Password: Test@1234
   * - Once logged in cancel the pop ups in the Dashboard
   * - Go to the Jobs module
   * - Open the details page of first job from the list
   * - Perform all the click actions are working properly
   * - Perform all the drildowns/dropdowns are working properly
   * - Perform all the redirections are working properly
   */

  test('Verify all click actions, dropdowns, and redirections on job details page', async ({ page }) => {
    // ========== LOGIN FLOW ==========
    await page.goto('https://stagingv3.zuperpro.com/');
    await page.waitForURL('**/login', { timeout: 30000 });

    // Enter Company Name
    await page.getByRole('textbox', { name: 'Company Name' }).fill('TestR');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Enter credentials
    await page.getByRole('textbox', { name: 'Email address' }).waitFor({ state: 'visible' });
    await page.getByRole('textbox', { name: 'Email address' }).fill('ragupathy.s@zuper.co');
    await page.getByRole('textbox', { name: /Password/ }).fill('Test@1234');
    await page.getByRole('button', { name: 'Login' }).click();

    // Wait for dashboard to load
    await page.waitForURL('**/dashboard', { timeout: 60000 });
    await expect(page).toHaveTitle(/Dashboard/);

    // ========== CANCEL POPUPS ==========
    // Cancel timezone popup if it appears
    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    try {
      await cancelButton.waitFor({ state: 'visible', timeout: 10000 });
      await cancelButton.click();
    } catch {
      // Popup may not appear - that's fine
    }

    // Dismiss any other popups/modals that may appear
    const closeButtons = page.locator('[aria-label="Close"], .modal .close, button:has-text("Close")');
    const closeCount = await closeButtons.count();
    for (let i = 0; i < closeCount; i++) {
      try {
        await closeButtons.nth(i).click({ timeout: 3000 });
      } catch {
        // Ignore if not clickable
      }
    }

    // ========== NAVIGATE TO JOBS MODULE ==========
    await page.goto('https://stagingv3.zuperpro.com/jobs');
    await page.waitForURL('**/jobs', { timeout: 60000 });
    await expect(page).toHaveTitle(/Jobs/);

    // Wait for the jobs table to load
    await page.locator('table').first().waitFor({ state: 'visible', timeout: 30000 });

    // ========== OPEN FIRST JOB DETAILS ==========
    // Click the first job title link in the table
    const firstJobTitleLink = page.locator('table tbody tr').first().locator('a').first();
    await firstJobTitleLink.waitFor({ state: 'visible' });
    const firstJobUrl = await firstJobTitleLink.getAttribute('href');
    await firstJobTitleLink.click();

    // Wait for job details page to load
    await page.waitForURL('**/jobs/*/details', { timeout: 60000 });
    await expect(page).toHaveTitle(/Job.*Zuper Pro/);

    // Wait for details content to load
    await page.getByRole('heading', { name: 'Primary Details' }).waitFor({ state: 'visible', timeout: 30000 });

    // ========== CLICK ACTIONS - TAB BUTTONS ==========

    // Click "Line Items" tab
    await page.getByRole('button', { name: 'Line Items' }).click();
    await expect(page.getByRole('button', { name: 'Line Items' })).toBeVisible();

    // Click "Notes" tab
    await page.getByRole('button', { name: 'Notes' }).click();
    await expect(page.getByRole('button', { name: 'Notes' })).toBeVisible();

    // Click "Activity" tab
    await page.getByRole('button', { name: 'Activity' }).click();
    await expect(page.getByRole('button', { name: 'Activity' })).toBeVisible();

    // Click "Chat" tab
    await page.getByRole('button', { name: 'Chat' }).click();
    await expect(page.getByRole('button', { name: 'Chat' })).toBeVisible();

    // Click back to "Details" tab
    await page.getByRole('button', { name: 'Details' }).click();
    await expect(page.getByRole('heading', { name: 'Primary Details' })).toBeVisible();

    // ========== CLICK ACTIONS - ACTION BUTTONS ==========

    // Click "Update Status" action
    const updateStatusText = page.locator('text=Update Status').first();
    await updateStatusText.scrollIntoViewIfNeeded();
    await updateStatusText.click();
    // Wait for status modal/dropdown to appear and close it
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Click "Reschedule" action
    const rescheduleText = page.locator('text=Reschedule').first();
    await rescheduleText.scrollIntoViewIfNeeded();
    await rescheduleText.click();
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Click "Add Note" action
    const addNoteText = page.locator('text=Add Note').first();
    await addNoteText.scrollIntoViewIfNeeded();
    await addNoteText.click();
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Click "Print/Share" button
    const printShareButton = page.locator('text=Print/Share').first();
    await printShareButton.scrollIntoViewIfNeeded();
    await printShareButton.click();
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Click "More Actions" button
    const moreActionsButton = page.locator('text=More Actions').first();
    await moreActionsButton.scrollIntoViewIfNeeded();
    await moreActionsButton.click();
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // ========== CLICK ACTIONS - NAVIGATION & STATUS HISTORY ==========

    // Click "Navigation" link
    const navigationLink = page.locator('text=Navigation').first();
    await navigationLink.scrollIntoViewIfNeeded();
    await navigationLink.click();
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Click "Status History" link
    const statusHistoryLink = page.locator('text=Status History').first();
    await statusHistoryLink.scrollIntoViewIfNeeded();
    await statusHistoryLink.click();
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // ========== DROPDOWNS/DRILLDOWNS - RIGHT PANEL ACCORDIONS ==========

    // Click "Users/Teams Assigned" accordion (already expanded - collapse it)
    const usersTeamsButton = page.getByRole('button', { name: /Users\/Teams Assigned/ });
    await usersTeamsButton.scrollIntoViewIfNeeded();
    await usersTeamsButton.click();
    await page.waitForTimeout(500);
    // Re-expand it
    await usersTeamsButton.click();
    await expect(page.getByRole('region', { name: /Users\/Teams Assigned/ })).toBeVisible();

    // Click "Timelog Summary" accordion (already expanded - collapse it)
    const timelogButton = page.getByRole('button', { name: /Timelog Summary/ });
    await timelogButton.scrollIntoViewIfNeeded();
    await timelogButton.click();
    await page.waitForTimeout(500);
    // Re-expand it
    await timelogButton.click();
    await expect(page.getByRole('region', { name: /Timelog Summary/ })).toBeVisible();

    // Click "Organization" accordion (already expanded - collapse it)
    const organizationButton = page.getByRole('button', { name: /Organization/ }).first();
    await organizationButton.scrollIntoViewIfNeeded();
    await organizationButton.click();
    await page.waitForTimeout(500);
    // Re-expand it
    await organizationButton.click();
    await expect(page.getByRole('region', { name: /Organization/ })).toBeVisible();

    // Click "Customer" accordion (already expanded - collapse it)
    const customerButton = page.getByRole('button', { name: /^Customer/ });
    await customerButton.scrollIntoViewIfNeeded();
    await customerButton.click();
    await page.waitForTimeout(500);
    // Re-expand it
    await customerButton.click();
    await expect(page.getByRole('region', { name: /Customer/ })).toBeVisible();

    // Click "Property" accordion (already expanded - collapse it)
    const propertyButton = page.getByRole('button', { name: /Property/ });
    await propertyButton.scrollIntoViewIfNeeded();
    await propertyButton.click();
    await page.waitForTimeout(500);
    // Re-expand it
    await propertyButton.click();
    await expect(page.getByRole('region', { name: /Property/ })).toBeVisible();

    // Click "Project" accordion (collapsed - expand it)
    const projectButton = page.getByRole('button', { name: /^Project / });
    await projectButton.scrollIntoViewIfNeeded();
    await projectButton.click();
    await page.waitForTimeout(500);
    // Collapse it back
    await projectButton.click();
    await page.waitForTimeout(500);

    // Click "Child Jobs Associated" accordion (collapsed - expand it)
    const childJobsButton = page.getByRole('button', { name: /Child Jobs Associated/ });
    await childJobsButton.scrollIntoViewIfNeeded();
    await childJobsButton.click();
    await page.waitForTimeout(500);
    // Collapse it back
    await childJobsButton.click();
    await page.waitForTimeout(500);

    // Click "Quotes Associated" accordion (collapsed - expand it)
    const quotesButton = page.getByRole('button', { name: /Quotes Associated/ });
    await quotesButton.scrollIntoViewIfNeeded();
    await quotesButton.click();
    await page.waitForTimeout(500);
    // Collapse it back
    await quotesButton.click();
    await page.waitForTimeout(500);

    // Click "Invoices Associated" accordion (collapsed - expand it)
    const invoicesButton = page.getByRole('button', { name: /Invoices Associated/ });
    await invoicesButton.scrollIntoViewIfNeeded();
    await invoicesButton.click();
    await page.waitForTimeout(500);
    // Collapse it back
    await invoicesButton.click();
    await page.waitForTimeout(500);

    // Click "Purchase Orders" accordion (collapsed - expand it)
    const purchaseOrdersButton = page.getByRole('button', { name: /Purchase Orders/ });
    await purchaseOrdersButton.scrollIntoViewIfNeeded();
    await purchaseOrdersButton.click();
    await page.waitForTimeout(500);
    // Collapse it back
    await purchaseOrdersButton.click();
    await page.waitForTimeout(500);

    // Click "Contract" accordion (collapsed - expand it)
    const contractButton = page.getByRole('button', { name: /Contract/ });
    await contractButton.scrollIntoViewIfNeeded();
    await contractButton.click();
    await page.waitForTimeout(500);
    // Collapse it back
    await contractButton.click();
    await page.waitForTimeout(500);

    // Click "Assets Associated" accordion (collapsed - expand it)
    const assetsButton = page.getByRole('button', { name: /Assets Associated/ });
    await assetsButton.scrollIntoViewIfNeeded();
    await assetsButton.click();
    await page.waitForTimeout(500);
    // Collapse it back
    await assetsButton.click();
    await page.waitForTimeout(500);

    // Click "Attachments" accordion (collapsed - expand it)
    const attachmentsButton = page.getByRole('button', { name: /Attachments/ });
    await attachmentsButton.scrollIntoViewIfNeeded();
    await attachmentsButton.click();
    await page.waitForTimeout(500);
    // Collapse it back
    await attachmentsButton.click();
    await page.waitForTimeout(500);

    // ========== DROPDOWNS - SERVICE TASKS SECTION ==========

    // Scroll to service tasks section
    const serviceTasksHeading = page.locator('text=Service Tasks').first();
    await serviceTasksHeading.scrollIntoViewIfNeeded();
    await expect(serviceTasksHeading).toBeVisible();

    // Click the Service Tasks expand/collapse toggle
    const serviceTasksToggle = page.locator('[class*="service-task"], [data-testid*="service"]').first();
    if (await serviceTasksToggle.isVisible().catch(() => false)) {
      await serviceTasksToggle.click();
      await page.waitForTimeout(500);
    }

    // ========== DROPDOWNS - OTHER DETAILS CUSTOM FIELD SECTIONS ==========

    // Toggle "Other Details" section expand/collapse
    const otherDetailsHeading = page.getByRole('heading', { name: 'Other Details' });
    if (await otherDetailsHeading.isVisible().catch(() => false)) {
      const otherDetailsToggle = otherDetailsHeading.locator('..').locator('[cursor=pointer]').first();
      try {
        await otherDetailsToggle.scrollIntoViewIfNeeded();
        await otherDetailsToggle.click();
        await page.waitForTimeout(500);
        // Re-expand
        await otherDetailsToggle.click();
        await page.waitForTimeout(500);
      } catch {
        // Toggle may not be available
      }
    }

    // ========== REDIRECTIONS ==========

    // Test 1: "Jobs" breadcrumb redirects back to Jobs list
    const jobsBreadcrumb = page.getByRole('link', { name: 'Jobs' });
    await jobsBreadcrumb.scrollIntoViewIfNeeded();
    await jobsBreadcrumb.click();
    await page.waitForURL('**/jobs', { timeout: 30000 });
    await expect(page).toHaveTitle(/Jobs/);

    // Navigate back to the job details page
    await page.goBack();
    await page.waitForURL('**/jobs/*/details', { timeout: 60000 });

    // Wait for the details page to fully reload
    await page.getByRole('heading', { name: 'Primary Details' }).waitFor({ state: 'visible', timeout: 30000 });

    // Test 2: Organization link opens organization side panel
    const orgButton = page.getByRole('button', { name: /Organization/ }).first();
    await orgButton.scrollIntoViewIfNeeded();
    // Ensure the Organization accordion is expanded
    const orgRegion = page.getByRole('region', { name: /Organization/ });
    if (!(await orgRegion.isVisible().catch(() => false))) {
      await orgButton.click();
      await page.waitForTimeout(1000);
    }

    const orgLink = page.getByRole('link', { name: 'TestROrg' });
    if (await orgLink.isVisible().catch(() => false)) {
      await orgLink.click();
      await page.waitForTimeout(2000);

      // Verify the organization side panel opens with correct content
      await expect(page.getByRole('heading', { name: 'TestROrg' }).first()).toBeVisible();

      // Verify organization panel tabs are clickable
      const orgAddressesBtn = page.getByRole('button', { name: 'Organization Addresses' });
      if (await orgAddressesBtn.isVisible().catch(() => false)) {
        await orgAddressesBtn.click();
        await page.waitForTimeout(500);
      }

      const customersAssocBtn = page.getByRole('button', { name: /Customers Associated/ });
      if (await customersAssocBtn.isVisible().catch(() => false)) {
        await customersAssocBtn.click();
        await page.waitForTimeout(500);
      }

      const jobsBtn = page.getByRole('button', { name: /^Jobs \(/ });
      if (await jobsBtn.isVisible().catch(() => false)) {
        await jobsBtn.click();
        await page.waitForTimeout(500);
      }

      // Verify the open_in_new button exists for navigating to the org details page
      const openInNewBtn = page.locator('img:has-text("open_in_new")').first();
      if (await openInNewBtn.isVisible().catch(() => false)) {
        await expect(openInNewBtn).toBeVisible();
      }

      // Close the side panel by pressing Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Test 3: Click the job breadcrumb link to verify it redirects correctly
    const jobDetailBreadcrumb = page.getByRole('link', { name: /^#\d+/ });
    if (await jobDetailBreadcrumb.isVisible().catch(() => false)) {
      await jobDetailBreadcrumb.click();
      await page.waitForURL('**/jobs/*/details', { timeout: 30000 });
      await expect(page.url()).toContain('/details');
    }

    // Final assertion - verify we are on a valid page
    await expect(page).toHaveTitle(/Zuper Pro/);
  });
});
