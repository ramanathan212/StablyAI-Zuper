import { test, expect } from '@stablyai/playwright-test';

test('test single job creation', async ({ page, agent }) => {
  test.setTimeout(300000);

  // Login
  await page.goto('https://web.zuperpro.com/login');
  await page.getByRole('textbox', { name: 'Company Name' }).waitFor({ state: 'visible' });
  await page.getByRole('textbox', { name: 'Company Name' }).fill('ZuperQA');
  await page.getByRole('button', { name: 'Continue' }).click();
  const emailField = page.getByRole('textbox', { name: 'Email address' });
  await emailField.waitFor({ state: 'visible' });
  await emailField.fill('qa@zuper.co');
  const passwordField = page.getByRole('textbox', { name: 'Password Forgot password?' });
  await passwordField.waitFor({ state: 'visible' });
  await passwordField.fill('Test@1234');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL(/dashboard/, { timeout: 60000 });

  // Dismiss popups
  await page.waitForTimeout(3000);
  const timezoneHeading = page.getByRole('heading', { name: 'Your timezone has changed' });
  if (await timezoneHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.getByRole('button', { name: 'Cancel' }).click();
    await timezoneHeading.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
  const noThanksButton = page.getByRole('button', { name: 'No, thanks' });
  if (await noThanksButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await noThanksButton.click();
    await page.waitForTimeout(500);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);

  // Navigate to New Job
  await page.goto('https://web.zuperpro.com/jobs/new');
  await page.getByText('Getting things ready').first().waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  await page.getByRole('textbox', { name: 'Job Title *' }).waitFor({ state: 'visible', timeout: 30000 });

  // Fill Job Title
  await page.getByRole('textbox', { name: 'Job Title *' }).fill('QA-Job-Test');

  // Select Job Category
  await page.locator('text=Choose a Job Category').click();
  await page.waitForTimeout(1000);
  await page.getByText('Cleaning', { exact: true }).first().click();
  await page.waitForTimeout(500);

  // Set Due Date
  await page.getByRole('textbox', { name: 'Due Date' }).click();
  await page.waitForTimeout(1000);
  const today = new Date();
  const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dueDateLabel = `${monthNames[futureDate.getMonth()]} ${futureDate.getDate()},`;
  const dateButton = page.getByRole('button', { name: dueDateLabel });
  if (await dateButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await dateButton.click();
  } else {
    await agent.act('Click on any available future date in the calendar date picker', { page, maxCycles: 5 });
  }
  await page.waitForTimeout(500);
  await page.getByRole('textbox', { name: 'Job Title *' }).click();
  await page.waitForTimeout(500);

  // Add Service Address
  await page.getByText('Add Service Address').scrollIntoViewIfNeeded();
  await page.getByText('Add Service Address').click();
  await page.waitForTimeout(2000);

  // Use agent to handle the Service Address modal
  await agent.act('In the Service Address modal, type "New York" in the "Search Address" search box, wait for suggestions, select the first suggestion "New York, NY, USA", then scroll down and click the blue "Add" button at the bottom of the modal.', { page, maxCycles: 12 });
  await page.waitForTimeout(2000);
});
