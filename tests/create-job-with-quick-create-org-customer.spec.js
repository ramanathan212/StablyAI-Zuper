import { test, expect } from './fixtures/cache-fixtures.js';
import { waitForPageReady } from './Helper/overlay-helper.js';

/**
 * User Prompt:
 * - Login to https://uat.zuperpro.com and click on Job modules and try to create new job
 *   along with new Organization and customer doing quick create inside the job.
 *   Please fill all the mandatory fields and create this as a new test case.
 */
test.describe('Job Creation with Quick Create Organization and Customer', () => {
  // Generate unique test data for isolation
  const timestamp = Date.now();
  const quickCreateOrgData = {
    name: `Quick Create Org ${timestamp}`,
    email: `quickcreateorg${timestamp}@test.com`
  };
  const quickCreateCustomerData = {
    firstName: `QCCustomer${timestamp}`,
    email: `qccustomer${timestamp}@test.com`
  };
  const jobData = {
    title: `Job with Quick Create ${timestamp}`,
    category: 'Installation Services',
    customFieldValue: `Test Input ${timestamp}`
  };

  test('Create new job with quick create organization and customer', async ({ page, autoClearCache }) => {
    // Step 1: Login to the application
    await test.step('Login to the application', async () => {
      await page.goto('/');
      
      // Enter company name
      const companyNameInput = page.getByRole('textbox', { name: 'Company Name' });
      await companyNameInput.waitFor({ state: 'visible', timeout: 30000 });
      await companyNameInput.fill('zuper-pro');

      // Click Continue
      const continueButton = page.getByRole('button', { name: 'Continue' });
      await continueButton.click();

      // Enter email
      const emailInput = page.getByRole('textbox', { name: 'Email address' });
      await emailInput.waitFor({ state: 'visible', timeout: 10000 });
      await emailInput.fill('vignesh.s@zuper.co');

      // Enter password
      const passwordInput = page.getByRole('textbox', { name: 'Password Forgot password?' });
      await passwordInput.fill('Vicky@123');

      // Click Login
      const loginButton = page.getByRole('button', { name: 'Login', exact: true });
      await loginButton.click();

      // Wait for dashboard to load
      await page.waitForURL('**/dashboard**', { timeout: 60000 });
    });

    // Step 2: Handle any dialogs that appear after login
    await test.step('Handle post-login dialogs', async () => {
      // Dismiss timezone change dialog if present
      const cancelButton = page.getByRole('button', { name: 'Cancel' });
      if (await cancelButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cancelButton.click();
      }

      // Dismiss notification permission dialog if present
      const noThanksButton = page.getByRole('button', { name: 'No, thanks' });
      if (await noThanksButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await noThanksButton.click();
      }

      // Wait for page to stabilize
      await waitForPageReady(page);
    });

    // Step 3: Navigate to Jobs module
    await test.step('Navigate to Jobs module', async () => {
      const jobsGroupMenu = page.locator('#job_group mat-icon');
      await jobsGroupMenu.waitFor({ state: 'visible', timeout: 30000 });
      await jobsGroupMenu.click();

      const jobsLink = page.getByRole('link', { name: 'Jobs', exact: true });
      await jobsLink.waitFor({ state: 'visible', timeout: 10000 });
      await jobsLink.click();

      await page.waitForURL('**/jobs**');
    });

    // Step 4: Open New Job form
    await test.step('Open New Job form', async () => {
      const newJobLink = page.getByRole('link', { name: ' New Job' });
      await newJobLink.waitFor({ state: 'visible', timeout: 10000 });
      await newJobLink.click();

      await page.waitForURL('**/jobs/new**');
    });

    // Step 5: Fill Job basic details
    await test.step('Fill Job basic details', async () => {
      // Enter job title
      const jobTitleInput = page.getByRole('textbox', { name: 'Job Title *' });
      await jobTitleInput.waitFor({ state: 'visible', timeout: 10000 });
      await jobTitleInput.fill(jobData.title);

      // Select Job Category - click the combobox directly to open the dropdown
      const jobCategoryDropdown = page.getByRole('combobox', { name: 'Choose a Job Category' });
      await jobCategoryDropdown.waitFor({ state: 'visible', timeout: 10000 });
      await jobCategoryDropdown.click();

      const categoryOption = page.getByRole('option', { name: jobData.category });
      await categoryOption.waitFor({ state: 'visible', timeout: 15000 });
      await categoryOption.click();
    });

    // Step 6: Quick Create Organization
    await test.step('Quick Create Organization', async () => {
      // Open Add Organization dialog
      const addOrgButton = page.locator('a').filter({ hasText: /^Add Organization$/ });
      await addOrgButton.waitFor({ state: 'visible', timeout: 10000 });
      await addOrgButton.click();

      // Click New Organization tab for Quick Create
      const newOrgTab = page.getByText('New Organization');
      await newOrgTab.waitFor({ state: 'visible', timeout: 5000 });
      await newOrgTab.click();

      // Fill organization details
      const orgNameInput = page.getByRole('textbox', { name: 'Organization Name*' });
      await orgNameInput.waitFor({ state: 'visible', timeout: 5000 });
      await orgNameInput.fill(quickCreateOrgData.name);

      const orgEmailInput = page.getByRole('textbox', { name: 'Email*' });
      await orgEmailInput.fill(quickCreateOrgData.email);

      // Fill address
      const streetAddressInput = page.getByRole('textbox', { name: 'Flat / House No, Street /' });
      await streetAddressInput.fill('123 Test Street');

      const cityInput = page.getByRole('textbox', { name: 'City' });
      await cityInput.fill('Seattle');

      // Wait for address suggestions and select one
      const addressSuggestion = page.getByRole('button', { name: '123 Test Street, Council' });
      await addressSuggestion.waitFor({ state: 'visible', timeout: 10000 });
      await addressSuggestion.click();

      // Create and choose organization
      const createOrgButton = page.getByRole('button', { name: 'Create & Choose Organization' });
      await createOrgButton.waitFor({ state: 'visible', timeout: 5000 });
      await createOrgButton.click();

      // Verify organization was created - wait for success indicator
      const orgSection = page.locator('region').filter({ hasText: quickCreateOrgData.name });
      await expect(orgSection.first()).toBeVisible({ timeout: 15000 });
    });

    // Step 7: Quick Create Contact/Customer
    await test.step('Quick Create Contact/Customer', async () => {
      // Open Add Contact dialog
      const addContactButton = page.locator('a').filter({ hasText: /^Add Contact$/ });
      await addContactButton.waitFor({ state: 'visible', timeout: 10000 });
      await addContactButton.click();

      // Click New Contact tab for Quick Create
      const newContactTab = page.getByText('New Contact');
      await newContactTab.waitFor({ state: 'visible', timeout: 5000 });
      await newContactTab.click();

      // Fill contact details
      const firstNameInput = page.getByRole('textbox', { name: 'First Name*' });
      await firstNameInput.waitFor({ state: 'visible', timeout: 5000 });
      await firstNameInput.fill(quickCreateCustomerData.firstName);

      const emailInput = page.getByRole('textbox', { name: 'Email*' });
      await emailInput.fill(quickCreateCustomerData.email);

      // Select Account Manager
      const accountManagerDropdown = page.locator('.ng-select-typeahead.ng-select-searchable.ng-select-clearable.ng-select.ng-select-single.ng-untouched.ng-pristine.ng-invalid').locator('input').first();
      await accountManagerDropdown.click();

      const accountManagerOption = page.getByRole('option', { name: 'James Smith' });
      await accountManagerOption.waitFor({ state: 'visible', timeout: 5000 });
      await accountManagerOption.click();

      // Create and choose contact
      const createContactButton = page.getByRole('button', { name: 'Create & Choose Contact' });
      await createContactButton.waitFor({ state: 'visible', timeout: 5000 });
      await createContactButton.click();

      // Verify contact was created - wait for success message or contact display
      await page.waitForSelector(`text=${quickCreateCustomerData.firstName}`, { timeout: 15000 });
    });

    // Step 8: Fill remaining mandatory fields
    await test.step('Fill mandatory custom fields and due date', async () => {
      // Fill required Text Input custom field
      const textInputField = page.getByRole('textbox', { name: 'Text Input *' });
      await textInputField.waitFor({ state: 'visible', timeout: 10000 });
      await textInputField.fill(jobData.customFieldValue);

      // Set Due Date
      const dueDateInput = page.getByRole('textbox', { name: 'Due Date' });
      await dueDateInput.click();

      // Select a date in the future (10th of current month or next available)
      const dateButton = page.getByRole('button', { name: /March 10/ });
      await dateButton.waitFor({ state: 'visible', timeout: 5000 });
      await dateButton.click();
    });

    // Step 9: Create the Job
    await test.step('Create Job and verify success', async () => {
      // Click Create Job button
      const createJobButton = page.locator('a').filter({ hasText: 'Create Job' });
      await createJobButton.click();

      // Confirm in dialog
      const confirmButton = page.getByRole('button', { name: 'Create' });
      await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
      await confirmButton.click();

      // Verify job was created successfully
      // Wait for redirect to job details page
      await page.waitForURL('**/jobs/**/details', { timeout: 30000 });

      // Verify success message
      const successMessage = page.locator('text=Job created successfully');
      await expect(successMessage).toBeVisible({ timeout: 10000 });

      // Verify job title is displayed
      const jobTitle = page.getByText(jobData.title);
      await expect(jobTitle.first()).toBeVisible();

      // Verify organization is linked
      const orgLink = page.getByRole('link', { name: quickCreateOrgData.name });
      await expect(orgLink.first()).toBeVisible();

      // Verify contact is linked
      const contactLink = page.getByRole('link', { name: quickCreateCustomerData.firstName });
      await expect(contactLink.first()).toBeVisible();

      // Verify job category
      const categoryText = page.locator('text=Installation Services');
      await expect(categoryText.first()).toBeVisible();

      // Verify job status is New
      const statusText = page.locator('text=New').first();
      await expect(statusText).toBeVisible();
    });
  });
});
