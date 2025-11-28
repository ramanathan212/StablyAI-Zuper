import { chromium } from '@playwright/test';
import { testData } from './test-data.js';

async function globalSetup() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login once using centralized test data
  await loginToApplication(page, testData.login);

  // Save authentication state
  await context.storageState({ path: 'tests/.auth/user.json' });

  await browser.close();
}

// Reusable login function
export async function loginToApplication(page, credentials) {
  await page.goto('https://uat.zuperpro.com/login');

  // Enter company name
  await page.getByRole('textbox', { name: 'Company Name' }).fill(credentials.companyName);
  await page.getByRole('button', { name: 'Continue' }).click();

  // Enter credentials
  await page.getByRole('textbox', { name: 'Email address' }).fill(credentials.email);
  await page.getByRole('textbox', { name: 'Password Forgot password?' }).fill(credentials.password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();

  // Wait for login to complete
  await page.waitForURL('**/dashboard', { timeout: 30000 });

  // Wait for page to stabilize
  await page.waitForLoadState('networkidle');

  // Dismiss notification if present
  try {
    const noThanksButton = page.getByRole('button', { name: 'No, thanks' });
    await noThanksButton.waitFor({ state: 'visible', timeout: 5000 });
    await noThanksButton.click();
    console.log('✓ Welcome notification dismissed');
  } catch (error) {
    console.log('No welcome notification to dismiss, continuing...');
  }
}

export default globalSetup;
