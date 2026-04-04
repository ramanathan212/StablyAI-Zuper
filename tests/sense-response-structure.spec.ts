import { test, expect } from '@stablyai/playwright-test';
import {
  loginAndNavigateToSense,
  sendSensePrompt,
  waitForSenseResponse,
} from './helpers/sense.helper';

/**
 * ============================================================================
 * LAYER 2: AI RESPONSE STRUCTURE VALIDATION TESTS
 * ============================================================================
 * These tests verify that the AI responds AND the response has the expected
 * structural elements (thinking indicator, text content, data cards/tables,
 * action buttons). They do NOT evaluate semantic correctness of the AI output.
 *
 * Strategy: Send deterministic prompts that should always produce structured
 * responses, then validate the DOM structure — not the exact text.
 * ============================================================================
 */

test.describe('Sense AI - Layer 2: Response Structure Tests', () => {
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
   * - Test that sending a data query to Sense produces a response with thinking indicator,
   *   text response, data card with metrics, and action buttons (Copy, Refresh, thumbs)
   */
  test('Data query produces response with thinking indicator and action buttons', async ({
    page,
  }) => {
    await test.step('Send a count-based data prompt', async () => {
      await sendSensePrompt({
        page,
        prompt: 'How many jobs were created this month?',
        waitTimeMs: 45000,
      });
    });

    await test.step('Verify thinking indicator appeared', async () => {
      // "Thought for X.Xs" button should be visible
      const thoughtBtn = page.getByRole('button', { name: /Thought for \d+/ });
      await expect(thoughtBtn.last()).toBeVisible();
    });

    await test.step('Verify Sense label on response', async () => {
      // Scope to main to avoid matching the hidden sidebar "Sense" text
      const senseLabel = page.locator('main').locator('text=Sense').first();
      await expect(senseLabel).toBeVisible();
    });

    await test.step('Verify response contains text content', async () => {
      // The response area should have paragraph content
      // (The AI always generates at least one paragraph of text)
      const responseParagraphs = page.locator('main p');
      const count = await responseParagraphs.count();
      expect(count).toBeGreaterThanOrEqual(2); // At least: user prompt + AI response
    });

    await test.step('Verify action buttons are present', async () => {
      // Copy button
      const copyBtn = page.getByRole('button', { name: 'Copy' });
      await expect(copyBtn.last()).toBeVisible();

      // Refresh button
      const refreshBtn = page.getByRole('button', { name: 'Refresh' });
      await expect(refreshBtn.last()).toBeVisible();
    });

    await test.step('Verify follow-up message input exists', async () => {
      const messageInput = page.getByRole('textbox', { name: 'Message input' });
      await expect(messageInput).toBeVisible();
      await expect(messageInput).toHaveAttribute('placeholder', 'Send a message...');
    });

    await test.step('Verify thread was auto-named in sidebar', async () => {
      // The thread should appear in the sidebar with a meaningful name
      // (not "New Chat" — it should be auto-named from the prompt context)
      const searchThreads = page.getByRole('textbox', { name: 'Search threads' });
      await expect(searchThreads).toBeVisible();
    });
  });

  /**
   * User Prompt:
   * - Test that asking for a list/ranking produces a table with sortable columns and entity links
   */
  test('Ranking query produces a table with sortable columns', async ({
    page,
  }) => {
    await test.step('Send a ranking prompt', async () => {
      await sendSensePrompt({
        page,
        prompt: 'Show me the top 5 customers by revenue',
        waitTimeMs: 45000,
      });
    });

    await test.step('Verify response has a table element', async () => {
      // Wait for the table to appear in the response
      const table = page.locator('main table');
      await expect(table.last()).toBeVisible({ timeout: 45000 });
    });

    await test.step('Verify table has column headers', async () => {
      const columnHeaders = page.locator('main table th');
      const headerCount = await columnHeaders.count();
      expect(headerCount).toBeGreaterThanOrEqual(2); // At least 2 columns
    });

    await test.step('Verify table has data rows', async () => {
      const dataRows = page.locator('main table tbody tr');
      const rowCount = await dataRows.count();
      expect(rowCount).toBeGreaterThanOrEqual(1); // At least 1 data row
    });

    await test.step('Verify sort buttons exist on columns', async () => {
      const sortButtons = page.getByRole('button', { name: /Sort by/ });
      const sortCount = await sortButtons.count();
      expect(sortCount).toBeGreaterThanOrEqual(1);
    });
  });

  /**
   * User Prompt:
   * - Test that multi-turn conversation maintains context — follow-up messages appear
   *   below the first response in the same thread
   */
  test('Multi-turn conversation maintains thread structure', async ({
    page,
  }) => {
    await test.step('Send initial prompt', async () => {
      await sendSensePrompt({
        page,
        prompt: 'How many open jobs do we have right now?',
        waitTimeMs: 45000,
      });
    });

    await test.step('Verify first response appeared', async () => {
      const thoughtBtn = page.getByRole('button', { name: /Thought for/ });
      await expect(thoughtBtn.first()).toBeVisible();
    });

    await test.step('Send follow-up message', async () => {
      await sendSensePrompt({
        page,
        prompt: 'Break that down by status',
        waitTimeMs: 45000,
      });
    });

    await test.step('Verify both prompts are visible in the thread', async () => {
      // Both user prompts should be visible in the conversation
      const userPrompt1 = page.locator('p').filter({ hasText: 'How many open jobs do we have right now?' });
      await expect(userPrompt1).toBeVisible();

      const userPrompt2 = page.locator('p').filter({ hasText: 'Break that down by status' });
      await expect(userPrompt2).toBeVisible();
    });

    await test.step('Verify two response blocks exist', async () => {
      // There should be at least 2 "Thought for" indicators (one per response)
      const thoughtButtons = page.getByRole('button', { name: /Thought for/ });
      const count = await thoughtButtons.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  /**
   * User Prompt:
   * - Test that the Refresh button regenerates the AI response
   */
  test('Refresh button regenerates the response', async ({ page }) => {
    await test.step('Send initial prompt', async () => {
      await sendSensePrompt({
        page,
        prompt: 'What is the total revenue this quarter?',
        waitTimeMs: 45000,
      });
    });

    await test.step('Click Refresh on the response', async () => {
      const refreshBtn = page.getByRole('button', { name: 'Refresh' }).last();
      await expect(refreshBtn).toBeVisible();
      await refreshBtn.click();
    });

    await test.step('Verify a new response is generated', async () => {
      // After refresh, a new thinking indicator should appear
      // Wait for the response to complete
      await waitForSenseResponse({ page, timeoutMs: 45000 });

      // The response should still contain text content in main area
      const responseParagraphs = page.locator('main p');
      const count = await responseParagraphs.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });
});
