export class LoginPage {
  constructor(page, baseURL = null) {
    this.page = page;
    this.baseURL = baseURL;
    this.companyNameInput = page.getByRole('textbox', { name: 'Company Name' });
    this.continueButton = page.getByRole('button', { name: 'Continue' });
    this.emailInput = page.getByRole('textbox', { name: 'Email address' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password Forgot password?' });
    this.loginButton = page.getByRole('button', { name: 'Login', exact: true });
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
    const noThanksButton = this.page.getByRole('button', { name: 'No, thanks' });
    if (await noThanksButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await noThanksButton.click();
    }
  }
}
