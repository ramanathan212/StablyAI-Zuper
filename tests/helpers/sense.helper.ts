import { Page, expect } from '@playwright/test';

const SENSE_BASE_URL = 'https://staging-next.zuperpro.com';

/**
 * Logs into the Zuper staging-next environment and navigates to the Sense page.
 * If the user is already logged in (session persists from a prior test),
 * skips login and goes directly to Sense.
 */
export async function loginAndNavigateToSense({
  page,
  companyName,
  email,
  password,
}: {
  page: Page;
  companyName: string;
  email: string;
  password: string;
}): Promise<void> {
  // Navigate to login — if already authenticated, app will redirect to dashboard
  await page.goto(`${SENSE_BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

  // Wait for either the login form OR a redirect to dashboard/sense
  // This handles the race condition where goto resolves before redirect completes
  const loginFormOrRedirect = await Promise.race([
    page
      .getByRole('textbox', { name: 'Company Name' })
      .waitFor({ state: 'visible', timeout: 15000 })
      .then(() => 'login_form' as const),
    page
      .waitForURL(/\/(dashboard|sense|jobs)/, { timeout: 15000 })
      .then(() => 'redirected' as const),
  ]).catch(() => 'unknown' as const);

  if (loginFormOrRedirect === 'login_form') {
    // Need to login
    const companyInput = page.getByRole('textbox', { name: 'Company Name' });
    await companyInput.fill(companyName);

    // Click Continue — force: true bypasses the promotional banner overlay
    const continueBtn = page.getByRole('button', { name: 'Continue' });
    await continueBtn.click({ force: true });

    // Fill credentials
    const emailInput = page.getByRole('textbox', { name: 'Email address' });
    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await emailInput.fill(email);

    const passwordInput = page.getByRole('textbox', {
      name: 'Password Forgot password?',
    });
    await passwordInput.fill(password);

    // Click Login — force: true bypasses any overlay
    const loginBtn = page.getByRole('button', { name: 'Login' });
    await loginBtn.click({ force: true });

    // Wait for dashboard redirect
    await page.waitForURL('**/dashboard', { timeout: 30000 });
  }

  // Dismiss timezone dialog if it appears
  await dismissPopups({ page });

  // Navigate to Sense
  await page.goto(`${SENSE_BASE_URL}/sense`);
  await page.waitForURL('**/sense', { timeout: 15000 });

  // Wait for the Sense home page to fully render
  const senseHeading = page.getByRole('heading', {
    name: 'What would you like to understand today?',
    level: 1,
  });
  await senseHeading.waitFor({ state: 'visible', timeout: 15000 });
}

/**
 * Dismisses common popups: timezone dialog, notification prompts, overlays.
 */
export async function dismissPopups({ page }: { page: Page }): Promise<void> {
  await page.waitForTimeout(1500);

  // Dismiss timezone dialog
  const timezoneHeading = page.getByRole('heading', {
    name: 'Your timezone has changed',
  });
  if (await timezoneHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.getByRole('button', { name: 'Cancel' }).click();
    await timezoneHeading
      .waitFor({ state: 'hidden', timeout: 5000 })
      .catch(() => {});
  }

  // Dismiss "No, thanks" notification
  const noThanks = page.getByRole('button', { name: 'No, thanks' });
  if (await noThanks.isVisible({ timeout: 2000 }).catch(() => false)) {
    await noThanks.click();
    await page.waitForTimeout(500);
  }
}

/**
 * Sends a prompt to Sense and waits for the AI response to appear.
 * Works from either the Sense home page (initial prompt) or within a thread (follow-up).
 *
 * For initial prompts from the home page, navigates to /sense/chat/new which has
 * a direct "Message input" textbox — this is more reliable than trying to expand
 * the dynamic prompt button on the home page (whose text changes continuously
 * and whose click handler requires trusted React events).
 */
export async function sendSensePrompt({
  page,
  prompt,
  waitTimeMs = 30000,
}: {
  page: Page;
  prompt: string;
  waitTimeMs?: number;
}): Promise<void> {
  const currentUrl = page.url();
  const isInThread = currentUrl.includes('/sense/chat/');

  if (!isInThread) {
    // Navigate to new chat view which has a direct message input
    await page.goto(`${SENSE_BASE_URL}/sense/chat/new`);
    const messageInput = page.getByRole('textbox', { name: 'Message input' });
    await messageInput.waitFor({ state: 'visible', timeout: 15000 });
  }

  // Count existing "Thought for" buttons before sending (for multi-turn tracking)
  const thoughtButton = page.getByRole('button', { name: /Thought for/ });
  const existingResponseCount = await thoughtButton.count();

  // Both new chat and existing thread use the same "Message input" textbox
  const messageInput = page.getByRole('textbox', { name: 'Message input' });
  await messageInput.waitFor({ state: 'visible', timeout: 10000 });
  await messageInput.fill(prompt);
  await page.keyboard.press('Enter');

  // Wait for the thread URL (new threads redirect from /chat/new to /chat/thread_xxx)
  await page.waitForURL('**/sense/chat/thread_**', { timeout: 15000 });

  // Wait for a NEW "Thought for" indicator (count must exceed prior count)
  await waitForSenseResponse({
    page,
    timeoutMs: waitTimeMs,
    expectedMinCount: existingResponseCount + 1,
  });
}

/**
 * Waits for the Sense AI response to finish generating.
 * Detects the "Thought for X.Xs" button which indicates the response has completed.
 *
 * @param expectedMinCount - Minimum number of "Thought for" buttons to wait for.
 *   Used for multi-turn conversations to ensure the new response has completed,
 *   not just the existing ones. Defaults to 1.
 */
export async function waitForSenseResponse({
  page,
  timeoutMs = 30000,
  expectedMinCount = 1,
}: {
  page: Page;
  timeoutMs?: number;
  expectedMinCount?: number;
}): Promise<void> {
  const thoughtButton = page.getByRole('button', { name: /Thought for/ });

  // Poll until we have at least expectedMinCount completed responses
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const count = await thoughtButton.count();
    if (count >= expectedMinCount) {
      break;
    }
    await page.waitForTimeout(1000);
  }

  // Final verify: the last "Thought for" button should be visible
  await thoughtButton.last().waitFor({ state: 'visible', timeout: 10000 });

  // Small buffer for DOM to stabilize after streaming finishes
  await page.waitForTimeout(1000);
}

/**
 * Creates a new thread from the Sense home or thread view.
 * Navigates to /sense/chat/new which provides a fresh message input.
 */
export async function createNewSenseThread({
  page,
}: {
  page: Page;
}): Promise<void> {
  await page.goto(`${SENSE_BASE_URL}/sense/chat/new`);
  const messageInput = page.getByRole('textbox', { name: 'Message input' });
  await messageInput.waitFor({ state: 'visible', timeout: 15000 });
}

export { SENSE_BASE_URL };
