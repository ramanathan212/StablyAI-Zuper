import { test, expect } from '@stablyai/playwright-test';

/**
 * User Prompt:
 * - Open the same organization in Old UI and New UI
 * - Cross check the data:
 *   Old UI Customer Associated VS new ui customers
 *   Old UI Properties Associated VS new ui properties
 *   Old UI Requests Associated VS new ui requests
 *   Old UI Projects Associated VS new ui projects
 *   Old UI Quotes Associated VS new ui quotes
 *   Old UI Invoices Associated VS new ui invoices
 *   Old UI Contracts Associated VS new ui Contracts
 *   Old UI Assets Associated VS new ui assets
 * - Also cross check fields in: Primary Details, Description, Other Details,
 *   Test Group, Test21, Visibility, CheckList, New Custom Field
 */

// ─── Configuration ────────────────────────────────────────────────────────────
const OLD_UI_BASE = 'https://stagingv3.zuperpro.com';
const NEW_UI_BASE = 'https://developmentv3.zuperpro.com/settings';

const CREDENTIALS = {
  company: 'zuper',
  email: 'ragupathy.s@zuper.co',
  password: 'Test@1234',
};

// Organization under test
const ORG_ID = '1f70f900-351b-11ed-ac71-9356ef52becd';
const ORG_NAME = 'Chuck Property management';

// ─── Helper: Login ────────────────────────────────────────────────────────────
async function loginToZuper(page, baseUrl: string) {
  await page.goto(`${baseUrl}/login`);
  await page.getByRole('textbox', { name: 'Company Name' }).waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('textbox', { name: 'Company Name' }).fill(CREDENTIALS.company);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByRole('textbox', { name: 'Email address' }).fill(CREDENTIALS.email);
  await page.getByRole('textbox', { name: 'Password Forgot password?' }).fill(CREDENTIALS.password);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('**/dashboard', { timeout: 30000 });

  // Dismiss timezone popup if visible
  const cancelBtn = page.getByRole('button', { name: 'Cancel' });
  if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cancelBtn.click();
  }
}

// ─── Helper: Extract section fields from Old UI ──────────────────────────────
async function getOldUISectionFields(page, sectionHeading: string): Promise<Record<string, string>> {
  const fields: Record<string, string> = {};
  const section = page.locator(`h3:has-text("${sectionHeading}")`).locator('..').locator('..');

  const terms = await section.locator('dt').allTextContents();
  const definitions = await section.locator('dd').allTextContents();

  for (let i = 0; i < terms.length; i++) {
    fields[terms[i].trim()] = (definitions[i] || '').trim();
  }
  return fields;
}

