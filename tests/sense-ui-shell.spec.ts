import { test, expect } from '@stablyai/playwright-test';
import {
  loginAndNavigateToSense,
  dismissPopups,
} from './helpers/sense.helper';

/**
 * ============================================================================
 * LAYER 1: DETERMINISTIC UI SHELL TESTS
 * ============================================================================
 * These tests validate the Sense page structure, navigation, and static UI
 * elements using pure Playwright assertions. No AI/LLM dependency.
 *
 * Focus: Page loads correctly, all UI components render, navigation works,
 * thread management UI is functional.
 * ============================================================================
 */

test.describe('Sense AI - Layer 1: UI Shell Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigateToSense({
      page,
      companyName: process.env.company_name!,
      email: process.env.user_name!,
      password: process.env.password!,
    });
  });

  /**
   * User Prompt:
   * - url - https://staging-next.zuperpro.com/jobs/ef859616-4511-42e5-9c08-87be68f609cd/details
   * - login using environment variables
   * - lands in dashboard page
   * - switch to sense page
   * - sense is an AI agentic tool incorporate with zuper SaaS based application.
   * - what kind testing prompt can send and retrieve the expected results how can we plan this testing
   *   since this cannot be done using traditional way of testing as it involve AI and LLM
   *   can we smartly create test plan and test cases with prompts and newly evolving tools
   *   such as eval api and prompt engineering
   */
  test('Sense home page renders all core UI elements', async ({ page }) => {
    await test.step('Verify page URL and greeting', async () => {
      await expect(page).toHaveURL(/\/sense$/);

      // Personalized greeting should be visible
      const greeting = page.locator('p').filter({ hasText: /Good (morning|afternoon|evening)/ });
      await expect(greeting).toBeVisible({ timeout: 10000 });
    });

    await test.step('Verify main heading', async () => {
      const heading = page.getByRole('heading', {
        name: 'What would you like to understand today?',
        level: 1,
      });
      await expect(heading).toBeVisible();
    });

    await test.step('Verify "Continue where you left off" section', async () => {
      const continueSection = page.getByRole('heading', {
        name: 'Continue where you left off',
        level: 2,
      });
      await expect(continueSection).toBeVisible();
    });

    await test.step('Verify suggested prompts section', async () => {
      const suggestedHeading = page.getByRole('heading', {
        name: 'Suggested prompts',
        level: 2,
      });
      await expect(suggestedHeading).toBeVisible();

      // Verify specific suggested prompt categories exist
      const expectedPrompts = [
        'Team Performance',
        'Revenue Analysis',
        'Efficiency Metrics',
        'Revenue Growth Trends',
        'Customer Feedback',
        'Resource Utilization',
      ];

      for (const promptName of expectedPrompts) {
        const promptCard = page.getByRole('heading', { name: promptName, level: 3 });
        await expect(promptCard).toBeVisible();
      }
    });

    await test.step('Verify beta notice', async () => {
      const betaNotice = page.getByRole('button', {
        name: /Sense is in beta/i,
      });
      await expect(betaNotice).toBeVisible();
    });
  });

  /**
   * User Prompt:
   * - Verify the Sense prompt area has a pre-filled dynamic suggestion and submitting it creates a thread
   */
  test.fixme('Prompt area has dynamic suggestion and submitting creates a thread', async ({ page }) => {
    await test.step('Verify prompt area has a dynamic suggestion button', async () => {
      // The Sense home page shows a dynamic prompt suggestion that changes on each load.
      // The button is inside the main area, below the heading.
      const mainArea = page.locator('main');
      const allButtons = mainArea.locator('button');
      const buttonCount = await allButtons.count();
      expect(buttonCount).toBeGreaterThanOrEqual(1);
    });

    await test.step('Submit the suggested prompt and verify thread creation', async () => {
      // Click the suggested prompt area — it directly submits and creates a thread
      await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        if (!h1) return;
        let container = h1.parentElement;
        while (container && !container.querySelector(':scope > button')) {
          container = container.parentElement;
        }
        const btn = container?.querySelector(':scope > button') as HTMLElement | null;
        if (btn) btn.click();
      });

      // Should navigate to a thread
      await expect(page).toHaveURL(/\/sense\/chat\/thread_/, { timeout: 15000 });
    });

    await test.step('Verify thread has a follow-up message input', async () => {
      // The thread view should have a message input for follow-up questions
      const messageInput = page.getByRole('textbox', { name: 'Message input' });
      await expect(messageInput).toBeVisible({ timeout: 45000 });
      await expect(messageInput).toHaveAttribute('placeholder', 'Send a message...');
    });
  });

  /**
   * User Prompt:
   * - Verify Sense sidebar navigation is active when on Sense page
   */
  test('Sense sidebar link is active when on Sense page', async ({ page }) => {
    await test.step('Verify Sense nav link is present and active', async () => {
      // The Sense link should exist in sidebar with /sense URL
      const senseLink = page.locator('a[href="/sense"]');
      await expect(senseLink).toBeVisible();
    });

    await test.step('Verify can navigate back to dashboard and return', async () => {
      // Navigate to dashboard
      const dashboardLink = page.locator('a[href="/dashboard"]');
      await dashboardLink.click();
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

      await dismissPopups({ page });

      // Navigate back to Sense
      const senseLink = page.locator('a[href="/sense"]');
      await senseLink.click();
      await expect(page).toHaveURL(/\/sense/, { timeout: 15000 });
    });
  });

  /**
   * User Prompt:
   * - Verify clicking a suggested prompt creates a new chat thread and shows the thread UI
   */
  test('Clicking a suggested prompt creates a chat thread with proper UI', async ({
    page,
  }) => {
    await test.step('Click a suggested prompt', async () => {
      const teamPerfPrompt = page.getByRole('button', {
        name: 'Team Performance Operations',
      });
      await teamPerfPrompt.click();
    });

    await test.step('Verify thread URL pattern', async () => {
      await expect(page).toHaveURL(/\/sense\/chat\/thread_/, { timeout: 15000 });
    });

    await test.step('Verify thread UI elements', async () => {
      // Sidebar with thread list
      const searchThreads = page.getByRole('textbox', { name: 'Search threads' });
      await expect(searchThreads).toBeVisible({ timeout: 10000 });

      // New Thread button in sidebar
      const newThreadBtn = page.getByRole('button', { name: 'New Thread' });
      await expect(newThreadBtn).toBeVisible();

      // Breadcrumb navigation
      const breadcrumb = page.getByRole('navigation', { name: 'breadcrumb' });
      await expect(breadcrumb).toBeVisible();

      // Message input for follow-up
      const messageInput = page.getByRole('textbox', { name: 'Message input' });
      await expect(messageInput).toBeVisible({ timeout: 45000 });

      // AI disclaimer text
      const disclaimer = page.locator('text=AI generated insights. Verify before taking action');
      await expect(disclaimer).toBeVisible();
    });
  });
});
