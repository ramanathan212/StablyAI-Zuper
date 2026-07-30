import { test, expect } from '@stablyai/playwright-test';
import { forceRemoveOverlays } from './Helper/overlay-helper.js';

test('explore note replies UI', async ({ page }) => {
  // Login
  await page.goto('/login');
  const companyInput = page.getByRole('textbox', { name: 'Company Name' });
  await companyInput.waitFor({ state: 'visible', timeout: 30000 });
  await companyInput.fill(process.env.companyName!);
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Continue');
    if (btn) (btn as HTMLButtonElement).click();
  });
  const emailInput = page.getByRole('textbox', { name: 'Email address' });
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.fill(process.env.email!);
  const passwordInput = page.getByRole('textbox', { name: 'Password Forgot password?' });
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.fill(process.env.password!);
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Login');
    if (btn) (btn as HTMLButtonElement).click();
  });
  await page.waitForURL('**/dashboard', { timeout: 45000 });

  // Dismiss popups
  const tzCancelBtn = page.getByRole('button', { name: 'Cancel' });
  await tzCancelBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (await tzCancelBtn.isVisible()) await tzCancelBtn.click();
  const notifBtn = page.getByRole('button', { name: 'No, thanks' });
  await notifBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (await notifBtn.isVisible()) await notifBtn.click();

  // Navigate to jobs
  await page.goto('/jobs');
  await forceRemoveOverlays(page);
  const jobTable = page.locator('table').first();
  await jobTable.waitFor({ state: 'visible', timeout: 30000 });

  // Open first job
  const firstJobLink = page.locator('table tbody tr').first().locator('a').first();
  await firstJobLink.waitFor({ state: 'visible', timeout: 15000 });
  const jobHref = await firstJobLink.getAttribute('href');
  await page.goto(jobHref!);
  await expect(page).toHaveURL(/\/jobs\/.*\/details/, { timeout: 30000 });
  await forceRemoveOverlays(page);

  // Open Notes tab
  const notesTab = page.getByRole('button', { name: /^Notes/ }).first();
  await notesTab.waitFor({ state: 'visible', timeout: 30000 });
  await notesTab.click();

  // Wait for notes to load
  const noteEditorButton = page.getByRole('button', { name: 'Enter your notes here...' });
  await expect(noteEditorButton).toBeVisible({ timeout: 15000 });

  // Wait for note cards
  await page.waitForTimeout(3000);

  // Log what we find - look for reply/comment UI elements
  const noteCards = page.locator('[data-testid="notes_card"]');
  const cardCount = await noteCards.count();
  console.log(`Found ${cardCount} note cards`);

  if (cardCount > 0) {
    // Click on first note card to see if reply opens
    const firstCard = noteCards.first();
    await firstCard.click();
    await page.waitForTimeout(2000);

    // Look for any reply/comment buttons or inputs
    const replyButtons = page.getByRole('button', { name: /reply|comment/i });
    const replyCount = await replyButtons.count();
    console.log(`Found ${replyCount} reply/comment buttons`);

    // Check the note card inner HTML for clues
    const cardHTML = await firstCard.innerHTML();
    console.log('First card HTML (first 2000 chars):', cardHTML.substring(0, 2000));
  }

  // Just pass - this is an exploration test
  expect(true).toBeTruthy();
});