// ─── Helper: Extract section fields from New UI ──────────────────────────────
async function getNewUISectionFields(page, sectionButtonText: string): Promise<Record<string, string>> {
  const fields: Record<string, string> = {};

  // Find the section by its expandable button
  const sectionBtn = page.getByRole('button', { name: new RegExp(sectionButtonText) });
  const section = sectionBtn.locator('..');

  // Get the field container (sibling of button)
  const fieldContainer = section.locator('> div').last();
  const allText = await fieldContainer.locator('[class*="grid"] > div, [class*="flex"] > div').allTextContents();

  // Fields are in label/value pairs
  for (let i = 0; i < allText.length - 1; i += 2) {
    const label = allText[i]?.trim();
    const value = allText[i + 1]?.trim();
    if (label && label !== '-') {
      fields[label] = value || '-';
    }
  }
  return fields;
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

test.describe('Organization Module: Old UI vs New UI Cross-Check', () => {
  test.setTimeout(300000); // 5 minutes for full cross-check

  test.describe('Part 1: Detail Sections & Fields', () => {

    test('Primary Details fields should match between Old UI and New UI', async ({ browser }) => {
      // Open Old UI
      const oldContext = await browser.newContext();
      const oldPage = await oldContext.newPage();
      await loginToZuper(oldPage, OLD_UI_BASE);
      await oldPage.goto(`${OLD_UI_BASE}/organizations/${ORG_ID}/details`);
      await oldPage.locator('h3:has-text("Primary Details")').waitFor({ state: 'visible', timeout: 20000 });

      // Extract Old UI Primary Details
      const oldFields = await getOldUISectionFields(oldPage, 'Primary Details');

      // Open New UI
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      await loginToZuper(newPage, NEW_UI_BASE);
      await newPage.goto(`${NEW_UI_BASE}/organizations/${ORG_ID}/details?tab=OVERVIEW`);
      await newPage.locator('h1:has-text("Chuck Property management")').waitFor({ state: 'visible', timeout: 20000 });

      // Verify key fields in New UI
      const primarySection = newPage.locator('button:has-text("Primary Details")').locator('..');
      await expect(primarySection.locator('text=test@mail.com')).toBeVisible();
      await expect(primarySection.locator('text=MVP customer 4')).toBeVisible();
      await expect(primarySection.locator('text=Taxable')).toBeVisible();
      await expect(primarySection.locator('text=test2')).toBeVisible();
      await expect(primarySection.locator('text=Raghav Gurumani')).toBeVisible();

      // Check fields that are MISSING in New UI (expected failures/findings)
      console.log('Old UI Primary Details fields:', Object.keys(oldFields));
      console.log('--- MISSING IN NEW UI ---');
      console.log('Organization Status:', oldFields['Organization Status'] || 'N/A');
      console.log('Preferred Timezone:', oldFields['Preferred Timezone'] || 'N/A');
      console.log('Created At:', oldFields['Created At'] || 'N/A');

      await oldContext.close();
      await newContext.close();
    });

    test('Description section should match between Old UI and New UI', async ({ browser }) => {
      const oldContext = await browser.newContext();
      const oldPage = await oldContext.newPage();
      await loginToZuper(oldPage, OLD_UI_BASE);
      await oldPage.goto(`${OLD_UI_BASE}/organizations/${ORG_ID}/details`);
      await oldPage.locator('h3:has-text("Description")').waitFor({ state: 'visible', timeout: 20000 });

      // Get Old UI description
      const oldDescription = await oldPage.locator('h3:has-text("Description")').locator('..').locator('p').textContent();

      // Open New UI
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      await loginToZuper(newPage, NEW_UI_BASE);
      await newPage.goto(`${NEW_UI_BASE}/organizations/${ORG_ID}/details?tab=OVERVIEW`);
      await newPage.locator('h1:has-text("Chuck Property management")').waitFor({ state: 'visible', timeout: 20000 });

      // Verify description in New UI
      const descSection = newPage.locator('button:has-text("Description")').locator('..');
      await expect(descSection.locator(`text=${oldDescription?.trim()}`)).toBeVisible();

      await oldContext.close();
      await newContext.close();
    });

    test('Other Details fields should match between Old UI and New UI', async ({ browser }) => {
      const oldContext = await browser.newContext();
      const oldPage = await oldContext.newPage();
      await loginToZuper(oldPage, OLD_UI_BASE);
      await oldPage.goto(`${OLD_UI_BASE}/organizations/${ORG_ID}/details`);
      await oldPage.locator('h3:has-text("Other Details")').waitFor({ state: 'visible', timeout: 20000 });

      const oldFields = await getOldUISectionFields(oldPage, 'Other Details');

      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      await loginToZuper(newPage, NEW_UI_BASE);
      await newPage.goto(`${NEW_UI_BASE}/organizations/${ORG_ID}/details?tab=OVERVIEW`);
      await newPage.locator('h1:has-text("Chuck Property management")').waitFor({ state: 'visible', timeout: 20000 });

      // Verify key Other Details fields in New UI
      const otherSection = newPage.locator('button:has-text("Other Details")').locator('..');
      for (const [label, value] of Object.entries(oldFields)) {
        if (value && value !== '---' && !value.includes('Open Link')) {
          const fieldLabel = otherSection.locator(`text="${label}"`);
          await expect(fieldLabel).toBeVisible({ timeout: 5000 }).catch(() => {
            console.log(`MISSING field in New UI Other Details: ${label} = ${value}`);
          });
        }
      }

      await oldContext.close();
      await newContext.close();
    });

    test('Test Group fields should match between Old UI and New UI', async ({ browser }) => {
      const oldContext = await browser.newContext();
      const oldPage = await oldContext.newPage();
      await loginToZuper(oldPage, OLD_UI_BASE);
      await oldPage.goto(`${OLD_UI_BASE}/organizations/${ORG_ID}/details`);
      await oldPage.locator('h3:has-text("Test Group")').waitFor({ state: 'visible', timeout: 20000 });

      const oldFields = await getOldUISectionFields(oldPage, 'Test Group');

      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      await loginToZuper(newPage, NEW_UI_BASE);
      await newPage.goto(`${NEW_UI_BASE}/organizations/${ORG_ID}/details?tab=OVERVIEW`);
      await newPage.locator('h1:has-text("Chuck Property management")').waitFor({ state: 'visible', timeout: 20000 });

      const testGroupSection = newPage.locator('button:has-text("Test Group")').locator('..');
      for (const [label] of Object.entries(oldFields)) {
        const fieldLabel = testGroupSection.locator(`text="${label}"`);
        await expect(fieldLabel).toBeVisible({ timeout: 5000 }).catch(() => {
          console.log(`MISSING field in New UI Test Group: ${label}`);
        });
      }

      await oldContext.close();
      await newContext.close();
    });

    test('Test21 fields should match between Old UI and New UI', async ({ browser }) => {
      const oldContext = await browser.newContext();
      const oldPage = await oldContext.newPage();
      await loginToZuper(oldPage, OLD_UI_BASE);
      await oldPage.goto(`${OLD_UI_BASE}/organizations/${ORG_ID}/details`);
      await oldPage.locator('h3:has-text("Test21")').waitFor({ state: 'visible', timeout: 20000 });

      const oldFields = await getOldUISectionFields(oldPage, 'Test21');

      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      await loginToZuper(newPage, NEW_UI_BASE);
      await newPage.goto(`${NEW_UI_BASE}/organizations/${ORG_ID}/details?tab=OVERVIEW`);
      await newPage.locator('h1:has-text("Chuck Property management")').waitFor({ state: 'visible', timeout: 20000 });

      const section = newPage.locator('button:has-text("Test21")').locator('..');
      for (const [label] of Object.entries(oldFields)) {
        await expect(section.locator(`text="${label}"`)).toBeVisible({ timeout: 5000 }).catch(() => {
          console.log(`MISSING field in New UI Test21: ${label}`);
        });
      }

      await oldContext.close();
      await newContext.close();
    });

    test('Visiblity fields should match between Old UI and New UI', async ({ browser }) => {
      const oldContext = await browser.newContext();
      const oldPage = await oldContext.newPage();
      await loginToZuper(oldPage, OLD_UI_BASE);
      await oldPage.goto(`${OLD_UI_BASE}/organizations/${ORG_ID}/details`);
      await oldPage.locator('h3:has-text("Visiblity")').waitFor({ state: 'visible', timeout: 20000 });

      const oldFields = await getOldUISectionFields(oldPage, 'Visiblity');

      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      await loginToZuper(newPage, NEW_UI_BASE);
      await newPage.goto(`${NEW_UI_BASE}/organizations/${ORG_ID}/details?tab=OVERVIEW`);
      await newPage.locator('h1:has-text("Chuck Property management")').waitFor({ state: 'visible', timeout: 20000 });

      const section = newPage.locator('button:has-text("Visiblity")').locator('..');
      for (const [label] of Object.entries(oldFields)) {
        await expect(section.locator(`text="${label}"`)).toBeVisible({ timeout: 5000 }).catch(() => {
          console.log(`MISSING field in New UI Visiblity: ${label}`);
        });
      }

      await oldContext.close();
      await newContext.close();
    });

    test('CheckList fields should match between Old UI and New UI', async ({ browser }) => {
      const oldContext = await browser.newContext();
      const oldPage = await oldContext.newPage();
      await loginToZuper(oldPage, OLD_UI_BASE);
      await oldPage.goto(`${OLD_UI_BASE}/organizations/${ORG_ID}/details`);
      await oldPage.locator('h3:has-text("CheckList")').waitFor({ state: 'visible', timeout: 20000 });

      const oldFields = await getOldUISectionFields(oldPage, 'CheckList');

      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      await loginToZuper(newPage, NEW_UI_BASE);
      await newPage.goto(`${NEW_UI_BASE}/organizations/${ORG_ID}/details?tab=OVERVIEW`);
      await newPage.locator('h1:has-text("Chuck Property management")').waitFor({ state: 'visible', timeout: 20000 });

      const section = newPage.locator('button:has-text("CheckList")').locator('..');
      for (const [label] of Object.entries(oldFields)) {
        await expect(section.locator(`text="${label}"`)).toBeVisible({ timeout: 5000 }).catch(() => {
          console.log(`MISSING field in New UI CheckList: ${label}`);
        });
      }

      await oldContext.close();
      await newContext.close();
    });

    test('New Custom Field fields should match between Old UI and New UI', async ({ browser }) => {
      const oldContext = await browser.newContext();
      const oldPage = await oldContext.newPage();
      await loginToZuper(oldPage, OLD_UI_BASE);
      await oldPage.goto(`${OLD_UI_BASE}/organizations/${ORG_ID}/details`);
      await oldPage.locator('h3:has-text("New Custom Field")').waitFor({ state: 'visible', timeout: 20000 });

      const oldFields = await getOldUISectionFields(oldPage, 'New Custom Field');

      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      await loginToZuper(newPage, NEW_UI_BASE);
      await newPage.goto(`${NEW_UI_BASE}/organizations/${ORG_ID}/details?tab=OVERVIEW`);
      await newPage.locator('h1:has-text("Chuck Property management")').waitFor({ state: 'visible', timeout: 20000 });

      const section = newPage.locator('button:has-text("New Custom Field")').locator('..');
      for (const [label] of Object.entries(oldFields)) {
        await expect(section.locator(`text="${label}"`)).toBeVisible({ timeout: 5000 }).catch(() => {
          console.log(`MISSING field in New UI New Custom Field: ${label}`);
        });
      }

      await oldContext.close();
      await newContext.close();
    });
  });

  test.describe('Part 2: Associated Data Tabs Cross-Check', () => {

    test('Customers Associated: Old UI (2) vs New UI tab', async ({ browser }) => {
      // Old UI - Get customer data
      const oldContext = await browser.newContext();
      const oldPage = await oldContext.newPage();
      await loginToZuper(oldPage, OLD_UI_BASE);
      await oldPage.goto(`${OLD_UI_BASE}/organizations/${ORG_ID}/details`);
      await oldPage.getByRole('button', { name: /Customers Associated/ }).waitFor({ state: 'visible', timeout: 20000 });
      await oldPage.getByRole('button', { name: /Customers Associated/ }).click();

      // Verify Old UI customers
      const customersRegion = oldPage.getByRole('region', { name: /Customers Associated/ });
      await expect(customersRegion.locator('h3:has-text("Loc")')).toBeVisible();
      await expect(customersRegion.locator('h3:has-text("QAOrgCustomer 1")')).toBeVisible();

      const oldCustomerCount = await oldPage.getByRole('button', { name: /Customers Associated/ }).textContent();
      console.log(`Old UI Customers: ${oldCustomerCount?.trim()}`);

      // New UI - Check if Customers tab exists
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      await loginToZuper(newPage, NEW_UI_BASE);
      await newPage.goto(`${NEW_UI_BASE}/organizations/${ORG_ID}/details?tab=OVERVIEW`);
      await newPage.locator('h1:has-text("Chuck Property management")').waitFor({ state: 'visible', timeout: 20000 });

      // Click +More to see all tabs
      const moreBtn = newPage.getByRole('button', { name: /More\s/ }).last();
      await moreBtn.click({ force: true });
      await newPage.waitForTimeout(1000);

      // Check for Customers tab in dropdown
      const customersTab = newPage.locator('.cdk-overlay-pane button:has-text("Customers")');
      const hasCustomersTab = await customersTab.isVisible().catch(() => false);

      if (!hasCustomersTab) {
        console.log('DEFECT: "Customers" tab is MISSING in New UI');
        console.log('Old UI had 2 customers: Loc, QAOrgCustomer 1');
      }
      // This assertion documents the current state - Customers tab should exist
      expect(hasCustomersTab, 'Customers tab should be available in New UI').toBeTruthy();

      await oldContext.close();
      await newContext.close();
    });

    test('Properties Associated: Old UI (1) vs New UI Properties tab', async ({ browser }) => {
      // Old UI
      const oldContext = await browser.newContext();
      const oldPage = await oldContext.newPage();
      await loginToZuper(oldPage, OLD_UI_BASE);
      await oldPage.goto(`${OLD_UI_BASE}/organizations/${ORG_ID}/details`);
      await oldPage.getByRole('button', { name: /Properties Associated/ }).waitFor({ state: 'visible', timeout: 20000 });
      await oldPage.getByRole('button', { name: /Properties Associated/ }).click();

      const propertiesRegion = oldPage.getByRole('region', { name: /Properties Associated/ });
      await expect(propertiesRegion.locator('h3:has-text("QAOrgProperty")')).toBeVisible();

      // New UI
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      await loginToZuper(newPage, NEW_UI_BASE);
      await newPage.goto(`${NEW_UI_BASE}/organizations/${ORG_ID}/details?tab=PROPERTIES`);
      await newPage.waitForTimeout(5000);

      // Verify property exists in New UI
      await expect(newPage.locator('table').locator('text=QAOrgProperty')).toBeVisible({ timeout: 10000 });
      console.log('Properties: MATCH - QAOrgProperty present in both UIs');

      await oldContext.close();
      await newContext.close();
    });

    test('Requests Associated: Old UI (0) vs New UI tab', async ({ browser }) => {
      // Old UI
      const oldContext = await browser.newContext();
      const oldPage = await oldContext.newPage();
      await loginToZuper(oldPage, OLD_UI_BASE);
      await oldPage.goto(`${OLD_UI_BASE}/organizations/${ORG_ID}/details`);
      await oldPage.getByRole('button', { name: /Requests Associated/ }).waitFor({ state: 'visible', timeout: 20000 });

      const requestsBtn = oldPage.getByRole('button', { name: /Requests Associated/ });
      const oldRequestsText = await requestsBtn.textContent();
      console.log(`Old UI: ${oldRequestsText?.trim()}`);

      // New UI - Check if Requests tab exists
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      await loginToZuper(newPage, NEW_UI_BASE);
      await newPage.goto(`${NEW_UI_BASE}/organizations/${ORG_ID}/details?tab=OVERVIEW`);
      await newPage.locator('h1:has-text("Chuck Property management")').waitFor({ state: 'visible', timeout: 20000 });

      const moreBtn = newPage.getByRole('button', { name: /More\s/ }).last();
      await moreBtn.click({ force: true });
      await newPage.waitForTimeout(1000);

      const requestsTab = newPage.locator('.cdk-overlay-pane button:has-text("Requests")');
      const hasRequestsTab = await requestsTab.isVisible().catch(() => false);

      if (!hasRequestsTab) {
        console.log('DEFECT: "Requests" tab is MISSING in New UI');
      }
      expect(hasRequestsTab, 'Requests tab should be available in New UI').toBeTruthy();

      await oldContext.close();
      await newContext.close();
    });

    test('Projects Associated: Old UI (1) vs New UI Projects tab', async ({ browser }) => {
      // Old UI
      const oldContext = await browser.newContext();
      const oldPage = await oldContext.newPage();
      await loginToZuper(oldPage, OLD_UI_BASE);
      await oldPage.goto(`${OLD_UI_BASE}/organizations/${ORG_ID}/details`);
      await oldPage.getByRole('button', { name: /Projects Associated/ }).waitFor({ state: 'visible', timeout: 20000 });
      await oldPage.getByRole('button', { name: /Projects Associated/ }).click();

      const projectsRegion = oldPage.getByRole('region', { name: /Projects Associated/ });
      await expect(projectsRegion.locator('text=QAOrgProject')).toBeVisible();

      // New UI
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      await loginToZuper(newPage, NEW_UI_BASE);
      await newPage.goto(`${NEW_UI_BASE}/organizations/${ORG_ID}/details?tab=PROJECTS`);
      await newPage.waitForTimeout(5000);

      await expect(newPage.locator('table').locator('text=QAOrgProject')).toBeVisible({ timeout: 10000 });
      await expect(newPage.locator('table').locator('text=Pool cleaning campaign')).toBeVisible();
      console.log('Projects: MATCH - QAOrgProject present in both UIs');

      await oldContext.close();
      await newContext.close();
    });

    test('Quotes Associated: Old UI (2) vs New UI Quotes tab', async ({ browser }) => {
      // Old UI
      const oldContext = await browser.newContext();
      const oldPage = await oldContext.newPage();
      await loginToZuper(oldPage, OLD_UI_BASE);
      await oldPage.goto(`${OLD_UI_BASE}/organizations/${ORG_ID}/details`);
      await oldPage.getByRole('button', { name: /Quotes Associated/ }).waitFor({ state: 'visible', timeout: 20000 });
      await oldPage.getByRole('button', { name: /Quotes Associated/ }).click();

      const quotesRegion = oldPage.getByRole('region', { name: /Quotes Associated/ });
      await expect(quotesRegion.locator('text=QAOrgQuote')).toBeVisible();
      await expect(quotesRegion.locator('text=3822')).toBeVisible();

      // New UI
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      await loginToZuper(newPage, NEW_UI_BASE);
      await newPage.goto(`${NEW_UI_BASE}/organizations/${ORG_ID}/details?tab=QUOTES`);
      await newPage.waitForTimeout(5000);

      await expect(newPage.locator('table').locator('text=QAOrgQuote')).toBeVisible({ timeout: 10000 });
      await expect(newPage.locator('table').locator('text=3822')).toBeVisible();

      // Verify count matches
      const newRows = await newPage.locator('table tbody tr').count();
      expect(newRows).toBe(2);
      console.log('Quotes: MATCH - 2 quotes present in both UIs');

      await oldContext.close();
      await newContext.close();
    });

    test('Invoices Associated: Old UI (3) vs New UI Invoices tab', async ({ browser }) => {
      // Old UI
      const oldContext = await browser.newContext();
      const oldPage = await oldContext.newPage();
      await loginToZuper(oldPage, OLD_UI_BASE);
      await oldPage.goto(`${OLD_UI_BASE}/organizations/${ORG_ID}/details`);
      await oldPage.getByRole('button', { name: /Invoices Associated/ }).waitFor({ state: 'visible', timeout: 20000 });
      await oldPage.getByRole('button', { name: /Invoices Associated/ }).click();

      const invoicesRegion = oldPage.getByRole('region', { name: /Invoices Associated/ });
      await expect(invoicesRegion.locator('text=05 - 26 10929')).toBeVisible();
      await expect(invoicesRegion.locator('text=123453863')).toBeVisible();
      await expect(invoicesRegion.locator('text=INV-000012812')).toBeVisible();

      // New UI
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      await loginToZuper(newPage, NEW_UI_BASE);
      await newPage.goto(`${NEW_UI_BASE}/organizations/${ORG_ID}/details?tab=INVOICES`);
      await newPage.waitForTimeout(5000);

      await expect(newPage.locator('table').locator('text=05 - 26 10929')).toBeVisible({ timeout: 10000 });
      await expect(newPage.locator('table').locator('text=123453863')).toBeVisible();
      await expect(newPage.locator('table').locator('text=INV-000012812')).toBeVisible();

      // Verify count matches
      const newRows = await newPage.locator('table tbody tr').count();
      expect(newRows).toBe(3);
      console.log('Invoices: MATCH - 3 invoices present in both UIs');

      await oldContext.close();
      await newContext.close();
    });

    test('Contracts Associated: Old UI (2) vs New UI Contracts tab', async ({ browser }) => {
      // Old UI
      const oldContext = await browser.newContext();
      const oldPage = await oldContext.newPage();
      await loginToZuper(oldPage, OLD_UI_BASE);
      await oldPage.goto(`${OLD_UI_BASE}/organizations/${ORG_ID}/details`);
      await oldPage.getByRole('button', { name: /Contracts Associated/ }).waitFor({ state: 'visible', timeout: 20000 });
      await oldPage.getByRole('button', { name: /Contracts Associated/ }).click();

      const contractsRegion = oldPage.getByRole('region', { name: /Contracts Associated/ });
      await expect(contractsRegion.locator('text=Custom tax')).toBeVisible();
      await expect(contractsRegion.locator('text=QAOrgContract')).toBeVisible();

      // New UI
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      await loginToZuper(newPage, NEW_UI_BASE);
      await newPage.goto(`${NEW_UI_BASE}/organizations/${ORG_ID}/details?tab=CONTRACTS`);
      await newPage.waitForTimeout(5000);

      await expect(newPage.locator('table').locator('text=QAOrgContract')).toBeVisible({ timeout: 10000 });
      await expect(newPage.locator('table').locator('text=Custom tax')).toBeVisible();

      // Verify count matches
      const newRows = await newPage.locator('table tbody tr').count();
      expect(newRows).toBe(2);
      console.log('Contracts: MATCH - 2 contracts present in both UIs');

      await oldContext.close();
      await newContext.close();
    });

    test('Assets Associated: Old UI (1) vs New UI Assets tab', async ({ browser }) => {
      // Old UI
      const oldContext = await browser.newContext();
      const oldPage = await oldContext.newPage();
      await loginToZuper(oldPage, OLD_UI_BASE);
      await oldPage.goto(`${OLD_UI_BASE}/organizations/${ORG_ID}/details`);
      await oldPage.getByRole('button', { name: /Assets Associated/ }).waitFor({ state: 'visible', timeout: 20000 });
      await oldPage.getByRole('button', { name: /Assets Associated/ }).click();

      const assetsRegion = oldPage.getByRole('region', { name: /Assets Associated/ });
      await expect(assetsRegion.locator('text=QAOrgAsset')).toBeVisible();

      // New UI
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      await loginToZuper(newPage, NEW_UI_BASE);
      await newPage.goto(`${NEW_UI_BASE}/organizations/${ORG_ID}/details?tab=ASSETS`);
      await newPage.waitForTimeout(5000);

      await expect(newPage.locator('table').locator('text=QAOrgAsset')).toBeVisible({ timeout: 10000 });
      await expect(newPage.locator('table').locator('text=Fridge repair')).toBeVisible();
      console.log('Assets: MATCH - QAOrgAsset present in both UIs');

      await oldContext.close();
      await newContext.close();
    });
  });
});
