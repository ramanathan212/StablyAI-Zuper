export class QuotePage {
  constructor(page) {
    this.page = page;
    this.quotesLink = page.getByRole('link', { name: 'Quotes' });
    this.newQuoteButton = page.getByRole('menuitem', { name: ' Quote' });
    this.organizationInput = page.getByRole('textbox', { name: 'Choose Organization' });
    this.searchOrganizationsInput = page.getByRole('textbox', { name: 'Search Organizations' });
    this.chooseOrganizationButton = page.getByRole('button', { name: 'Choose Organization' });
    this.quoteDetailsButton = page.getByRole('button', { name: 'Quote Details' });
    this.quoteTitleInput = page.getByRole('textbox', { name: 'Quote Title' });
    this.addButton = page.getByRole('button', { name: ' Add' });
    this.addLineItemMenuItem = page.getByRole('menuitem', { name: 'Line Item', exact: true });
    this.addProductButton = page.getByRole('button', { name: 'Add Product' });
    this.saveAsDraftButton = page.getByRole('button', { name: 'Save as Draft' });
  }

  async navigateToQuotes() {
    await this.page.goto('/quotations');
    await this.page.waitForLoadState('networkidle');
  }

  async clickNewQuote() {
    const newButton = this.page.locator('breadcrumb a').filter({ hasText: 'New' });
    await newButton.waitFor({ state: 'visible', timeout: 10000 });
    await newButton.click();
    await this.newQuoteButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.newQuoteButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async selectOrganization(orgName) {
    await this.organizationInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.organizationInput.click();

    await this.searchOrganizationsInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.searchOrganizationsInput.click();
    await this.searchOrganizationsInput.fill(orgName);
    await this.searchOrganizationsInput.press('Enter');

    // Wait for search results
    await this.page.waitForTimeout(2000);

    // Select the organization from radio buttons
    const orgRadio = this.page.getByRole('radio', { name: orgName });
    await orgRadio.waitFor({ state: 'visible', timeout: 10000 });
    await orgRadio.check();

    await this.chooseOrganizationButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.chooseOrganizationButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async fillQuoteDetails(quoteTitle) {
    await this.quoteDetailsButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.quoteDetailsButton.click();

    await this.quoteTitleInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.quoteTitleInput.click();
    await this.quoteTitleInput.fill(quoteTitle);
  }

  async addLineItems(products) {
    await this.addButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.addButton.click();

    await this.addLineItemMenuItem.waitFor({ state: 'visible', timeout: 10000 });
    await this.addLineItemMenuItem.click();

    // Wait for product list to load
    await this.page.waitForTimeout(2000);

    for (const productName of products) {
      const checkbox = this.page.getByRole('checkbox', { name: productName });
      await checkbox.waitFor({ state: 'visible', timeout: 10000 });
      await checkbox.scrollIntoViewIfNeeded();
      await checkbox.check();
    }

    await this.addProductButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.addProductButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async saveAsDraft() {
    // Close any open modals/dialogs by clicking outside or on a specific close button
    await this.page.locator('#undefined').click();
    await this.page.waitForTimeout(1000);

    await this.saveAsDraftButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.saveAsDraftButton.scrollIntoViewIfNeeded();
    await this.saveAsDraftButton.click();
    await this.page.waitForLoadState('networkidle');
    console.log('✓ Quote saved as draft');
  }

  async verifyQuoteCreated() {
    const { expect } = await import('@playwright/test');
    await expect(this.page).toHaveURL(/\/quotations\/.*\/details/);
    console.log('✓ Quote created successfully');
  }
}
