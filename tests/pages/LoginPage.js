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
    await this.companyNameInput.click();
    await this.companyNameInput.fill(companyName);
    await this.continueButton.click();
    await this.emailInput.click();
    await this.emailInput.fill(email);
    await this.passwordInput.click();
    await this.passwordInput.fill(password);
    await this.loginButton.click();

    // Wait for navigation to complete
    await this.page.waitForLoadState('networkidle');
  }

  async dismissOnboarding() {
    const noThanksButton = this.page.getByRole('button', { name: 'No, thanks' });
    if (await noThanksButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await noThanksButton.click();
    }
  }
}
