import { test, expect } from '@stablyai/playwright-test';
import { waitForPageReady, waitForOverlayToDisappear } from './Helper/overlay-helper.js';
import { testData } from './test-data.js';

/**
 * Generate a dynamic due date button label for the date picker.
 * Returns a date 1 day in the future in the format "Month Day," (e.g., "March 4,")
 */
const getDynamicDueDate = () => {
  const today = new Date();
  const futureDate = new Date(today.getTime() + (1 * 24 * 60 * 60 * 1000));
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = monthNames[futureDate.getMonth()];
  const day = futureDate.getDate();
  return `${month} ${day},`;
};

test.describe('Job Creation with Quick Create Organization and Customer', () => {
  // Override storageState to start with a clean browser (no stale auth)
  test.use({ storageState: { cookies: [], origins: [] } });

  /**
   * User Prompt:
   * - Login to https://uat.zuperpro.com and click on Job modules and try to create new job
   *   along with new Organization and customer doing quick create inside the job.
   *   Please fill all the mandatory fields and create this as a new test case.
   *
   * [Clarification: Address: Use Indian address for all address fields]
   */
  test('Create new job with quick create organization and customer', async ({ page }) => {
    // Generate unique test data with timestamps
    const timestamp = Date.now();
    const orgName = `Quick Create Test Org India ${timestamp}`;
    const orgEmail = `quickcreatetestorg${timestamp}@test.com`;
    const customerFirstName = `QC Customer India ${timestamp}`;
    const customerLastName = 'Testing';
    const customerEmail = `quickcreatecustomer${timestamp}@test.com`;
    const jobTitle = 'Deployment validation March 4 check';
    const dueDateLabel = getDynamicDueDate();

    // ===== Step 1: Login =====
    await page.goto('/login');
    const companyNameInput = page.getByRole('textbox', { name: 'Company Name' }).describe('Company name input');
    await companyNameInput.waitFor({ state: 'visible', timeout: 30000 });
    await companyNameInput.fill(testData.login.companyName);
    await page.getByRole('button', { name: 'Continue' }).describe('Continue button').click();

    const emailInput = page.getByRole('textbox', { name: 'Email address' }).describe('Email input');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(testData.login.email);
    await page.getByRole('textbox', { name: 'Password Forgot password?' }).describe('Password input').fill(testData.login.password);
    await page.getByRole('button', { name: 'Login', exact: true }).describe('Login button').click();

    // Wait for dashboard to load
    await page.waitForURL('**/dashboard**', { timeout: 60000 });

    // ===== Step 2: Dismiss post-login dialogs =====
    // Dismiss notification dialog if present ("No, thanks")
    try {
      const noThanksBtn = page.getByRole('button', { name: 'No, thanks' }).describe('Notification dismiss button');
      await noThanksBtn.waitFor({ state: 'visible', timeout: 5000 });
      await noThanksBtn.click();
    } catch {
      // No notification dialog, continue
    }

    // Dismiss timezone change dialog if present ("Cancel")
    try {
      const cancelTimezoneBtn = page.getByRole('button', { name: 'Cancel' }).describe('Timezone dialog cancel');
      await cancelTimezoneBtn.waitFor({ state: 'visible', timeout: 3000 });
      await cancelTimezoneBtn.click();
    } catch {
      // No timezone dialog, continue
    }

    // Wait for any overlays to disappear
    await waitForOverlayToDisappear(page);

    // ===== Step 3: Navigate to New Job form =====
    await page.goto('/jobs/new');

    // Wait for the New Job form to load
    const jobTitleInput = page.getByRole('textbox', { name: 'Job Title *' }).describe('Job title input');
    await jobTitleInput.waitFor({ state: 'visible', timeout: 30000 });

    // Dismiss notification dialog again if it reappears
    try {
      const noThanksBtn2 = page.getByRole('button', { name: 'No, thanks' }).describe('Notification dismiss button');
      await noThanksBtn2.waitFor({ state: 'visible', timeout: 3000 });
      await noThanksBtn2.click();
      await waitForOverlayToDisappear(page);
    } catch {
      // No notification dialog, continue
    }

    // ===== Step 4: Fill Job Details =====
    await jobTitleInput.fill(jobTitle);

    // Select Job Category - "Installation Services"
    const jobCategoryDropdown = page.getByRole('combobox', { name: 'Choose a Job Category' }).describe('Job Category dropdown');
    await jobCategoryDropdown.waitFor({ state: 'visible', timeout: 10000 });
    await jobCategoryDropdown.click();
    const installOption = page.getByRole('option', { name: 'Installation Services' }).describe('Installation Services option');
    await installOption.waitFor({ state: 'visible', timeout: 10000 });
    await installOption.click();

    // ===== Step 5: Quick Create Organization with Indian Address =====
    const addOrgLink = page.locator('a').filter({ hasText: /^Add Organization$/ }).describe('Add Organization link');
    await addOrgLink.scrollIntoViewIfNeeded();
    await addOrgLink.click();

    // Switch to "New Organization" tab
    const newOrgTab = page.getByText('New Organization').describe('New Organization tab');
    await newOrgTab.waitFor({ state: 'visible', timeout: 5000 });
    await newOrgTab.click();

    // Fill Organization Name and Email
    const orgNameInput = page.getByRole('textbox', { name: 'Organization Name*' }).describe('Organization name input');
    await orgNameInput.waitFor({ state: 'visible', timeout: 5000 });
    await orgNameInput.fill(orgName);
    await page.getByRole('textbox', { name: 'Email*' }).describe('Organization email input').fill(orgEmail);

    // Fill Indian Street Address and select from autocomplete
    const streetInput = page.getByRole('textbox', { name: 'Flat / House No, Street /' }).describe('Street address input');
    await streetInput.fill('MG Road Bengaluru');

    // Wait for and select Indian address autocomplete suggestion
    const addressSuggestion = page.getByRole('button', { name: 'MG Road, Yellappa Chetty' }).describe('Indian address suggestion');
    await addressSuggestion.waitFor({ state: 'visible', timeout: 10000 });
    await addressSuggestion.click();

    // Verify address fields auto-populated with Indian address
    await expect(page.getByRole('textbox', { name: 'City' }).describe('City field')).toHaveValue('Bengaluru');
    await expect(page.getByRole('textbox', { name: 'State / Province' }).describe('State field')).toHaveValue('Karnataka');

    // Fill zipcode
    await page.getByRole('textbox', { name: 'Zipcode' }).describe('Zipcode field').fill('560001');

    // Click "Create & Choose Organization"
    const createOrgBtn = page.getByRole('button', { name: 'Create & Choose Organization' }).describe('Create org button');
    await createOrgBtn.click();

    // Wait for organization creation success toast
    await expect(page.getByText('New Organization Created successfully').describe('Org success toast')).toBeVisible({ timeout: 15000 });

    // ===== Step 6: Quick Create Contact with Indian Address =====
    const addContactLink = page.locator('a').filter({ hasText: /^Add Contact$/ }).describe('Add Contact link');
    await addContactLink.waitFor({ state: 'visible', timeout: 10000 });
    await addContactLink.scrollIntoViewIfNeeded();
    await addContactLink.click();

    // Switch to "New Contact" tab
    const newContactTab = page.getByText('New Contact').describe('New Contact tab');
    await newContactTab.waitFor({ state: 'visible', timeout: 5000 });
    await newContactTab.click();

    // Fill mandatory contact fields
    const firstNameInput = page.getByRole('textbox', { name: 'First Name*' }).describe('Contact first name');
    await firstNameInput.waitFor({ state: 'visible', timeout: 5000 });
    await firstNameInput.fill(customerFirstName);
    await page.getByRole('textbox', { name: 'Last Name' }).describe('Contact last name').fill(customerLastName);
    await page.getByRole('textbox', { name: 'Email*' }).describe('Contact email').fill(customerEmail);

    // Select Account Manager - "James Smith"
    const accountManagerCombo = page.locator('ng-select').filter({ hasText: /Account Manager/ }).locator('input').describe('Account Manager dropdown');
    await accountManagerCombo.click();
    const jamesSmithOption = page.getByRole('option', { name: 'James Smith' }).describe('James Smith option');
    await jamesSmithOption.waitFor({ state: 'visible', timeout: 5000 });
    await jamesSmithOption.click();

    // Check "Same As Service Address" for billing address
    const sameAsServiceCheckbox = page.locator('[id="Billing Address_customer_check"]').describe('Same as service address checkbox');
    await sameAsServiceCheckbox.click();

    // Click "Create & Choose Contact"
    const createContactBtn = page.getByRole('button', { name: 'Create & Choose Contact' }).describe('Create contact button');
    await createContactBtn.click();

    // Wait for contact creation success toast
    await expect(page.getByText('Customer created successfully').describe('Contact success toast')).toBeVisible({ timeout: 15000 });

    // ===== Step 7: Fill remaining mandatory fields =====
    // Fill mandatory custom field "Text Input *"
    const customTextField = page.getByRole('textbox', { name: 'Text Input *' }).describe('Custom text input field');
    await customTextField.scrollIntoViewIfNeeded();
    await customTextField.waitFor({ state: 'visible', timeout: 5000 });
    await customTextField.fill('Test Input Value');

    // Select Due Date
    const dueDateInput = page.getByRole('textbox', { name: 'Due Date' }).describe('Due date picker');
    await dueDateInput.scrollIntoViewIfNeeded();
    await dueDateInput.click();

    // Click the dynamic due date (tomorrow)
    const dueDateBtn = page.getByRole('button', { name: dueDateLabel }).describe('Due date selection');
    await dueDateBtn.waitFor({ state: 'visible', timeout: 5000 });
    await dueDateBtn.click();

    // ===== Step 8: Create Job =====
    const createJobBtn = page.locator('a').filter({ hasText: 'Create Job' }).describe('Create Job button');
    await createJobBtn.scrollIntoViewIfNeeded();
    await createJobBtn.click();

    // Confirm job creation in the dialog
    const confirmCreateBtn = page.getByRole('button', { name: 'Create' }).describe('Confirm create button');
    await confirmCreateBtn.waitFor({ state: 'visible', timeout: 5000 });
    await confirmCreateBtn.click();

    // ===== Step 9: Verify Job Created Successfully =====
    // Wait for redirect to job details page
    await page.waitForURL('**/jobs/*/details', { timeout: 30000 });

    // Verify success toast
    await expect(page.getByText('Job created successfully').describe('Job success toast')).toBeVisible({ timeout: 15000 });

    // Verify job title in page title
    await expect(page).toHaveTitle(new RegExp(jobTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').substring(0, 30)));

    // Verify job details on the details page
    await expect(page.getByText('Installation Services').first().describe('Job category')).toBeVisible();
    await expect(page.getByText('New').first().describe('Job status')).toBeVisible();

    // Verify organization is linked with Indian address (scope to Organization section)
    const orgSection = page.getByLabel('Organization').describe('Organization section');
    await expect(orgSection.getByRole('link', { name: orgName }).describe('Organization link')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('MG Road, Yellappa Chetty Layout, Ashok Nagar, Bengaluru, Karnataka, India').first().describe('Indian address')).toBeVisible();

    // Verify contact is linked (scope to Contact section)
    const contactSection = page.getByLabel('Contact', { exact: true }).describe('Contact section');
    await expect(contactSection.getByRole('link', { name: `${customerFirstName} ${customerLastName}` }).describe('Contact link')).toBeVisible();
  });
});
