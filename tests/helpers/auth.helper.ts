import { Page, expect } from '@playwright/test';

/**
 * Logs into the UAT Zuper Pro application using environment credentials.
 * Uses page.evaluate() for Continue and Login button clicks to bypass
 * the persistent promotional banner overlay that intercepts Playwright
 * synthetic clicks.
 */
export async function loginToApp({ page }: { page: Page }): Promise<void> {
  const companyName = process.env.company_name!;
  const userName = process.env.user_name!;
  const password = process.env.password!;

  await page.goto('/login');

  // If already logged in, the SPA may redirect to the dashboard
  if (page.url().includes('/dashboard')) return;

  // Wait for the company name input (app shows a loading screen first)
  const companyInput = page.getByRole('textbox', { name: 'Company Name' });
  await companyInput.waitFor({ state: 'visible', timeout: 30000 });
  await companyInput.fill(companyName);

  // Click Continue via JS to bypass banner overlay
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Continue'
    );
    if (btn) btn.click();
  });

  // Fill email and password
  const emailInput = page.getByRole('textbox', { name: 'Email address' });
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.fill(userName);

  const passwordInput = page.getByRole('textbox', {
    name: 'Password Forgot password?',
  });
  await passwordInput.fill(password);

  // Click Login via JS to bypass banner overlay
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Login'
    );
    if (btn) btn.click();
  });

  // Confirm login succeeded by waiting for dashboard redirect
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
}

/**
 * Dismisses recurring post-login popups that appear on the dashboard:
 * - Timezone change dialog ("Cancel")
 * - Browser notification permission dialog ("No, thanks")
 * - Trial period modals (Escape key)
 * - CDK overlay backdrops (Escape key)
 *
 * Safe to call multiple times — each popup check is wrapped in try/catch.
 */
export async function dismissPopups({ page }: { page: Page }): Promise<void> {
  // Dismiss timezone change dialog
  try {
    const cancelBtn = page.getByRole('button', { name: 'Cancel' });
    if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cancelBtn.click();
      await page.waitForTimeout(300);
    }
  } catch {
    /* no timezone dialog */
  }

  // Dismiss notification permission dialog
  try {
    const noThanksBtn = page.getByRole('button', { name: 'No, thanks' });
    if (await noThanksBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await noThanksBtn.evaluate((el) => el.click());
      await page.waitForTimeout(300);
    }
  } catch {
    /* no notification dialog */
  }

  // Dismiss trial period modal
  try {
    const trialModal = page.locator('text=Trial Period Ending Soon');
    if (await trialModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  } catch {
    /* no trial modal */
  }

  // Dismiss any remaining CDK overlay backdrop
  try {
    const backdrop = page.locator(
      '.cdk-overlay-backdrop.cdk-overlay-backdrop-showing'
    );
    if (await backdrop.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  } catch {
    /* no backdrop */
  }
}

/**
 * Full login flow including popup dismissal.
 * Convenience wrapper that calls loginToApp + dismissPopups.
 */
export async function loginAndDismissPopups({
  page,
}: {
  page: Page;
}): Promise<void> {
  await loginToApp({ page });
  await dismissPopups({ page });
}
