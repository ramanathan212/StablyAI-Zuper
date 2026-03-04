import { test, expect } from '@stablyai/playwright-test';
import { LoginPage } from './pages/LoginPage.js';

test.describe('Contact Module - UI Testing', () => {
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
   * - Navigate to the Contact module and check all the UI testing like UI breaking, Icons, Click actions, Redirections, Alignment
   */
  test('Contact list page - UI elements, icons, click actions, redirections, and alignment', async ({ page }) => {
    await page.goto('/customers');
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(2000);

    // === UI LAYOUT VERIFICATION ===
    await test.step('Verify Contacts page layout and header elements', async () => {
      await expect(page).toHaveTitle(/Contacts/);
      await expect(page).toHaveURL(/\/customers/);

      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]').describe('Contacts breadcrumb');
      await expect(breadcrumb).toBeVisible();

      const newContactLink = page.locator('a[href="/customers/new"]').describe('New Contact button');
      await expect(newContactLink).toBeVisible();
    });

    // === FILTER AND SEARCH UI ===
    await test.step('Verify filter bar and search elements', async () => {
      await expect(page.getByText('All Contacts').describe('All Contacts dropdown')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Filter' }).describe('Filter button')).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Search' }).describe('Search textbox')).toBeVisible();
      await expect(page.getByRole('button', { name: /Columns/ }).describe('Columns button')).toBeVisible();
    });

    // === TABLE STRUCTURE ===
    await test.step('Verify Contacts table headers', async () => {
      await expect(page.locator('table').first().describe('Contacts table')).toBeVisible();

      const headers = ['Name', 'Email', 'No of Jobs', 'Category', 'Work No', 'Mobile No', 'Home No', 'Portal Enabled', 'Tags', 'Status', 'Created On'];
      for (const header of headers) {
        await expect(page.getByRole('columnheader', { name: new RegExp(header) }).describe(`${header} header`)).toBeVisible();
      }
      await expect(page.getByRole('checkbox', { name: 'Select all' }).describe('Select all checkbox')).toBeVisible();
    });

    // === TABLE DATA ROWS ===
    await test.step('Verify table rows and icons', async () => {
      const firstRow = page.locator('table tbody tr').first().describe('First data row');
      await expect(firstRow).toBeVisible();
      await expect(page.getByRole('checkbox', { name: 'Select row' }).first().describe('Row checkbox')).toBeVisible();

      // Contact name is a clickable link
      const contactLink = firstRow.locator('a').first().describe('Contact name link');
      await expect(contactLink).toBeVisible();
      await expect(contactLink).toHaveAttribute('href', /\/customers\/.+\/details/);

      // Phone and email icon links
      const phoneLinks = page.locator('table tbody tr a[href^="tel:"]').describe('Phone icon links');
      const phoneCount = await phoneLinks.count();
      expect(phoneCount).toBeGreaterThan(0);

      const emailLinks = page.locator('table tbody tr a[href^="mailto:"]').describe('Email icon links');
      const emailCount = await emailLinks.count();
      expect(emailCount).toBeGreaterThan(0);
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
      await searchBox.fill('test');
      await page.waitForTimeout(1500);
      await expect(searchBox).toHaveValue('test');
      await searchBox.clear();
      await page.waitForTimeout(1500);
    });

    // === REDIRECTIONS ===
    await test.step('Verify New Contact button redirects correctly', async () => {
      await page.locator('a[href="/customers/new"]').describe('New Contact button').click();
      await page.waitForTimeout(3000);
      await expect(page).toHaveURL(/\/customers\/new/);
      await page.goBack();
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
      await page.waitForTimeout(2000);
    });

    await test.step('Verify clicking a contact redirects to detail', async () => {
      const firstLink = page.locator('table tbody tr').first().locator('a').first().describe('First contact link');
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
      await expect(page.getByRole('button', { name: /Export/ }).describe('Export button')).toBeVisible();
    });

    // === VISUAL ALIGNMENT ===
    await test.step('Verify overall page alignment', async () => {
      await expect(page).aiAssert(
        'The Contacts list page has proper layout: sidebar on the left, header bar at top, breadcrumb showing "Contacts" with count, New Contact button right-aligned, filter bar, data table with properly aligned columns showing contact names with phone/email icons, and pagination at bottom. No UI elements appear broken, overlapping, or misaligned.',
        { timeout: 60000 }
      );
    });
  });

  /**
   * User Prompt:
   * - Log in this environment- https://uat.zuperpro.com/
   *   Company Name: zuper-pro, username: ragupathy.s@zuper.co, password: Test@1234
   * - After logged in Cancel the pop up in the dashboard
   * - Navigate to the Contact module, open a contact detail page and check all the UI testing like UI breaking, Icons, Click actions, Redirections, Alignment
   */
  test('Contact detail page - UI elements, tabs, sections, icons, and alignment', async ({ page }) => {
    await page.goto('/customers');
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(2000);

    // Click first contact
    const firstLink = page.locator('table tbody tr').first().locator('a').first().describe('First contact link');
    await firstLink.waitFor({ state: 'visible', timeout: 60000 });
    await firstLink.click();
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/customers\/.+\/details/);

    // === BREADCRUMB ===
    await test.step('Verify detail page breadcrumb', async () => {
      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]').describe('Breadcrumb');
      await expect(breadcrumb).toBeVisible();

      const contactsLink = page.getByRole('link', { name: 'Contacts' }).describe('Contacts breadcrumb link');
      await expect(contactsLink).toBeVisible();
      await expect(contactsLink).toHaveAttribute('href', '/customers');
    });

    // === HEADER ACTIONS ===
    await test.step('Verify header action buttons', async () => {
      await expect(page.getByText('More Actions').describe('More Actions button')).toBeVisible();
    });

    // === CONTACT HEADER ===
    await test.step('Verify contact header with avatar, name, and address', async () => {
      // Contact name
      const contactName = page.locator('p').filter({ hasText: /^[A-Z]/ }).first().describe('Contact name');
      await expect(contactName).toBeVisible();
    });

    // === QUICK ACTION BUTTONS ===
    await test.step('Verify quick action buttons', async () => {
      await expect(page.getByText('Call').first().describe('Call button')).toBeVisible();
      await expect(page.getByText('Mail').first().describe('Mail button')).toBeVisible();
      await expect(page.getByText('Add Note').first().describe('Add Note button')).toBeVisible();
    });

    // === NAVIGATION TABS ===
    await test.step('Verify navigation tabs', async () => {
      const tabs = ['Details', 'Notes', 'Jobs', 'Requests', 'Outbound Logs', 'Activity', 'Gallery'];
      for (const tab of tabs) {
        await expect(page.getByRole('button', { name: new RegExp('^' + tab + '\\b') }).describe(`${tab} tab`)).toBeVisible();
      }
    });

    // === PRIMARY DETAILS SECTION ===
    await test.step('Verify Primary Details section', async () => {
      await expect(page.getByRole('heading', { name: 'Primary Details' }).describe('Primary Details heading')).toBeVisible();

      const fields = ['Category', 'Email', 'Status', 'Created By', 'Created At'];
      for (const field of fields) {
        await expect(page.getByText(field, { exact: false }).first().describe(`${field} label`)).toBeVisible();
      }
    });

    // === PORTAL DETAILS SECTION ===
    await test.step('Verify Portal Details section', async () => {
      await expect(page.getByRole('heading', { name: 'Portal Details' }).describe('Portal Details heading')).toBeVisible();
    });

    // === TAX DETAILS SECTION ===
    await test.step('Verify Tax Details section', async () => {
      await expect(page.getByRole('heading', { name: 'Tax Details' }).describe('Tax Details heading')).toBeVisible();
    });

    // === ADDRESS SECTION ===
    await test.step('Verify Address section', async () => {
      await expect(page.getByRole('heading', { name: /Address/ }).first().describe('Address heading')).toBeVisible();
      await expect(page.getByText('Service Address').describe('Service Address label')).toBeVisible();
      await expect(page.getByText('Billing Address').describe('Billing Address label')).toBeVisible();
    });

    // === RIGHT PANEL ACCORDION SECTIONS ===
    await test.step('Verify right panel accordion sections', async () => {
      const sections = [
        { label: 'Organization', pattern: /^Organization/ },
        { label: 'Notification Preferences', pattern: /Notification Preferences/ },
        { label: 'Payment Transactions', pattern: /Payment Transactions/ },
        { label: 'Payment Cards on File', pattern: /Payment Cards on File/ },
        { label: 'Preferred Users', pattern: /Preferred Users/ },
        { label: 'Projects Associated', pattern: /Projects Associated/ },
        { label: 'Quotes Associated', pattern: /Quotes Associated/ },
        { label: 'Invoices Associated', pattern: /Invoices Associated/ },
        { label: 'Properties Associated', pattern: /Properties Associated/ },
        { label: 'Contracts Associated', pattern: /Contracts Associated/ },
        { label: 'Assets Associated', pattern: /Assets Associated/ },
        { label: 'Recurrent Job Schedule', pattern: /Recurrent Job Schedule/ },
        { label: 'Workflow Activity', pattern: /Workflow Activity/ }
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
    await test.step('Verify breadcrumb "Contacts" link redirects to list', async () => {
      await page.getByRole('link', { name: 'Contacts' }).describe('Contacts breadcrumb link').click();
      await page.waitForTimeout(3000);
      await expect(page).toHaveURL(/\/customers$/);
    });

    // === VISUAL ALIGNMENT ===
    await test.step('Verify detail page layout and alignment', async () => {
      await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 60000 });
      await page.locator('table tbody tr').first().locator('a').first().click();
      await page.waitForTimeout(3000);

      await expect(page).aiAssert(
        'The Contact detail page has proper layout: breadcrumb at top showing Contacts > contact name, header with avatar/name/address, quick action buttons (Call, Mail, New, Add Note), horizontal navigation tabs (Details, Notes, Jobs, Requests, etc.), left panel with Primary Details/Portal Details/Tax Details/Address sections with properly aligned labels and values, and right panel with accordion sections for Organization/Notification Preferences/Payment etc. No UI elements appear broken, overlapping, or misaligned.',
        { timeout: 60000 }
      );
    });
  });
});
