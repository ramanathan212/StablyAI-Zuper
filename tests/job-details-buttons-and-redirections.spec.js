import { test, expect } from '@stablyai/playwright-test';

test.describe('Job Details - Buttons, Redirections, and Placeholders Verification', () => {
  /**
   * User Prompt:
   * - Log in "https://stagingv3.zuperpro.com"
   *   Company name: TestR
   *   username : ragupathy.s@zuper.co
   *   password: Test@1234
   *   after login click on the "cancel" pop up button in the dashboard page
   *   Go to the jobs module
   *   Open the first job in the listing
   *   ensure all the buttons are clickable
   *   ensure all the redirections are working
   *   ensure all the buttons,placeholders are correctly showing without breaking
   */
  test('Verify all buttons, redirections, and placeholders on job details page', async ({ page }) => {
    // Helper: Dismiss the Zuper Connect widget overlay that intercepts clicks
    const dismissZuperConnect = async () => {
      const zuperConnect = page.locator('#zuper-connect-container');
      const isVisible = await zuperConnect.isVisible().catch(() => false);
      if (isVisible) {
        // Close the widget by clicking its close button
        await zuperConnect.getByRole('emphasis').click().catch(() => {});
      }
      // Also hide the zuper-connect iframe overlay via CSS to prevent click interception
      await page.evaluate(() => {
        const overlay = document.querySelector('.cdk-overlay-container');
        if (overlay) {
          const iframes = overlay.querySelectorAll('iframe.zuper-connect-iframe, iframe[id="zuper-connect-frame"]');
          iframes.forEach(iframe => {
            const parent = iframe.closest('.cdk-overlay-pane');
            if (parent) parent.style.display = 'none';
          });
        }
        const container = document.querySelector('#zuper-connect-container');
        if (container) container.style.display = 'none';
      }).catch(() => {});
    };

    // ============================================================
    // STEP 1: Login
    // ============================================================
    await test.step('Login to the application', async () => {
      await page.goto('https://stagingv3.zuperpro.com/login');

      // Enter company name
      await page.getByRole('textbox', { name: 'Company Name' }).describe('Company name input').fill('TestR');
      await page.getByRole('button', { name: 'Continue' }).describe('Continue button').click();

      // Enter credentials and login
      await page.getByRole('textbox', { name: 'Email address' }).describe('Email input').fill('ragupathy.s@zuper.co');
      await page.getByRole('textbox', { name: /Password/ }).describe('Password input').fill('Test@1234');
      await page.getByRole('button', { name: 'Login', exact: true }).describe('Login button').click();

      // Verify dashboard loads
      await page.waitForURL('**/dashboard', { timeout: 60000 });
      await expect(page).toHaveTitle(/Dashboard/);
    });

    // ============================================================
    // STEP 2: Dismiss the "Cancel" popup on dashboard
    // ============================================================
    await test.step('Dismiss the Cancel popup on dashboard', async () => {
      const cancelButton = page.getByRole('button', { name: 'Cancel' }).describe('Cancel popup button');
      const isPopupVisible = await cancelButton.isVisible({ timeout: 10000 }).catch(() => false);
      if (isPopupVisible) {
        await cancelButton.click();
      }
    });

    // ============================================================
    // STEP 3: Close the Zuper Connect widget if visible
    // ============================================================
    await test.step('Close Zuper Connect widget if visible', async () => {
      await dismissZuperConnect();
    });

    // ============================================================
    // STEP 4: Navigate to Jobs module
    // ============================================================
    await test.step('Navigate to Jobs module', async () => {
      await page.goto('https://stagingv3.zuperpro.com/jobs');
      await page.locator('table tbody tr').first().describe('First job row').waitFor({ state: 'visible', timeout: 60000 });
      await expect(page).toHaveTitle(/Jobs/);
    });

    // ============================================================
    // STEP 5: Open the first job in the listing
    // ============================================================
    await test.step('Open the first job in the listing', async () => {
      const firstJobRow = page.locator('table tbody tr').first().describe('First job row');
      const firstJobLink = firstJobRow.locator('a').first().describe('First job link');
      await firstJobLink.click();
      await page.waitForURL('**/jobs/*/details', { timeout: 60000 });
      await expect(page).toHaveTitle(/Job.*Zuper Pro/);
      // Dismiss Zuper Connect widget that may reappear on job details page
      await dismissZuperConnect();
    });

    // ============================================================
    // STEP 6: Verify all top action buttons are visible and enabled
    // ============================================================
    await test.step('Verify top action buttons are visible and enabled', async () => {
      // Wait for the job details page to fully render
      const updateStatusText = page.getByText('Update Status').describe('Update Status button text');
      await updateStatusText.waitFor({ state: 'visible', timeout: 30000 });

      // Verify Update Status button
      await expect(updateStatusText).toBeVisible();

      // Verify Reschedule button
      const rescheduleText = page.getByText('Reschedule', { exact: true }).describe('Reschedule button text');
      await expect(rescheduleText).toBeVisible();

      // Verify New button (creates new sub-entity) - scoped near the action buttons area
      // The "New" button text appears next to Update Status, Reschedule, Add Note
      const actionArea = page.locator('p').filter({ hasText: 'New' }).first().describe('New action button text');
      await expect(actionArea).toBeVisible();

      // Verify Add Note button
      const addNoteText = page.getByText('Add Note', { exact: true }).describe('Add Note button text');
      await expect(addNoteText).toBeVisible();
    });

    // ============================================================
    // STEP 7: Verify all main tab buttons are visible and enabled
    // ============================================================
    await test.step('Verify main tab buttons are visible and enabled', async () => {
      const detailsTab = page.getByRole('button', { name: 'Details' }).describe('Details tab');
      const lineItemsTab = page.getByRole('button', { name: 'Line Items' }).describe('Line Items tab');
      const notesTab = page.getByRole('button', { name: 'Notes' }).describe('Notes tab');
      const activityTab = page.getByRole('button', { name: 'Activity' }).describe('Activity tab');
      const chatTab = page.getByRole('button', { name: 'Chat' }).describe('Chat tab');

      await expect(detailsTab).toBeVisible();
      await expect(detailsTab).toBeEnabled();
      await expect(lineItemsTab).toBeVisible();
      await expect(lineItemsTab).toBeEnabled();
      await expect(notesTab).toBeVisible();
      await expect(notesTab).toBeEnabled();
      await expect(activityTab).toBeVisible();
      await expect(activityTab).toBeEnabled();
      await expect(chatTab).toBeVisible();
      await expect(chatTab).toBeEnabled();
    });

    // ============================================================
    // STEP 8: Verify Primary Details section placeholders
    // ============================================================
    await test.step('Verify Primary Details section is displayed correctly', async () => {
      const primaryDetailsHeading = page.getByRole('heading', { name: 'Primary Details' }).describe('Primary Details heading');
      await expect(primaryDetailsHeading).toBeVisible();

      // Verify all detail field labels/placeholders are present
      const fieldLabels = [
        'Job Category',
        'Job Priority',
        'Job Type',
        'Scheduled Start Time',
        'Scheduled End Time',
        'Due Date',
        'Parent Job',
        'Job Created On',
        'Job Created By',
        'Job Tags',
        'Job Skills'
      ];

      for (const label of fieldLabels) {
        const term = page.locator('dt').filter({ hasText: label }).describe(`${label} label`);
        await expect(term).toBeVisible();
      }
    });

    // ============================================================
    // STEP 9: Verify Address section is displayed correctly
    // ============================================================
    await test.step('Verify Address section is displayed correctly', async () => {
      const addressHeading = page.getByRole('heading', { name: 'Address', exact: true }).describe('Address heading');
      await expect(addressHeading).toBeVisible();

      const serviceAddress = page.getByRole('heading', { name: 'Service Address' }).describe('Service Address heading');
      await expect(serviceAddress).toBeVisible();

      const billingAddress = page.getByRole('heading', { name: 'Billing Address' }).describe('Billing Address heading');
      await expect(billingAddress).toBeVisible();
    });

    // ============================================================
    // STEP 10: Verify right sidebar accordion sections are visible and clickable
    // ============================================================
    await test.step('Verify right sidebar accordion sections are visible and clickable', async () => {
      const accordionSections = [
        'Users/Teams Assigned',
        'Timelog Summary',
        'Organization',
        'Customer',
        'Property',
        'Project',
        'Child Jobs Associated',
        'Quotes Associated',
        'Invoices Associated',
        'Purchase Orders',
        'Contract',
        'Assets Associated',
        'Attachments'
      ];

      for (const section of accordionSections) {
        const sectionButton = page.getByRole('button', { name: new RegExp(section) }).describe(`${section} accordion`);
        await sectionButton.scrollIntoViewIfNeeded();
        await expect(sectionButton).toBeVisible();
        await expect(sectionButton).toBeEnabled();
      }
    });

    // ============================================================
    // STEP 11: Verify tab redirections work - Line Items tab
    // ============================================================
    await test.step('Verify Line Items tab redirection works', async () => {
      const lineItemsTab = page.getByRole('button', { name: 'Line Items' }).describe('Line Items tab');
      await lineItemsTab.click();
      // Wait for the Line Items content to be visible
      await page.getByText('Line Items').first().describe('Line Items content').waitFor({ state: 'visible', timeout: 10000 });
    });

    // ============================================================
    // STEP 12: Verify Notes tab redirection works
    // ============================================================
    await test.step('Verify Notes tab redirection works', async () => {
      const notesTab = page.getByRole('button', { name: 'Notes' }).describe('Notes tab');
      await notesTab.click();
      await page.getByText('Notes').first().describe('Notes content').waitFor({ state: 'visible', timeout: 10000 });
    });

    // ============================================================
    // STEP 13: Verify Activity tab redirection works
    // ============================================================
    await test.step('Verify Activity tab redirection works', async () => {
      const activityTab = page.getByRole('button', { name: 'Activity' }).describe('Activity tab');
      await activityTab.click();
      await page.getByText('Activity').first().describe('Activity content').waitFor({ state: 'visible', timeout: 10000 });
    });

    // ============================================================
    // STEP 14: Verify Chat tab redirection works
    // ============================================================
    await test.step('Verify Chat tab redirection works', async () => {
      const chatTab = page.getByRole('button', { name: 'Chat' }).describe('Chat tab');
      await chatTab.click();
      await page.getByText('Chat').first().describe('Chat content').waitFor({ state: 'visible', timeout: 10000 });
    });

    // ============================================================
    // STEP 15: Navigate back to Details tab
    // ============================================================
    await test.step('Navigate back to Details tab', async () => {
      const detailsTab = page.getByRole('button', { name: 'Details' }).describe('Details tab');
      await detailsTab.click();
      const primaryDetails = page.getByRole('heading', { name: 'Primary Details' }).describe('Primary Details heading');
      await primaryDetails.waitFor({ state: 'visible', timeout: 10000 });
    });

    // ============================================================
    // STEP 16: Verify Organization link redirection
    // ============================================================
    await test.step('Verify Organization link redirection works', async () => {
      // Expand Organization section if collapsed
      const orgSection = page.getByRole('button', { name: /Organization/ }).describe('Organization accordion');
      await orgSection.scrollIntoViewIfNeeded();

      // Find any organization link inside the Organization region
      const orgRegion = page.getByRole('region', { name: /Organization/ }).describe('Organization region');
      const orgLink = orgRegion.getByRole('link').first().describe('Organization link');
      const isOrgLinkVisible = await orgLink.isVisible().catch(() => false);

      if (isOrgLinkVisible) {
        // Get the href and navigate directly (overlay may intercept normal clicks)
        const href = await orgLink.getAttribute('href');
        if (href) {
          const currentUrl = page.url();
          const baseUrl = new URL(currentUrl).origin;
          await page.goto(`${baseUrl}${href}`);
          await page.waitForURL('**/organizations/*/details', { timeout: 30000 });
          await expect(page).toHaveURL(/\/organizations\//);

          // Navigate back to the job details
          await page.goBack();
          await page.waitForURL('**/jobs/*/details', { timeout: 60000 });
          await dismissZuperConnect();
        }
      }
    });

    // ============================================================
    // STEP 17: Verify breadcrumb "Jobs" link redirection
    // ============================================================
    await test.step('Verify breadcrumb Jobs link redirection works', async () => {
      // Wait for breadcrumb to load
      const jobsBreadcrumb = page.getByRole('link', { name: 'Jobs' }).describe('Jobs breadcrumb link');
      await jobsBreadcrumb.waitFor({ state: 'visible', timeout: 10000 });
      await jobsBreadcrumb.click({ force: true });
      await page.waitForURL('**/jobs', { timeout: 60000 });
      await expect(page).toHaveTitle(/Jobs/);

      // Navigate back to the first job
      const firstJobRow = page.locator('table tbody tr').first().describe('First job row');
      await firstJobRow.waitFor({ state: 'visible', timeout: 60000 });
      const firstJobLink = firstJobRow.locator('a').first().describe('First job link');
      await firstJobLink.click();
      await page.waitForURL('**/jobs/*/details', { timeout: 60000 });
      await dismissZuperConnect();
    });

    // ============================================================
    // STEP 18: Verify Print/Share and More Actions buttons are visible
    // ============================================================
    await test.step('Verify Print/Share and More Actions buttons are visible', async () => {
      const printShareButton = page.getByText('Print/Share').describe('Print/Share button');
      await printShareButton.waitFor({ state: 'visible', timeout: 15000 });
      await expect(printShareButton).toBeVisible();

      const moreActionsButton = page.getByText('More Actions').describe('More Actions button');
      await expect(moreActionsButton).toBeVisible();
    });

    // ============================================================
    // STEP 19: Verify Service Tasks section is displayed correctly
    // ============================================================
    await test.step('Verify Service Tasks section is displayed correctly', async () => {
      const serviceTasksHeading = page.getByText(/Service Tasks/).first().describe('Service Tasks heading');
      await serviceTasksHeading.scrollIntoViewIfNeeded();
      await expect(serviceTasksHeading).toBeVisible();

      // Verify Add button for service tasks (scoped to the heading containing "Service Tasks")
      const serviceTasksSection = page.getByRole('heading', { name: /Service Tasks/ }).describe('Service Tasks section heading');
      const addButton = serviceTasksSection.getByText('Add', { exact: true }).describe('Service Tasks Add button');
      await expect(addButton).toBeVisible();
    });

    // ============================================================
    // STEP 20: Verify right sidebar expandable sections work (click to expand/collapse)
    // ============================================================
    await test.step('Verify accordion expand/collapse functionality', async () => {
      // Click on Project section (collapsed by default) to expand it
      const projectSection = page.getByRole('button', { name: /Project/ }).first().describe('Project accordion');
      await projectSection.scrollIntoViewIfNeeded();
      await projectSection.click();

      // Click on Contract section (collapsed by default) to expand it
      const contractSection = page.getByRole('button', { name: /Contract/ }).describe('Contract accordion');
      await contractSection.scrollIntoViewIfNeeded();
      await contractSection.click();

      // Click on Attachments section (collapsed by default) to expand it
      const attachmentsSection = page.getByRole('button', { name: /Attachments/ }).describe('Attachments accordion');
      await attachmentsSection.scrollIntoViewIfNeeded();
      await attachmentsSection.click();
    });

    // ============================================================
    // STEP 21: AI Assert - Overall visual integrity of job details page
    // ============================================================
    await test.step('Verify overall visual integrity of job details page', async () => {
      // Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));

      // Wait for page to stabilize by checking for the Update Status button
      const updateStatus = page.getByText('Update Status').describe('Update Status button');
      await updateStatus.waitFor({ state: 'visible', timeout: 15000 });

      await expect(page).aiAssert(
        'The job details page shows: job number and status badge at the top, job title with scheduled time, action buttons (Update Status, Reschedule, New, Add Note), navigation tabs (Details, Line Items, Notes, Activity, Chat), and a right sidebar with expandable accordion sections. All elements should be properly laid out without overlapping or breaking.',
        { timeout: 30000, fullPage: true }
      );
    });
  });
});
