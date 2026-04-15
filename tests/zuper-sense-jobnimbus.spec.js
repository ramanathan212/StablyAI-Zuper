/**
 * Zuper Sense - JobNimbus Prompts Automation
 *
 * Logs into stagingv3.zuperpro.com, navigates to Zuper Sense,
 * creates a "job nimbus" chat, and sequentially executes all 63 prompts
 * from the JobNimbus Excel validation sheet.
 * Updates the Excel file with pass/fail status after each prompt.
 *
 * Run with:
 *   npx playwright test tests/zuper-sense-jobnimbus.spec.js
 *   npx playwright test tests/zuper-sense-jobnimbus.spec.js --ui
 *   npx playwright test tests/zuper-sense-jobnimbus.spec.js --headed
 */

const { test, expect } = require('@playwright/test');
const XLSX = require('xlsx');
const { copyFileSync, existsSync } = require('fs');
const { resolve } = require('path');

const PROJECT_ROOT = resolve(__dirname, '..');
const EXCEL_PATH = resolve(PROJECT_ROOT, '.context/attachments/JobNimbus_Insights_Zuper_Sense_Validation.xlsx');

// Configuration
const BASE_URL = 'https://stagingv3.zuperpro.com';
const CREDENTIALS = {
  companyName: process.env.company_name || 'sofyaizuper',
  email: process.env.user_name || 'ramanathan.m@zuper.co',
  password: process.env.password || 'Test@123',
};

const SENSE_RESPONSE_TIMEOUT = 120000; // 2 minutes for AI response

/**
 * Parse prompts from the Excel file, filtering out section headers.
 */
function parsePrompts() {
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const prompts = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[3]) continue;

    const kpi = String(row[0] || '').trim();
    const prompt = String(row[3] || '').trim();
    const outputType = String(row[4] || '').trim();

    // Skip section headers (where all columns have the same value)
    if (/^\d+\.\s/.test(kpi) && kpi === prompt) continue;
    // Skip sub-section headers (like "2.1 Leads / Close Rate")
    if (/^\d+\.\d+\s/.test(kpi) && kpi === prompt) continue;

    prompts.push({
      rowIndex: i + 1,
      kpi,
      prompt,
      outputType,
    });
  }

  return prompts;
}

/**
 * Update the Excel file with pass/fail status for a specific prompt.
 */
function updateExcelStatus(rowIndex, status, notes) {
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const passFailCell = XLSX.utils.encode_cell({ r: rowIndex - 1, c: 5 });
  const notesCell = XLSX.utils.encode_cell({ r: rowIndex - 1, c: 6 });

  sheet[passFailCell] = { t: 's', v: status };
  sheet[notesCell] = { t: 's', v: notes };

  XLSX.writeFile(workbook, EXCEL_PATH);
}

/**
 * Dismiss common popups (timezone, notifications, etc.)
 */
async function dismissPopups(page) {
  await page.waitForTimeout(1500);

  try {
    const timezoneHeading = page.getByRole('heading', { name: 'Your timezone has changed' });
    if (await timezoneHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.getByRole('button', { name: 'Cancel' }).click();
      await timezoneHeading.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
  } catch (_) {}

  try {
    const noThanks = page.getByRole('button', { name: 'No, thanks' });
    if (await noThanks.isVisible({ timeout: 2000 }).catch(() => false)) {
      await noThanks.click();
      await page.waitForTimeout(500);
    }
  } catch (_) {}

  try {
    const trialModal = page.locator('text=Trial Period Ending Soon');
    if (await trialModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  } catch (_) {}

  try {
    const backdrop = page.locator('.cdk-overlay-backdrop');
    if (await backdrop.isVisible({ timeout: 1000 }).catch(() => false)) {
      await backdrop.click({ force: true });
      await page.waitForTimeout(500);
    }
  } catch (_) {}
}

/**
 * Login to Zuper staging
 */
async function login(page) {
  await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded' });

  const loginFormOrRedirect = await Promise.race([
    page.getByRole('textbox', { name: 'Company Name' })
      .waitFor({ state: 'visible', timeout: 15000 })
      .then(() => 'login_form'),
    page.waitForURL(/\/(dashboard|sense|jobs)/, { timeout: 15000 })
      .then(() => 'redirected'),
  ]).catch(() => 'unknown');

  if (loginFormOrRedirect === 'login_form') {
    const companyInput = page.getByRole('textbox', { name: 'Company Name' });
    await companyInput.fill(CREDENTIALS.companyName);

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find(function(b) { return b.textContent && b.textContent.trim() === 'Continue'; });
      if (btn) btn.click();
    });

    const emailInput = page.getByRole('textbox', { name: 'Email address' });
    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await emailInput.fill(CREDENTIALS.email);

    const passwordInput = page.getByRole('textbox', { name: 'Password Forgot password?' });
    await passwordInput.fill(CREDENTIALS.password);

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find(function(b) { return b.textContent && b.textContent.trim() === 'Login'; });
      if (btn) btn.click();
    });

    await page.waitForURL('**/dashboard', { timeout: 30000 });
  }

  await dismissPopups(page);
}

