import { test, expect } from '@stablyai/playwright-test';
import { z } from 'zod';
import {
  loginAndNavigateToSense,
  sendSensePrompt,
} from './helpers/sense.helper';

/**
 * ============================================================================
 * LAYER 3: AI SEMANTIC EVALUATION TESTS (Eval API + Prompt Engineering)
 * ============================================================================
 * These tests evaluate the QUALITY and RELEVANCE of AI responses using
 * Stably's extract() and aiAssert() as an "eval layer" over the LLM output.
 *
 * STRATEGY - Structure + Semantic Combined:
 * 1. Send a known prompt to Sense
 * 2. Use page.extract() to pull structured data from the AI's response
 * 3. Validate the extracted data against semantic criteria:
 *    - Response relevance (does it answer the question?)
 *    - Data type correctness (numbers are numbers, dates are dates)
 *    - Format appropriateness (tables for lists, cards for metrics)
 *    - Contextual awareness (uses Zuper domain terms correctly)
 * 4. Use aiAssert() for visual/layout quality checks
 *
 * WHY THIS WORKS FOR AI TESTING:
 * - We don't assert exact text (LLM outputs vary)
 * - We assert semantic PROPERTIES of the response
 * - This is the "eval API" approach applied to UI testing
 * ============================================================================
 */

