import { chromium } from '@playwright/test';
import { testData } from './test-data.js';
import { devStagingData } from './config/dev-staging-data.js';

// Determine which environment to use
const ENV = process.env.TEST_ENV || 'uat';
const BASE_URLS = {
  development: 'https://developmentv3.zuperpro.com/v2',
  staging: 'https://staging.zuperpro.com',
  uat: 'https://uat.zuperpro.com'
};

// Select credentials based on environment
const credentials = (ENV === 'development' || ENV === 'staging')
  ? devStagingData.login
  : testData.login;

console.log(`\n🌍 Setting up global authentication for environment: ${ENV.toUpperCase()}`);
console.log(`📍 Base URL: ${BASE_URLS[ENV]}`);
console.log(`👤 Using credentials for: ${credentials.companyName}`);

async function globalSetup() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login once using environment-specific credentials
  await loginToApplication(page, credentials, BASE_URLS[ENV]);

  // Save authentication state
  await context.storageState({ path: 'tests/.auth/user.json' });

  console.log('✅ Global setup completed successfully\n');
  await browser.close();
}

// Reusable login function
export async function loginToApplication(page, credentials, baseUrl = 'https://uat.zuperpro.com') {
  const loginUrl = `${baseUrl}/login`;
  console.log(`🔐 Logging in to: ${loginUrl}`);

  await page.goto(loginUrl);

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

  // Dismiss any remaining overlays/backdrops
  try {
    await page.waitForTimeout(1000); // Wait for any animations
    const overlays = page.locator('.cdk-overlay-backdrop');
    const count = await overlays.count();
    if (count > 0) {
      // Try pressing Escape to close overlays
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // If still visible, click the backdrop
      if (await overlays.first().isVisible().catch(() => false)) {
        await overlays.first().click({ force: true });
        await page.waitForTimeout(500);
      }
      console.log('✓ Overlays dismissed');
    }
  } catch (error) {
    console.log('No overlays to dismiss');
  }

  // Wait for overlays to disappear
  await page.waitForSelector('.cdk-overlay-backdrop', { state: 'hidden', timeout: 3000 }).catch(() => {
    console.log('No overlay backdrops found or already hidden');
  });
}

export default globalSetup;
