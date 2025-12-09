export class PartsPage {
  constructor(page) {
    this.page = page;

    // Navigation elements
    this.navigationMenu = page.locator('#products > .zuper-vertical-navigation-item-wrapper > .mat-mdc-tooltip-trigger > .mat-icon > svg');
    this.partsServicesLink = page.getByRole('link', { name: 'Parts & Services' });
    this.newPartServiceButton = page.getByRole('link', { name: ' New Part/Service' });

    // Form elements
    this.partNameInput = page.getByRole('textbox', { name: 'Part Name *' });
    this.prefixPartNumberInput = page.getByRole('textbox', { name: 'Prefix Part Number *' });
    this.productCategoryText = page.getByRole('option', { name: 'Main Product' });
    this.unitSellingPriceInput = page.getByRole('spinbutton', { name: 'Unit Selling Price *' });
    this.businessUnitDropdown = page.locator('.ng-input > input').first();
    this.businessUnitDisplay = page.locator('#businessUnit');
    this.availableQtyInput = page.getByPlaceholder('Enter Available Qty');
    this.minimumQtyInput = page.getByPlaceholder('Enter Minimum Qty');

    // Action buttons
    this.saveButton = page.locator('a').filter({ hasText: 'Save Part / Service' });
    this.createButton = page.getByRole('button', { name: 'Create' });
  }

  /**
   * Navigate to Parts & Services section
   */
  async navigateToPartsSection() {
    await this.navigationMenu.click();
    await this.partsServicesLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click on New Part/Service button
   */
  async clickNewPartService() {
    await this.newPartServiceButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill basic part information
   * @param {string} partName - Name of the part
   * @param {string} partNumber - Part number/prefix
   */
  async fillBasicPartInfo(partName, partNumber) {
    await this.partNameInput.click();
    await this.partNameInput.fill(partName);

    await this.prefixPartNumberInput.click();
    await this.prefixPartNumberInput.fill(partNumber);

    // Tab out to trigger any validation
    await this.prefixPartNumberInput.press('Tab');
    await this.page.keyboard.press('Enter');

    // Click product category to ensure form is ready
    await this.productCategoryText.click();
  }

  /**
   * Set the unit selling price
   * @param {string} price - The selling price
   */
  async setUnitSellingPrice(price) {
    await this.unitSellingPriceInput.click();
    await this.unitSellingPriceInput.fill(price);
  }

  /**
   * Select business unit from dropdown
   * @param {string} businessUnit - Name of business unit (e.g., 'Primary', 'Plumbing')
   */
  async selectBusinessUnit(businessUnit = 'Primary') {
    // Click dropdown
    await this.businessUnitDropdown.click();

    // Select by text
    if (businessUnit === 'Primary') {
      await this.page.locator('a').filter({ hasText: 'Primary' }).click();
    } else {
      await this.businessUnitDropdown.click();
      await this.businessUnitDropdown.press('ArrowDown');
      await this.businessUnitDropdown.press('Enter');
    }
  }

  /**
   * Verify business unit is selected
   * @param {string} expectedUnit - Expected business unit text
   */
  async verifyBusinessUnit(expectedUnit) {
    await this.page.waitForTimeout(500); // Brief wait for UI update
    const businessUnitText = await this.businessUnitDisplay.textContent();
    if (!businessUnitText.includes(expectedUnit)) {
      throw new Error(`Expected business unit '${expectedUnit}', but found '${businessUnitText}'`);
    }
  }

  /**
   * Set inventory quantities
   * @param {string} availableQty - Available quantity
   * @param {string} minimumQty - Minimum quantity
   */
  async setInventoryQuantities(availableQty, minimumQty) {
    await this.availableQtyInput.click();
    await this.availableQtyInput.fill(availableQty);

    await this.minimumQtyInput.click();
    await this.minimumQtyInput.fill(minimumQty);
  }

  /**
   * Save and create the part
   */
  async saveAndCreatePart() {
    await this.saveButton.click();
    await this.createButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Complete workflow to create a new part
   * @param {Object} partData - Part data object
   * @param {string} partData.name - Part name
   * @param {string} partData.partNumber - Part number
   * @param {string} partData.price - Selling price
   * @param {string} partData.businessUnit - Business unit
   * @param {string} partData.availableQty - Available quantity
   * @param {string} partData.minimumQty - Minimum quantity
   */
  async createPart(partData) {
    await this.navigateToPartsSection();
    await this.clickNewPartService();
    await this.fillBasicPartInfo(partData.name, partData.partNumber);
    await this.setUnitSellingPrice(partData.price);
    await this.selectBusinessUnit(partData.businessUnit);

    if (partData.verifyBusinessUnit) {
      await this.verifyBusinessUnit(partData.verifyBusinessUnit);
    }

    await this.setInventoryQuantities(partData.availableQty, partData.minimumQty);
    await this.saveAndCreatePart();
  }
}
