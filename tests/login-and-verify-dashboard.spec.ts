import { test, expect } from '@stablyai/playwright-test';
import { LoginPage } from './pages/LoginPage.js';

test.describe('Login, Navigate to Jobs, and Create Organization', () => {
  /**
   * User Prompt:
   * - Open https://uat.zuperpro.com
   * - Enter username in username field
   * - Enter password in password field
   * - Click on Login button
   * - Verify dashboard is displayed
   * - now login again and click job icon
   * - click organization and create a organization with a organization name as test uat8/4
   *   and organization email as uat8/4@gmail.com, street address as 4/966, Gandhi St,
   *   Elango Nagar, Perungudi, Chennai, Tamil Nadu 600096, India and click save
   */
  test('should login, navigate to Jobs, then create an Organization', async ({ page }) => {
    const companyName = process.env.company_name!;
    const userName = process.env.user_name!;
    const password = process.env.password!;

    // ── Login ──────────────────────────────────────────────────────────
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    await loginPage.companyNameInput.waitFor({ state: 'visible', timeout: 30000 });
    await loginPage.companyNameInput.fill(companyName);

    // Use JS click to bypass banner overlay
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Continue'
      );
      if (btn) btn.click();
    });

    await loginPage.emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await loginPage.emailInput.fill(userName);
    await loginPage.passwordInput.fill(password);

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Login'
      );
      if (btn) btn.click();
    });

    // ── Verify dashboard ───────────────────────────────────────────────
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
    await expect(page).toHaveTitle(/Dashboard/);

    // ── Dismiss popups ─────────────────────────────────────────────────
    const cancelButton = page.getByRole('button', { name: 'Cancel' }).describe('Cancel timezone popup');
    await cancelButton.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }

    const noThanksButton = page.getByRole('button', { name: 'No, thanks' }).describe('No thanks notification popup');
    await noThanksButton.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await noThanksButton.isVisible()) {
      await noThanksButton.click();
    }

    // ── Navigate to Jobs ───────────────────────────────────────────────
    const jobGroupIcon = page.locator('#job_group').describe('Jobs group sidebar icon');
    await jobGroupIcon.waitFor({ state: 'visible', timeout: 15000 });
    await jobGroupIcon.click();

    const jobsLink = page.getByRole('link', { name: 'Jobs', exact: true }).describe('Jobs link in sidebar');
    await jobsLink.waitFor({ state: 'visible', timeout: 10000 });
    await jobsLink.click();

    await expect(page).toHaveURL(/\/jobs/, { timeout: 15000 });
    await expect(page).toHaveTitle(/Jobs/);

    // ── Navigate to Organizations ──────────────────────────────────────
    const orgNavButton = page
      .locator('div')
      .filter({ hasText: 'Customers, Organizations and' })
      .nth(3)
      .describe('Customer/Org sidebar group');
    await orgNavButton.waitFor({ state: 'visible', timeout: 20000 });
    await orgNavButton.click();

    const orgsLink = page.getByRole('link', { name: 'Organizations' }).describe('Organizations link');
    await orgsLink.waitFor({ state: 'visible', timeout: 10000 });
    await orgsLink.click();

    await expect(page).toHaveURL(/\/organizations/, { timeout: 15000 });

    // ── Click New Organization ─────────────────────────────────────────
    // Dismiss notification dialog if it reappeared
    const noThanks2 = page.getByRole('button', { name: 'No, thanks' });
    if (await noThanks2.isVisible({ timeout: 2000 }).catch(() => false)) {
      await noThanks2.evaluate((el) => el.click());
      await page.waitForTimeout(300);
    }

    const newOrgButton = page.getByRole('link', { name: ' New Organization' }).describe('New Organization button');
    await newOrgButton.waitFor({ state: 'visible', timeout: 10000 });
    await newOrgButton.click();

    await expect(page).toHaveURL(/\/organizations\/new/, { timeout: 15000 });

    // ── Fill Organization details ──────────────────────────────────────
    // Add a unique suffix to avoid 409 Conflict from duplicate org names
    const uniqueSuffix = Date.now().toString().slice(-6);
    const orgName = `test uat8/4_${uniqueSuffix}`;
    const orgEmail = `uat8_4_${uniqueSuffix}@gmail.com`;

    const orgNameInput = page.getByRole('textbox', { name: 'Organization Name*' }).describe('Organization Name input');
    await orgNameInput.waitFor({ state: 'visible', timeout: 15000 });
    await orgNameInput.fill(orgName);

    const orgEmailInput = page.getByRole('textbox', { name: 'Organization Email' }).describe('Organization Email input');
    await orgEmailInput.fill(orgEmail);

    // ── Fill street address (triggers Google Maps autocomplete) ────────
    const streetInput = page
      .getByRole('textbox', { name: 'Flat / House No, Street / Locality' })
      .first()
      .describe('Street address input');
    await streetInput.click();
    await streetInput.pressSequentially('4/966 Gandhi St Perungudi Chennai', { delay: 60 });

    // Wait for autocomplete suggestions and select the first matching one
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll('button[title]'));
      const addressBtns = allBtns.filter(
        (b) => b.title && b.title.length > 15 && b.title.includes(',')
      );
      if (addressBtns[0]) addressBtns[0].click();
    });
    await page.waitForTimeout(800);

    // ── Check "Same As Service Address" for billing ────────────────────
    // Use JS click to bypass CDK overlay backdrop
    await page.getByRole('checkbox', { name: 'Same As Service Address' }).evaluate((el: HTMLInputElement) => {
      if (!el.checked) el.click();
    });
    await page.waitForTimeout(500);

    // ── Dismiss notification dialog if present before save ─────────────
    const noThanks3 = page.getByRole('button', { name: 'No, thanks' });
    if (await noThanks3.isVisible({ timeout: 1500 }).catch(() => false)) {
      await noThanks3.evaluate((el) => el.click());
      await page.waitForTimeout(300);
    }

    // ── Save Organization ──────────────────────────────────────────────
    // Click Save Organization anchor via JS — target the <a> element directly
    await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll('a'))
        .find((a) => a.textContent?.trim().includes('Save Organization'));
      if (link) link.click();
    });

    // Wait for the "Create Organization" confirmation dialog
    const createButton = page.getByRole('button', { name: 'Create' });
    await createButton.waitFor({ state: 'visible', timeout: 10000 });

    // Click Create via JS to bypass banner overlay
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find((b) => b.innerText && b.innerText.trim() === 'Create');
      if (btn) btn.click();
    });

    // ── Verify organization was created ────────────────────────────────
    await page.waitForURL((url) => !url.toString().includes('/organizations/new'), { timeout: 30000 });
    await expect(page).toHaveURL(/\/organizations\/.*\/details/, { timeout: 30000 });
    await expect(page).toHaveTitle(new RegExp(orgName.replace(/[/]/g, '\\/')));
  });
});