test.describe('Sense AI - Layer 3: Semantic Evaluation Tests', () => {
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
   * - Test that a count-based query returns a response that contains a numeric value
   *   and references the correct time period. Use extract() as an eval API to validate
   *   the AI's response semantics.
   */
  test('EVAL: Count query returns numeric data with correct time context', async ({
    page,
  }) => {
    await test.step('Send count-based query', async () => {
      await sendSensePrompt({
        page,
        prompt: 'How many jobs were created this week?',
        waitTimeMs: 45000,
      });
    });

    await test.step('Extract and evaluate response semantics', async () => {
      // Use extract() as an "eval API" to pull structured semantics from the response
      const ResponseEval = z.object({
        containsNumericAnswer: z.boolean().describe('Does the response contain a specific number for jobs created?'),
        mentionsTimePeriod: z.boolean().describe('Does the response reference "this week" or specific dates?'),
        responseType: z.enum(['data_answer', 'clarifying_question', 'error', 'other']).describe('What type of response did the AI give?'),
        hasDataCard: z.boolean().describe('Is there a structured data card or metric display in the response?'),
      });

      const evaluation = await page.extract(
        'Analyze the AI response in the main content area (not the sidebar). ' +
        'Determine: (1) Does it contain a specific number? (2) Does it reference a time period? ' +
        '(3) Is it a data answer, clarifying question, error, or other? ' +
        '(4) Is there a structured data card with metrics?',
        { schema: ResponseEval }
      );

      // EVAL ASSERTIONS: Semantic properties, not exact text
      expect(evaluation.containsNumericAnswer).toBe(true);
      expect(evaluation.mentionsTimePeriod).toBe(true);
      expect(evaluation.responseType).toBe('data_answer');
      expect(evaluation.hasDataCard).toBe(true);
    });
  });

  /**
   * User Prompt:
   * - Test that a ranking/list query returns a properly formatted table response
   *   with entity names and monetary values. Validate using extract() eval.
   */
  test('EVAL: Ranking query returns table with entities and values', async ({
    page,
  }) => {
    await test.step('Send ranking query', async () => {
      await sendSensePrompt({
        page,
        prompt: 'Show me the top 5 customers by revenue',
        waitTimeMs: 45000,
      });
    });

    await test.step('Extract and evaluate table response', async () => {
      const TableEval = z.object({
        hasTable: z.boolean().describe('Is there a data table in the response?'),
        columnCount: z.number().describe('How many columns does the table have?'),
        rowCount: z.number().describe('How many data rows (excluding header) in the table?'),
        containsMonetaryValues: z.boolean().describe('Do table cells contain dollar amounts or monetary figures?'),
        containsEntityNames: z.boolean().describe('Do table cells contain customer/entity names?'),
        hasNarrativeSummary: z.boolean().describe('Is there a text narrative summarizing the data above or below the table?'),
      });

      const evaluation = await page.extract(
        'Analyze the AI response in the main chat area. Look at the table if present. ' +
        'Count columns and data rows (not header). Check if cells have dollar amounts and entity names. ' +
        'Also check if there is a text summary paragraph accompanying the table.',
        { schema: TableEval }
      );

      // EVAL ASSERTIONS: Response format properties
      expect(evaluation.hasTable).toBe(true);
      expect(evaluation.columnCount).toBeGreaterThanOrEqual(2);
      expect(evaluation.rowCount).toBeGreaterThanOrEqual(1);
      expect(evaluation.containsMonetaryValues).toBe(true);
      expect(evaluation.containsEntityNames).toBe(true);
      expect(evaluation.hasNarrativeSummary).toBe(true);
    });
  });

  /**
   * User Prompt:
   * - Test that an ambiguous prompt triggers the AI to ask a clarifying question
   *   rather than providing a potentially wrong answer. This tests the AI's
   *   judgment and safety behavior.
   */
  test('EVAL: Ambiguous prompt triggers clarifying question', async ({
    page,
  }) => {
    await test.step('Send ambiguous prompt', async () => {
      await sendSensePrompt({
        page,
        prompt: 'How is the team doing?',
        waitTimeMs: 45000,
      });
    });

    await test.step('Evaluate AI response behavior', async () => {
      const ClarificationEval = z.object({
        responseType: z.enum(['data_answer', 'clarifying_question', 'error', 'other'])
          .describe('Is the AI asking a clarifying question, or giving a direct data answer?'),
        offersOptions: z.boolean()
          .describe('Does the response offer multiple options or dimensions to choose from (e.g., revenue, completion rate, workload)?'),
        isRelevantToZuper: z.boolean()
          .describe('Does the response reference Zuper-specific concepts like jobs, revenue, technicians, or field service?'),
      });

      const evaluation = await page.extract(
        'Analyze the AI response in the main chat area. ' +
        'Determine if it asks the user to clarify (clarifying question) or directly provides data. ' +
        'Check if it offers specific options. Check if it uses Zuper domain terminology.',
        { schema: ClarificationEval }
      );

      // EVAL ASSERTIONS: AI should seek clarification on vague prompts
      expect(evaluation.responseType).toBe('clarifying_question');
      expect(evaluation.offersOptions).toBe(true);
      expect(evaluation.isRelevantToZuper).toBe(true);
    });
  });

  /**
   * User Prompt:
   * - Test multi-turn context retention: send a query, then a follow-up that
   *   depends on the first answer. The AI should maintain context.
   */
  test('EVAL: Multi-turn context retention across follow-up messages', async ({
    page,
  }) => {
    await test.step('Send initial query', async () => {
      await sendSensePrompt({
        page,
        prompt: 'How many jobs were created last month?',
        waitTimeMs: 45000,
      });
    });

    await test.step('Send context-dependent follow-up', async () => {
      await sendSensePrompt({
        page,
        prompt: 'Now compare that with the month before',
        waitTimeMs: 45000,
      });
    });

    await test.step('Evaluate context retention', async () => {
      const ContextEval = z.object({
        referencesMultiplePeriods: z.boolean()
          .describe('Does the latest response reference or compare two different time periods?'),
        maintainedJobContext: z.boolean()
          .describe('Does the latest response still discuss jobs (not switching to a different topic)?'),
        providesComparison: z.boolean()
          .describe('Does the response include comparison language or comparative data (increase, decrease, vs, compared to)?'),
      });

      const evaluation = await page.extract(
        'Look at the LAST/MOST RECENT AI response in the chat thread (the one furthest down). ' +
        'Determine if it compares two time periods, if it discusses jobs, ' +
        'and if it provides comparison language or comparative data.',
        { schema: ContextEval }
      );

      // EVAL: Follow-up should show context awareness
      expect(evaluation.maintainedJobContext).toBe(true);
      expect(evaluation.referencesMultiplePeriods).toBe(true);
    });
  });

  /**
   * User Prompt:
   * - Use aiAssert to visually evaluate that the Sense response is well-formatted
   *   with proper visual hierarchy — headings, bold text, structured data presentation
   */
  test('EVAL: Visual response quality with proper formatting hierarchy', async ({
    page,
  }) => {
    await test.step('Send query that should produce rich response', async () => {
      await sendSensePrompt({
        page,
        prompt: 'Show me the top 5 customers by revenue',
        waitTimeMs: 45000,
      });
    });

    await test.step('Visually evaluate response quality', async () => {
      // Use aiAssert for visual/layout quality — things hard to express in code
      await expect(page.locator('main')).aiAssert(
        'The AI response area contains: ' +
        '(1) A text narrative with bold/emphasized key data points, ' +
        '(2) A structured data table with clear column headers and aligned data, ' +
        '(3) Action buttons (Copy, Refresh) below the response, ' +
        '(4) A message input field at the bottom for follow-up messages',
        { timeout: 15000 }
      );
    });
  });
});
