import { test } from '@stablyai/playwright-test';
import { LoginPage } from './pages/LoginPage.js';

test('explore seed', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.login('zuper-pro', 'ragupathy.s@zuper.co', 'Test@1234');
  await loginPage.dismissOnboarding();
  const cancelBtn = page.getByRole('button', { name: 'Cancel' });
  if (await cancelBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await cancelBtn.click();
  }
  await page.goto('/jobs');
  await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(2000);
});
