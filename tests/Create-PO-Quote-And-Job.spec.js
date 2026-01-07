import { test, expect } from './fixtures/cache-fixtures.js';

test('test', async ({ page, autoClearCache }) => {
  // Step 21: Navigate to Quotes and create new quote
    await executeStep('Navigate to Quotes and create new quote', async () => {
      quotePage = new QuotePage(page);
      await quotePage.navigateToQuotes();
      await quotePage.clickNewQuote();
    });

    // Step 22: Fill quote details
    await executeStep('Fill quote details', async () => {
      await quotePage.selectOrganization(testData.quote.organization);
      await quotePage.fillQuoteDetails(testData.quote.title);
    });

    // Step 23: Add line items to quote
    await executeStep('Add line items to quote', async () => {
      await quotePage.addLineItems(['#T1 - 001 - Monitor Available', 'Product Image #T2 - 002 -', 'Product Image #T4 - 004 -']);
    });

    // Step 24: Save quote as draft
    await executeStep('Save quote as draft', async () => {
      await quotePage.saveAsDraft();
      await quotePage.verifyQuoteCreated();
    });

    // Step 25: Create Material Request from New menu
    await executeStep('Create material request from New menu', async () => {
      const newButton = page.locator('breadcrumb a').filter({ hasText: 'New' });
      await newButton.click();
      await page.getByRole('menuitem', { name: 'Material Request' }).click();
      await page.waitForLoadState('networkidle');

      // Select all items
      await page.getByRole('row', { name: 'Item Type Required Quantity*' }).getByRole('checkbox').check();
      await page.getByRole('button', { name: 'Add' }).click();

      // Save and submit using MaterialRequestPage method
      const mrPageForQuote = new MaterialRequestPage(page);
      await mrPageForQuote.saveAndSubmit();

      // Verify associated quote section
      await expect(page.locator('#mat-expansion-panel-header-51')).toMatchAriaSnapshot(`- text: Associated Quote`);
    });
});