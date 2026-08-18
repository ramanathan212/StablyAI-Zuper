import { dismissPromoOverlays, installOverlayAutoDismiss } from '../Helper/overlay-helper.js';

export class LoginPage {
  constructor(page, baseURL = null) {
    this.page = page;
    this.baseURL = baseURL;
    this.companyNameInput = page.getByRole('textbox', { name: 'Company Name' });
    this.continueButton = page.getByRole('button', { name: 'Continue' });
    this.emailInput = page.getByRole('textbox', { name: 'Email address' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password Forgot password?' });
    this.loginButton = page.getByRole('button', { name: 'Login', exact: true });
    installOverlayAutoDismiss(page);
  }

  async navigate() {
    if (this.baseURL) {
      await this.page.goto(`${this.baseURL}/login`);
    } else {
      await this.page.goto('/login');
    }
  }

  async login(companyName, email, password) {
    await this.navigate();
    // Wait for the login form to be ready (app shows a loading screen first)
    await this.companyNameInput.waitFor({ state: 'visible', timeout: 30000 });
    await this.companyNameInput.fill(companyName);
    // Use JS click to bypass banner overlay that intercepts Playwright's synthetic clicks
    await this.page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Continue');
      if (btn) btn.click();
    });
    await this.emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Login');
      if (btn) btn.click();
    });

    // Wait for redirect to dashboard to confirm login succeeded
    await this.page.waitForURL('**/dashboard', { timeout: 30000 });
    await this.page.waitForLoadState('load');
  }

  async dismissOnboarding() {
    // Give the "Introducing Agent Studio" / "Zuper Guide" overlays a moment
    // to render before checking for them
    await this.page.waitForTimeout(1500);
    await dismissPromoOverlays(this.page);

    // Dismiss "Trial Period Ending Soon" modal if present
    try {
      const trialCloseBtn = this.page.locator('button').filter({ has: this.page.locator('i, em') }).first();
      const trialModal = this.page.locator('text=Trial Period Ending Soon');
      if (await trialModal.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Click the X close button on the trial modal
        const closeBtn = this.page.locator('.modal-close, [class*="close"], button:near(:text("Trial Period Ending Soon"))').first();
        if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeBtn.click();
        } else {
          // Fallback: press Escape to close
          await this.page.keyboard.press('Escape');
        }
        await this.page.waitForTimeout(500);
        console.log('✓ Trial period modal dismissed');
      }
    } catch (_) {}

    // Dismiss notification permission dialog ("No, thanks" / "Allow")
    const noThanksButton = this.page.getByRole('button', { name: 'No, thanks' });
    if (await noThanksButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await noThanksButton.click();
      await this.page.waitForTimeout(500);
    }

    // Dismiss any remaining CDK overlay backdrops
    try {
      const backdrop = this.page.locator('.cdk-overlay-backdrop');
      if (await backdrop.isVisible({ timeout: 1000 }).catch(() => false)) {
        await backdrop.click({ force: true });
        await this.page.waitForTimeout(500);
      }
    } catch (_) {}

    // Final Escape press to close any remaining modals
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
  }
}