/**
 * Wait for Sense AI response to complete.
 */
async function waitForResponse(page, expectedMinCount, timeoutMs) {
  expectedMinCount = expectedMinCount || 1;
  timeoutMs = timeoutMs || SENSE_RESPONSE_TIMEOUT;

  const thoughtButton = page.getByRole('button', { name: /Thought for/ });
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const count = await thoughtButton.count();
    if (count >= expectedMinCount) break;
    await page.waitForTimeout(2000);
  }

  const finalCount = await thoughtButton.count();
  if (finalCount < expectedMinCount) {
    throw new Error('Timeout waiting for AI response (expected ' + expectedMinCount + ', got ' + finalCount + ')');
  }

  await thoughtButton.last().waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(2000);
}

/**
 * Send a prompt in the Sense chat and wait for response.
 */
async function sendPrompt(page, prompt) {
  const thoughtButton = page.getByRole('button', { name: /Thought for/ });
  const existingCount = await thoughtButton.count();

  const messageInput = page.getByRole('textbox', { name: 'Message input' });
  await messageInput.waitFor({ state: 'visible', timeout: 15000 });
  await messageInput.fill(prompt);
  await page.keyboard.press('Enter');

  const currentUrl = page.url();
  if (currentUrl.includes('/chat/new')) {
    await page.waitForURL('**/sense/chat/thread_**', { timeout: 30000 });
  }

  await waitForResponse(page, existingCount + 1);
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

test.describe('Zuper Sense - JobNimbus Prompts Validation', () => {
  // Increase timeout for the entire suite — AI responses can be slow
  test.describe.configure({ timeout: 600000 });

  const prompts = parsePrompts();

  test.beforeAll(async () => {
    // Backup the Excel file before starting
    if (existsSync(EXCEL_PATH)) {
      var backupPath = EXCEL_PATH.replace('.xlsx', '_backup.xlsx');
      copyFileSync(EXCEL_PATH, backupPath);
    }
  });

  test('should execute all JobNimbus prompts in Zuper Sense', async ({ page }) => {
    // Step 1: Login
    await test.step('Login to staging', async () => {
      await login(page);
    });

    // Step 2: Navigate to Sense
    await test.step('Navigate to Zuper Sense', async () => {
      await page.goto(BASE_URL + '/sense', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForURL('**/sense**', { timeout: 15000 });
      await dismissPopups(page);
    });

    // Step 3: Create new chat
    await test.step('Create new chat "job nimbus"', async () => {
      await page.goto(BASE_URL + '/sense/chat/new', { timeout: 30000 });
      var messageInput = page.getByRole('textbox', { name: 'Message input' });
      await messageInput.waitFor({ state: 'visible', timeout: 15000 });
    });

    // Step 4: Execute each prompt sequentially
    for (var i = 0; i < prompts.length; i++) {
      var rowIndex = prompts[i].rowIndex;
      var kpi = prompts[i].kpi;
      var prompt = prompts[i].prompt;
      var outputType = prompts[i].outputType;
      var promptNum = i + 1;

      await test.step('Prompt ' + promptNum + '/' + prompts.length + ': ' + kpi, async () => {
        var startTime = Date.now();

        try {
          await sendPrompt(page, prompt);
          var elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

          updateExcelStatus(rowIndex, 'Pass', 'Response received in ' + elapsed + 's. Automated execution via Playwright.');
          console.log('PASS (' + elapsed + 's) - ' + kpi);

        } catch (error) {
          updateExcelStatus(rowIndex, 'Fail', 'Error: ' + error.message + '. Automated execution via Playwright.');
          console.log('FAIL - ' + kpi + ': ' + error.message);

          // Attempt recovery for next prompt
          await page.waitForTimeout(5000);
          try {
            var messageInput = page.getByRole('textbox', { name: 'Message input' });
            var isReady = await messageInput.isVisible({ timeout: 5000 }).catch(() => false);
            if (!isReady) {
              await page.goto(BASE_URL + '/sense/chat/new', { timeout: 30000 });
              var input = page.getByRole('textbox', { name: 'Message input' });
              await input.waitFor({ state: 'visible', timeout: 15000 });
            }
          } catch (_) {}
        }
      });

      // Cooldown between prompts
      if (i < prompts.length - 1) {
        await page.waitForTimeout(3000);
      }
    }
  });
});
