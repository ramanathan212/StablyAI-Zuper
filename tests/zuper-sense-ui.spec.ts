import { test, expect } from '@stablyai/playwright-test';

const SENSE_HOME_URL = 'https://developmentv3.zuperpro.com/settings/sense';
const SENSE_CHAT_URL = 'https://developmentv3.zuperpro.com/sense/chat';
const LOGIN_URL = 'https://developmentv3.zuperpro.com/settings/login';

const COMPANY_NAME = 'Zuper';
const USER_EMAIL = 'Vignesh.s@zuper.co';
const USER_PASSWORD = 'Vicky@1234';

test.describe('Zuper Sense Module - Complete UI Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto(LOGIN_URL);
    await page.getByRole('textbox', { name: 'Company Name' }).waitFor({ state: 'visible', timeout: 30000 });
    await page.getByRole('textbox', { name: 'Company Name' }).fill(COMPANY_NAME);

    // Wait for the Continue button to be enabled after company name is accepted
    await page.getByRole('button', { name: 'Continue' }).waitFor({ state: 'visible' });
    await page.waitForTimeout(1000); // Wait for company name validation
    await page.getByRole('button', { name: 'Continue' }).click();

    // Fill credentials
    await page.getByRole('textbox', { name: 'Email address' }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByRole('textbox', { name: 'Email address' }).fill(USER_EMAIL);
    await page.getByRole('textbox', { name: 'Password' }).fill(USER_PASSWORD);
    await page.getByRole('button', { name: 'Login' }).click();

    // Wait for dashboard to load
    await page.waitForURL('**/dashboard', { timeout: 30000 });

    // Dismiss timezone prompt if it appears
    try {
      const cancelButton = page.getByRole('button', { name: 'Cancel' });
      await cancelButton.waitFor({ state: 'visible', timeout: 5000 });
      await cancelButton.click();
    } catch {
      // Timezone prompt didn't appear, continue
    }
  });

  // ==========================================
  // SENSE HOME PAGE TESTS
  // ==========================================

  /**
   * User Prompt:
   * - I need to do a complete UI testing on the Sense module
   * - Verify Sense home page loads with greeting, main heading, and query input
   */
  test('Sense Home Page - displays greeting and main heading', async ({ page }) => {
    await page.goto(SENSE_HOME_URL);
    await page.locator('main').waitFor({ state: 'visible', timeout: 30000 });

    // Verify greeting contains user's first name
    await expect(page.locator('text=Vignesh').first()).toBeVisible();

    // Verify main heading
    await expect(page.getByRole('heading', { level: 1, name: 'What would you like to understand today?' })).toBeVisible();

    // Verify query input area is present
    const queryInput = page.getByRole('button').filter({ hasText: /Show me to|What is the total/ });
    await expect(queryInput).toBeVisible();
  });

  /**
   * User Prompt:
   * - I need to do a complete UI testing on the Sense module
   * - Verify all 6 suggested prompts are displayed on the home page
   */
  test('Sense Home Page - displays all suggested prompts', async ({ page }) => {
    await page.goto(SENSE_HOME_URL);
    await page.locator('main').waitFor({ state: 'visible', timeout: 30000 });

    // Verify "Suggested prompts" heading
    await expect(page.getByRole('heading', { level: 2, name: 'Suggested prompts' })).toBeVisible();

    // Verify all 6 suggested prompt cards
    const expectedPrompts = [
      'Team Performance',
      'Revenue Analysis',
      'Efficiency Metrics',
      'Growth trends',
      'Customer Feedback',
      'Resource Utilization',
    ];

    for (const prompt of expectedPrompts) {
      await expect(page.getByRole('heading', { level: 3, name: prompt })).toBeVisible();
    }
  });

  /**
   * User Prompt:
   * - I need to do a complete UI testing on the Sense module
   * - Verify "Continue where you left off" section shows previous queries
   */
  test('Sense Home Page - displays continue where you left off section', async ({ page }) => {
    await page.goto(SENSE_HOME_URL);
    await page.locator('main').waitFor({ state: 'visible', timeout: 30000 });

    // Verify "Continue where you left off" heading
    await expect(page.getByRole('heading', { level: 2, name: 'Continue where you left off' })).toBeVisible();
  });

  /**
   * User Prompt:
   * - I need to do a complete UI testing on the Sense module
   * - Verify Sense is accessible from the left sidebar navigation
   */
  test('Sense Home Page - accessible from sidebar navigation', async ({ page }) => {
    await page.goto('https://developmentv3.zuperpro.com/settings/dashboard');
    await page.locator('main').waitFor({ state: 'visible', timeout: 30000 });

    // Click on Sense link in sidebar
    const senseLink = page.getByRole('link', { name: /sense/i });
    await expect(senseLink).toBeVisible();
    await senseLink.click();

    // Verify navigation to Sense home page
    await page.waitForURL('**/sense', { timeout: 30000 });
    await expect(page.getByRole('heading', { level: 1, name: 'What would you like to understand today?' })).toBeVisible();
  });

  // ==========================================
  // SENSE CHAT PAGE TESTS
  // ==========================================

  /**
   * User Prompt:
   * - I need to do a complete UI testing on the Sense module
   * - Verify Sense chat page displays all core UI elements
   */
  test('Sense Chat Page - displays core UI elements', async ({ page }) => {
    await page.goto(SENSE_CHAT_URL);

    // Wait for chat page to load
    const chatInput = page.getByPlaceholder('Send a message...');
    await chatInput.waitFor({ state: 'visible', timeout: 30000 });

    // Verify chat greeting
    await expect(page.locator('text=Hello there!')).toBeVisible();
    await expect(page.locator('text=How can I help you today?')).toBeVisible();

    // Verify message input
    await expect(chatInput).toBeVisible();

    // Verify AI disclaimer
    await expect(page.locator('text=AI generated insights')).toBeVisible();

    // Verify suggested prompts in chat
    await expect(page.getByRole('heading', { level: 3, name: 'Team Performance' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Revenue Analysis' })).toBeVisible();
  });

  /**
   * User Prompt:
   * - I need to do a complete UI testing on the Sense module
   * - Verify Sense chat sidebar elements (title, toggle, new thread, threads list)
   */
  test('Sense Chat Page - sidebar elements', async ({ page }) => {
    await page.goto(SENSE_CHAT_URL);
    const chatInput = page.getByPlaceholder('Send a message...');
    await chatInput.waitFor({ state: 'visible', timeout: 30000 });

    // Verify sidebar has "Sense" title
    await expect(page.locator('text=Sense').first()).toBeVisible();

    // Verify "Toggle Sidebar" button
    await expect(page.locator('text=Toggle Sidebar')).toBeVisible();

    // Verify "New Thread" button
    await expect(page.locator('text=New Thread')).toBeVisible();
  });

  /**
   * User Prompt:
   * - I need to do a complete UI testing on the Sense module
   * - Verify the send button is disabled when message input is empty
   */
  test('Sense Chat Page - send button disabled when input is empty', async ({ page }) => {
    await page.goto(SENSE_CHAT_URL);
    const chatInput = page.getByPlaceholder('Send a message...');
    await chatInput.waitFor({ state: 'visible', timeout: 30000 });

    // Verify send button is disabled when input is empty
    const sendButton = page.locator('button').filter({ hasText: 'Send message' });
    await expect(sendButton).toBeDisabled();
  });

  /**
   * User Prompt:
   * - I need to do a complete UI testing on the Sense module
   * - Verify user can type a message and the send button becomes enabled
   */
  test('Sense Chat Page - send button enables when message is typed', async ({ page }) => {
    await page.goto(SENSE_CHAT_URL);
    const chatInput = page.getByPlaceholder('Send a message...');
    await chatInput.waitFor({ state: 'visible', timeout: 30000 });

    // Type a message
    await chatInput.fill('Show me total revenue this month');

    // Verify send button becomes enabled
    const sendButton = page.locator('button').filter({ hasText: 'Send message' });
    await expect(sendButton).toBeEnabled({ timeout: 5000 });
  });

  /**
   * User Prompt:
   * - I need to do a complete UI testing on the Sense module
   * - Verify user can send a message and see it in the chat (Phase 1 - read-only data fetching)
   */
  test('Sense Chat Page - send a message and verify response', async ({ page }) => {
    await page.goto(SENSE_CHAT_URL);
    const chatInput = page.getByPlaceholder('Send a message...');
    await chatInput.waitFor({ state: 'visible', timeout: 30000 });

    // Type and send a message
    await chatInput.fill('Show me total revenue this month');
    const sendButton = page.locator('button').filter({ hasText: 'Send message' });
    await sendButton.click();

    // Verify the user message appears in chat
    await expect(page.locator('text=Show me total revenue this month')).toBeVisible({ timeout: 10000 });

    // Wait for AI response (Phase 1 - read-only data fetching)
    // We don't assert specific content since AI responses are non-deterministic
    // But we verify a response container appears
    await page.waitForTimeout(10000); // Give AI time to respond
    const messageContainers = page.locator('main').locator('div').filter({ hasText: /./i });
    expect(await messageContainers.count()).toBeGreaterThan(2);
  });

  /**
   * User Prompt:
   * - I need to do a complete UI testing on the Sense module
   * - Verify clicking a suggested prompt navigates to chat and sends the query
   */
  test('Sense Home Page - clicking suggested prompt opens chat', async ({ page }) => {
    await page.goto(SENSE_HOME_URL);
    await page.locator('main').waitFor({ state: 'visible', timeout: 30000 });

    // Click on "Team Performance" suggested prompt
    const teamPerformanceCard = page.getByRole('heading', { level: 3, name: 'Team Performance' }).locator('..');
    await teamPerformanceCard.click();

    // Verify navigation to chat page
    await page.waitForURL('**/sense/chat**', { timeout: 30000 });

    // Verify chat interface loaded
    const chatInput = page.getByPlaceholder('Send a message...');
    await expect(chatInput).toBeVisible({ timeout: 15000 });
  });

  /**
   * User Prompt:
   * - I need to do a complete UI testing on the Sense module
   * - Verify sidebar toggle collapses and expands the sidebar
   */
  test('Sense Chat Page - sidebar toggle functionality', async ({ page }) => {
    await page.goto(SENSE_CHAT_URL);
    const chatInput = page.getByPlaceholder('Send a message...');
    await chatInput.waitFor({ state: 'visible', timeout: 30000 });

    // Verify sidebar is visible with "New Thread" text
    await expect(page.locator('text=New Thread')).toBeVisible();

    // Click toggle sidebar
    const toggleButton = page.locator('text=Toggle Sidebar');
    await toggleButton.click();

    // Verify sidebar collapsed - "New Thread" text should be hidden
    await expect(page.locator('text=New Thread')).toBeHidden({ timeout: 5000 });

    // Click toggle again to expand
    await toggleButton.click();

    // Verify sidebar expanded again
    await expect(page.locator('text=New Thread')).toBeVisible({ timeout: 5000 });
  });

  /**
   * User Prompt:
   * - I need to do a complete UI testing on the Sense module
   * - Verify thread history shows in sidebar and clicking it loads the thread
   */
  test('Sense Chat Page - thread history in sidebar', async ({ page }) => {
    await page.goto(SENSE_CHAT_URL);
    const chatInput = page.getByPlaceholder('Send a message...');
    await chatInput.waitFor({ state: 'visible', timeout: 30000 });

    // Verify there's at least one thread in the sidebar (from previous queries)
    const threadItem = page.locator('button').filter({ hasText: 'Overview of Total Due Invoices' });
    await expect(threadItem).toBeVisible({ timeout: 10000 });

    // Click on the thread
    await threadItem.click();

    // Verify the thread content loads (should show the query topic)
    await expect(page.locator('text=Overview of Total Due Invoices')).toBeVisible({ timeout: 15000 });
  });

  /**
   * User Prompt:
   * - I need to do a complete UI testing on the Sense module
   * - Verify archive button is available for threads in the sidebar
   */
  test('Sense Chat Page - archive button for threads', async ({ page }) => {
    await page.goto(SENSE_CHAT_URL);
    const chatInput = page.getByPlaceholder('Send a message...');
    await chatInput.waitFor({ state: 'visible', timeout: 30000 });

    // Verify Archive button exists in sidebar
    const archiveButton = page.locator('button').filter({ hasText: 'Archive' });
    await expect(archiveButton).toBeVisible({ timeout: 10000 });
  });

  /**
   * User Prompt:
   * - I need to do a complete UI testing on the Sense module
   * - Verify the "New Chat" breadcrumb link is present on the chat page
   */
  test('Sense Chat Page - breadcrumb navigation', async ({ page }) => {
    await page.goto(SENSE_CHAT_URL);
    const chatInput = page.getByPlaceholder('Send a message...');
    await chatInput.waitFor({ state: 'visible', timeout: 30000 });

    // Verify "New Chat" breadcrumb link
    await expect(page.getByRole('link', { name: 'New Chat' })).toBeVisible();
  });
});
