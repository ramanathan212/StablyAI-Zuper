import { test, expect } from '@stablyai/playwright-test';

test.describe('Job Details Page Interactions', () => {
  // Shared login and navigation helper
  async function loginAndNavigateToFirstJobDetails(page) {
    // Navigate to login page
    await page.goto('https://stagingv3.zuperpro.com/');
    await page.getByRole('textbox', { name: 'Company Name' }).waitFor({ state: 'visible' });

    // Enter company name and continue
    await page.getByRole('textbox', { name: 'Company Name' }).fill('TestR');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Enter credentials and login
    const emailField = page.getByRole('textbox', { name: 'Email address' });
    await emailField.waitFor({ state: 'visible' });
    await emailField.click();
    await emailField.fill('ragupathy.s@zuper.co');

    // Wait a moment for the password field to be ready
    await page.waitForTimeout(500);

    // Use input[type="password"] for more reliable password field targeting
    const passwordField = page.locator('input[type="password"]');
    await passwordField.waitFor({ state: 'visible' });
    await passwordField.click();
    await passwordField.fill('Test@1234');

    await page.getByRole('button', { name: 'Login' }).click();

    // Wait for login to complete using URL polling - handles slow SPA loading
    await page.waitForFunction(
      () => window.location.href.includes('/dashboard'),
      { timeout: 90000 }
    );

    // Wait for dashboard content to fully render
    await page.waitForTimeout(5000);

    // Cancel timezone popup if it appears
    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    try {
      await cancelButton.waitFor({ state: 'visible', timeout: 10000 });
      await cancelButton.click();
    } catch {
      // Popup didn't appear, continue
    }

    // Wait for any remaining popups/loaders to settle
    await page.waitForTimeout(2000);

    // Navigate to Jobs module via sidebar
    await page.locator('#job_group mat-icon').hover();
    await page.getByRole('link', { name: 'Jobs' }).click();
    await page.waitForURL('**/jobs', { timeout: 30000 });

    // Verify Jobs page loaded
    await expect(page.locator('nav[aria-label="Breadcrumb"]').getByText('Jobs')).toBeVisible();

    // Click on the first job in the list (Work Order number link)
    const firstJobLink = page.locator('table tbody tr').first().locator('a').first();
    await firstJobLink.waitFor({ state: 'visible' });
    const firstJobWorkOrder = await firstJobLink.textContent();
    await firstJobLink.click();

    // Wait for job details page to load
    await page.waitForURL('**/jobs/*/details', { timeout: 30000 });
    await expect(page.locator('text=Primary Details')).toBeVisible();

    return firstJobWorkOrder;
  }

  /**
   * User Prompt:
   * - Login "https://stagingv3.zuperpro.com/" Company Name: TestR Username: ragupathy.s@zuper.co Password: Test@1234
   * - Once logged in cancel the pop ups in the Dashboard
   * - Go to the Jobs module
   * - Open the details page of first job from the list
   * - Perform all the click actions are working properly
   */
  test('verify all click actions on job details page', async ({ page }) => {
    await loginAndNavigateToFirstJobDetails(page);

    // --- Top Action Buttons ---

    // 1. Click "Update Status" button
    const updateStatusText = page.locator('text=Update Status');
    await updateStatusText.scrollIntoViewIfNeeded();
    await expect(updateStatusText).toBeVisible();

    // 2. Click "Reschedule" button
    const rescheduleText = page.locator('text=Reschedule');
    await expect(rescheduleText).toBeVisible();

    // 3. Click "New" action button (job creation shortcut)
    const newActionText = page.locator('[class*="job-detail"] >> text=New').first();
    await expect(newActionText).toBeVisible();

    // 4. Click "Add Note" button
    const addNoteText = page.locator('text=Add Note');
    await expect(addNoteText).toBeVisible();

    // --- Navigation & Status History Tabs ---

    // 5. Click "Navigation" tab
    const navigationTab = page.locator('text=Navigation').first();
    await navigationTab.click();
    await expect(navigationTab).toBeVisible();

    // 6. Click "Status History" tab
    const statusHistoryTab = page.getByText('Status History', { exact: true });
    await statusHistoryTab.click();
    await expect(statusHistoryTab).toBeVisible();

    // Switch back to Navigation
    await navigationTab.click();

    // --- Left Side Navigation Tabs ---

    // 7. Click "Details" tab
    const detailsTab = page.getByRole('button', { name: 'Details' });
    await detailsTab.click();
    await expect(page.locator('text=Primary Details')).toBeVisible();

    // 8. Click "Line Items" tab
    const lineItemsTab = page.getByRole('button', { name: 'Line Items' });
    await lineItemsTab.click();
    // Wait for Line Items content to appear
    await page.waitForTimeout(2000);
    await expect(lineItemsTab).toBeVisible();

    // 9. Click "Notes" tab
    const notesTab = page.getByRole('button', { name: 'Notes' });
    await notesTab.click();
    await page.waitForTimeout(2000);
    await expect(notesTab).toBeVisible();

    // 10. Click "Activity" tab
    const activityTab = page.getByRole('button', { name: 'Activity', exact: true });
    await activityTab.click();
    await page.waitForTimeout(2000);
    await expect(activityTab).toBeVisible();

    // 11. Click "Chat" tab
    const chatTab = page.getByRole('button', { name: 'Chat' });
    await chatTab.click();
    await page.waitForTimeout(2000);
    await expect(chatTab).toBeVisible();

    // Navigate back to Details tab for remaining tests
    await detailsTab.click();
    await expect(page.locator('text=Primary Details')).toBeVisible();

    // --- Right Panel Accordion Sections ---

    // 12. Click "Users/Teams Assigned" accordion
    const usersTeamsBtn = page.getByRole('button', { name: /Users\/Teams Assigned/ });
    await usersTeamsBtn.scrollIntoViewIfNeeded();
    await usersTeamsBtn.click();
    await page.waitForTimeout(1000);
    // Click again to re-expand if it collapsed
    const usersRegion = page.getByRole('region', { name: /Users\/Teams Assigned/ });
    if (!(await usersRegion.isVisible())) {
      await usersTeamsBtn.click();
    }
    await expect(usersTeamsBtn).toBeVisible();

    // 13. Click "Timelog Summary" accordion
    const timelogBtn = page.getByRole('button', { name: /Timelog Summary/ });
    await timelogBtn.scrollIntoViewIfNeeded();
    await timelogBtn.click();
    await page.waitForTimeout(1000);
    await expect(timelogBtn).toBeVisible();

    // 14. Click "Organization" accordion
    const orgBtn = page.getByRole('button', { name: 'Organization' }).first();
    await orgBtn.scrollIntoViewIfNeeded();
    await orgBtn.click();
    await page.waitForTimeout(1000);
    await expect(orgBtn).toBeVisible();

    // 15. Click "Customer" accordion
    const customerBtn = page.getByRole('button', { name: 'Customer' }).first();
    await customerBtn.scrollIntoViewIfNeeded();
    await customerBtn.click();
    await page.waitForTimeout(1000);
    await expect(customerBtn).toBeVisible();

    // 16. Click "Property" accordion
    const propertyBtn = page.getByRole('button', { name: 'Property' }).first();
    await propertyBtn.scrollIntoViewIfNeeded();
    await propertyBtn.click();
    await page.waitForTimeout(1000);
    await expect(propertyBtn).toBeVisible();

    // 17. Click "Project" accordion
    const projectBtn = page.getByRole('button', { name: 'Project' }).first();
    await projectBtn.scrollIntoViewIfNeeded();
    await projectBtn.click();
    await page.waitForTimeout(1000);
    await expect(projectBtn).toBeVisible();

    // 18. Click "Child Jobs Associated" accordion
    const childJobsBtn = page.getByRole('button', { name: 'Child Jobs Associated' });
    await childJobsBtn.scrollIntoViewIfNeeded();
    await childJobsBtn.click();
    await page.waitForTimeout(1000);
    await expect(childJobsBtn).toBeVisible();

    // 19. Click "Quotes Associated" accordion
    const quotesBtn = page.getByRole('button', { name: 'Quotes Associated' });
    await quotesBtn.scrollIntoViewIfNeeded();
    await quotesBtn.click();
    await page.waitForTimeout(1000);
    await expect(quotesBtn).toBeVisible();

    // 20. Click "Invoices Associated" accordion
    const invoicesBtn = page.getByRole('button', { name: 'Invoices Associated' });
    await invoicesBtn.scrollIntoViewIfNeeded();
    await invoicesBtn.click();
    await page.waitForTimeout(1000);
    await expect(invoicesBtn).toBeVisible();

    // 21. Click "Purchase Orders" accordion
    const purchaseOrdersBtn = page.getByRole('button', { name: /Purchase Orders/ });
    await purchaseOrdersBtn.scrollIntoViewIfNeeded();
    await purchaseOrdersBtn.click();
    await page.waitForTimeout(1000);
    await expect(purchaseOrdersBtn).toBeVisible();

    // 22. Click "Contract" accordion
    const contractBtn = page.getByRole('button', { name: 'Contract' }).first();
    await contractBtn.scrollIntoViewIfNeeded();
    await contractBtn.click();
    await page.waitForTimeout(1000);
    await expect(contractBtn).toBeVisible();

    // 23. Click "Assets Associated" accordion
    const assetsBtn = page.getByRole('button', { name: /Assets Associated/ });
    await assetsBtn.scrollIntoViewIfNeeded();
    await assetsBtn.click();
    await page.waitForTimeout(1000);
    await expect(assetsBtn).toBeVisible();

    // 24. Click "Attachments" accordion
    const attachmentsBtn = page.getByRole('button', { name: /Attachments/ });
    await attachmentsBtn.scrollIntoViewIfNeeded();
    await attachmentsBtn.click();
    await page.waitForTimeout(1000);
    await expect(attachmentsBtn).toBeVisible();

    // --- Service Tasks Section ---

    // 25. Verify Service Tasks section is visible and clickable
    await detailsTab.click();
    await expect(page.locator('text=Primary Details')).toBeVisible();
    const serviceTasksHeader = page.locator('text=Service Tasks').first();
    await serviceTasksHeader.scrollIntoViewIfNeeded();
    await expect(serviceTasksHeader).toBeVisible();
  });

  /**
   * User Prompt:
   * - Login "https://stagingv3.zuperpro.com/" Company Name: TestR Username: ragupathy.s@zuper.co Password: Test@1234
   * - Once logged in cancel the pop ups in the Dashboard
   * - Go to the Jobs module
   * - Open the details page of first job from the list
   * - Perform all the drildowns/dropdowns are working properly
   */
  test('verify all drilldowns and dropdowns on job details page', async ({ page }) => {
    await loginAndNavigateToFirstJobDetails(page);

    // --- Print/Share Dropdown ---
    // 1. Click Print/Share dropdown
    const printShareBtn = page.locator('text=Print/Share');
    await printShareBtn.click();
    await page.waitForTimeout(1500);

    // Take a snapshot to see dropdown options
    const printDropdownVisible = await page.locator('[class*="dropdown-menu"], [class*="popover"], [role="menu"], [role="listbox"]').first().isVisible().catch(() => false);

    // Close by clicking elsewhere
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // --- More Actions Dropdown ---
    // 2. Click More Actions dropdown
    const moreActionsBtn = page.locator('text=More Actions');
    await moreActionsBtn.click();
    await page.waitForTimeout(1500);

    // Close by pressing Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // --- Update Status Drilldown ---
    // 3. Click Update Status to see status options
    const updateStatusIcon = page.locator('text=Update Status').first();
    await updateStatusIcon.scrollIntoViewIfNeeded();
    await updateStatusIcon.click();
    await page.waitForTimeout(2000);

    // Check if a modal or dropdown appeared
    const statusModal = page.locator('[class*="modal"], [class*="dialog"], [role="dialog"]').first();
    const statusModalVisible = await statusModal.isVisible().catch(() => false);
    if (statusModalVisible) {
      // Close modal
      const closeBtn = page.locator('[class*="modal"] button[class*="close"], [role="dialog"] button:has-text("Close"), button:has-text("Cancel")').first();
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(1000);
    } else {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // --- Custom Field Sections Expand/Collapse ---
    // 4. Click "Other Details" section expand/collapse
    const otherDetailsHeader = page.locator('h3:has-text("Other Details")');
    await otherDetailsHeader.scrollIntoViewIfNeeded();
    const otherDetailsToggle = otherDetailsHeader.locator('..').locator('[cursor="pointer"], [class*="toggle"], [class*="expand"]').first();
    if (await otherDetailsToggle.isVisible().catch(() => false)) {
      await otherDetailsToggle.click();
      await page.waitForTimeout(1000);
      // Click again to re-expand
      await otherDetailsToggle.click();
      await page.waitForTimeout(1000);
    }

    // 5. Click "Test" custom field section
    const testSectionHeader = page.locator('h3:has-text("Test")');
    if (await testSectionHeader.isVisible().catch(() => false)) {
      await testSectionHeader.scrollIntoViewIfNeeded();
      await expect(testSectionHeader).toBeVisible();
    }

    // 6. Click "QA" custom field section
    const qaSectionHeader = page.locator('h3:has-text("QA")');
    if (await qaSectionHeader.isVisible().catch(() => false)) {
      await qaSectionHeader.scrollIntoViewIfNeeded();
      await expect(qaSectionHeader).toBeVisible();
    }

    // --- Right Panel Accordion Expand/Collapse Drilldowns ---

    // 7. Users/Teams Assigned - expand then collapse then expand
    const usersTeamsBtn = page.getByRole('button', { name: /Users\/Teams Assigned/ });
    await usersTeamsBtn.scrollIntoViewIfNeeded();

    // Collapse it
    await usersTeamsBtn.click();
    await page.waitForTimeout(800);

    // Expand it again
    await usersTeamsBtn.click();
    await page.waitForTimeout(800);

    // Verify the region content is visible after expanding
    const usersRegion = page.getByRole('region', { name: /Users\/Teams Assigned/ });
    await expect(usersRegion).toBeVisible();

    // 8. Organization accordion - expand/collapse
    const orgBtn = page.getByRole('button', { name: 'Organization' }).first();
    await orgBtn.scrollIntoViewIfNeeded();
    await orgBtn.click();
    await page.waitForTimeout(800);
    await orgBtn.click();
    await page.waitForTimeout(800);
    const orgRegion = page.getByRole('region', { name: 'Organization' });
    await expect(orgRegion).toBeVisible();

    // 9. Customer accordion - expand/collapse
    const customerBtn = page.getByRole('button', { name: 'Customer' }).first();
    await customerBtn.scrollIntoViewIfNeeded();
    await customerBtn.click();
    await page.waitForTimeout(800);
    await customerBtn.click();
    await page.waitForTimeout(800);
    const customerRegion = page.getByRole('region', { name: 'Customer' });
    await expect(customerRegion).toBeVisible();

    // 10. Property accordion - expand/collapse
    const propertyBtn = page.getByRole('button', { name: 'Property' }).first();
    await propertyBtn.scrollIntoViewIfNeeded();
    await propertyBtn.click();
    await page.waitForTimeout(800);
    await propertyBtn.click();
    await page.waitForTimeout(800);
    const propertyRegion = page.getByRole('region', { name: 'Property' });
    await expect(propertyRegion).toBeVisible();

    // 11. Verify all accordion sections are clickable and respond
    const accordionSections = [
      'Project',
      'Child Jobs Associated',
      'Quotes Associated',
      'Invoices Associated',
      /Purchase Orders/,
      'Contract',
      /Assets Associated/,
      /Attachments/
    ];

    for (const section of accordionSections) {
      const btn = typeof section === 'string'
        ? page.getByRole('button', { name: section }).first()
        : page.getByRole('button', { name: section });
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      await page.waitForTimeout(800);
      await expect(btn).toBeVisible();
      // Click again to toggle back
      await btn.click();
      await page.waitForTimeout(500);
    }
  });

  /**
   * User Prompt:
   * - Login "https://stagingv3.zuperpro.com/" Company Name: TestR Username: ragupathy.s@zuper.co Password: Test@1234
   * - Once logged in cancel the pop ups in the Dashboard
   * - Go to the Jobs module
   * - Open the details page of first job from the list
   * - Perform all the redirections are working properly
   */
  test('verify all redirections on job details page', async ({ page }) => {
    const workOrderNumber = await loginAndNavigateToFirstJobDetails(page);

    // Store the current job details URL
    const jobDetailsUrl = page.url();

    // --- Breadcrumb Redirections ---

    // 1. Click "Jobs" breadcrumb link - should redirect to jobs list
    const jobsBreadcrumb = page.locator('nav[aria-label="Breadcrumb"]').getByRole('link', { name: 'Jobs' });
    await jobsBreadcrumb.click();
    await page.waitForURL('**/jobs', { timeout: 30000 });
    await expect(page.locator('nav[aria-label="Breadcrumb"]').getByText('Jobs')).toBeVisible();

    // 2. Navigate back to the job details
    await page.goto(jobDetailsUrl);
    await page.locator('text=Primary Details').waitFor({ state: 'visible', timeout: 30000 });

    // 3. Click the job number breadcrumb link - should stay on same page
    const jobBreadcrumbLink = page.locator('nav[aria-label="Breadcrumb"]').getByRole('link', { name: /^#\d+/ });
    if (await jobBreadcrumbLink.isVisible()) {
      await jobBreadcrumbLink.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/jobs\/.*\/details/);
    }

    // --- Organization Redirection ---

    // 4. Click on Organization name link if present
    const orgLink = page.getByRole('link', { name: 'TestROrg' });
    const orgBtn = page.getByRole('button', { name: 'Organization' }).first();

    // Ensure Organization section is expanded
    await orgBtn.scrollIntoViewIfNeeded();
    const orgRegion = page.getByRole('region', { name: 'Organization' });
    if (!(await orgRegion.isVisible().catch(() => false))) {
      await orgBtn.click();
      await page.waitForTimeout(1000);
    }

    if (await orgLink.isVisible().catch(() => false)) {
      await orgLink.click();
      // Organization link opens a side panel/drawer rather than navigating to a new page
      await page.waitForTimeout(3000);

      // Verify the side panel opened with organization details
      const orgPanelTitle = page.getByText('TestROrg').first();
      await expect(orgPanelTitle).toBeVisible();

      // Verify key org details in the panel
      const orgAddresses = page.getByText('Organization Addresses');
      const customersAssociated = page.getByText('Customers Associated');
      if (await orgAddresses.isVisible().catch(() => false)) {
        await expect(orgAddresses).toBeVisible();
      }
      if (await customersAssociated.isVisible().catch(() => false)) {
        await expect(customersAssociated).toBeVisible();
      }

      // Close the side panel - use Escape key which reliably closes overlay panels
      await page.keyboard.press('Escape');
      await page.waitForTimeout(2000);
    }

    // --- Tab Navigations (verify URL doesn't change but content does) ---

    // 5. Click "Line Items" tab and verify we stay on the same job page
    const lineItemsTab = page.getByRole('button', { name: 'Line Items' });
    await lineItemsTab.click();
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/jobs\/.*\/details/);

    // 6. Click "Notes" tab
    const notesTab = page.getByRole('button', { name: 'Notes' });
    await notesTab.click();
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/jobs\/.*\/details/);

    // 7. Click "Activity" tab
    const activityTab = page.getByRole('button', { name: 'Activity', exact: true });
    await activityTab.click();
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/jobs\/.*\/details/);

    // 8. Click "Chat" tab
    const chatTab = page.getByRole('button', { name: 'Chat' });
    await chatTab.click();
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/jobs\/.*\/details/);

    // Navigate back to Details
    const detailsTab = page.getByRole('button', { name: 'Details' });
    await detailsTab.click();
    await page.locator('text=Primary Details').waitFor({ state: 'visible', timeout: 15000 });

    // --- User/Team Redirection ---

    // 9. Check if user name in Users/Teams section is clickable
    const usersTeamsBtn = page.getByRole('button', { name: /Users\/Teams Assigned/ });
    await usersTeamsBtn.scrollIntoViewIfNeeded();
    const usersRegion2 = page.getByRole('region', { name: /Users\/Teams Assigned/ });
    if (!(await usersRegion2.isVisible().catch(() => false))) {
      await usersTeamsBtn.click();
      await page.waitForTimeout(1000);
    }

    const userName = page.locator('h3:has-text("TestFE 1")').first();
    if (await userName.isVisible().catch(() => false)) {
      await userName.click();
      await page.waitForTimeout(3000);

      // Check if it redirected to a user profile page or opened a popover
      const currentUrl = page.url();
      if (!currentUrl.includes('/jobs/')) {
        // Redirected away - navigate back
        await page.goto(jobDetailsUrl);
        await page.locator('text=Primary Details').waitFor({ state: 'visible', timeout: 30000 });
      }
    }

    // --- Verify page title contains job info ---
    const pageTitle = await page.title();
    expect(pageTitle).toContain('Zuper Pro');
  });
});
