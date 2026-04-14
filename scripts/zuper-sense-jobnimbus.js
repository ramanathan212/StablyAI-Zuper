/**
 * Zuper Sense - JobNimbus Prompts Automation
 *
 * Logs into stagingv3.zuperpro.com, navigates to Zuper Sense,
 * creates a "job nimbus" chat, and executes all prompts from the Excel file.
 * Updates the Excel file with pass/fail status after each prompt.
 */

const { chromium } = require('playwright');
const XLSX = require('xlsx');
const { copyFileSync } = require('fs');
const { resolve } = require('path');

const PROJECT_ROOT = resolve(__dirname, '..');

// Configuration
const BASE_URL = 'https://stagingv3.zuperpro.com';
const CREDENTIALS = {
  companyName: 'sofyaizuper',
  email: 'ramanathan.m@zuper.co',
  password: 'Test@123',
};

const EXCEL_PATH = resolve(PROJECT_ROOT, '.context/attachments/JobNimbus_Insights_Zuper_Sense_Validation.xlsx');
const RESULTS_PATH = resolve(PROJECT_ROOT, '.context/attachments/JobNimbus_Insights_Zuper_Sense_Validation.xlsx');

// Timeouts
const LOGIN_TIMEOUT = 30000;
const NAVIGATION_TIMEOUT = 30000;
const SENSE_RESPONSE_TIMEOUT = 120000; // 2 minutes for AI response
const PROMPT_COOLDOWN = 3000; // Wait between prompts

/**
 * Parse prompts from the Excel file, filtering out section headers.
 */
function parsePrompts() {
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Header row is index 0
  // Columns: 0=KPI/Metric, 1=JobNimbus Description, 2=Zuper Equivalent,
  //          3=Suggested BI Agent Prompt, 4=Output Type, 5=Pass/Fail, 6=Notes/Observations
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
      rowIndex: i + 1, // 1-based Excel row (header is row 1)
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

  // Column F (index 5) = Pass/Fail, Column G (index 6) = Notes
  const passFailCell = XLSX.utils.encode_cell({ r: rowIndex - 1, c: 5 });
  const notesCell = XLSX.utils.encode_cell({ r: rowIndex - 1, c: 6 });

  sheet[passFailCell] = { t: 's', v: status };
  sheet[notesCell] = { t: 's', v: notes };

  XLSX.writeFile(workbook, RESULTS_PATH);
}

/**
 * Dismiss common popups (timezone, notifications, etc.)
 */
async function dismissPopups(page) {
  await page.waitForTimeout(1500);

  // Dismiss timezone dialog
  try {
    const timezoneHeading = page.getByRole('heading', { name: 'Your timezone has changed' });
    if (await timezoneHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.getByRole('button', { name: 'Cancel' }).click();
      await timezoneHeading.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
  } catch (_) {}

  // Dismiss "No, thanks" notification
  try {
    const noThanks = page.getByRole('button', { name: 'No, thanks' });
    if (await noThanks.isVisible({ timeout: 2000 }).catch(() => false)) {
      await noThanks.click();
      await page.waitForTimeout(500);
    }
  } catch (_) {}

  // Dismiss trial modal
  try {
    const trialModal = page.locator('text=Trial Period Ending Soon');
    if (await trialModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  } catch (_) {}

  // Dismiss any CDK overlay backdrops
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
  console.log('Logging in to', BASE_URL);
  await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded' });

  // Wait for login form or redirect
  const loginFormOrRedirect = await Promise.race([
    page.getByRole('textbox', { name: 'Company Name' })
      .waitFor({ state: 'visible', timeout: 15000 })
      .then(() => 'login_form'),
    page.waitForURL(/\/(dashboard|sense|jobs)/, { timeout: 15000 })
      .then(() => 'redirected'),
  ]).catch(() => 'unknown');

  if (loginFormOrRedirect === 'login_form') {
    // Fill company name
    const companyInput = page.getByRole('textbox', { name: 'Company Name' });
    await companyInput.fill(CREDENTIALS.companyName);

    // Click Continue via JS to bypass overlays
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find(function(b) { return b.textContent && b.textContent.trim() === 'Continue'; });
      if (btn) btn.click();
    });

    // Fill credentials
    const emailInput = page.getByRole('textbox', { name: 'Email address' });
    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await emailInput.fill(CREDENTIALS.email);

    const passwordInput = page.getByRole('textbox', { name: 'Password Forgot password?' });
    await passwordInput.fill(CREDENTIALS.password);

    // Click Login via JS
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find(function(b) { return b.textContent && b.textContent.trim() === 'Login'; });
      if (btn) btn.click();
    });

    // Wait for dashboard
    await page.waitForURL('**/dashboard', { timeout: LOGIN_TIMEOUT });
    console.log('Login successful');
  } else {
    console.log('Already logged in (redirected)');
  }

  await dismissPopups(page);
}

/**
 * Navigate to Zuper Sense
 */
async function navigateToSense(page) {
  console.log('Navigating to Zuper Sense...');

  // Direct navigation to Sense
  await page.goto(BASE_URL + '/sense', { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT });

  // Wait for Sense page to load
  try {
    await page.waitForURL('**/sense**', { timeout: 15000 });
    console.log('Navigated to Sense page');
  } catch (e) {
    // If redirected, try sidebar navigation
    console.log('Direct navigation failed, trying sidebar...');
    const senseLink = page.locator('a[href="/sense"]');
    await senseLink.click();
    await page.waitForURL('**/sense**', { timeout: 15000 });
    console.log('Navigated to Sense via sidebar');
  }

  await dismissPopups(page);
}

/**
 * Create a new chat thread.
 * In Sense, the thread is auto-named from the first message.
 */
async function createNewChat(page) {
  console.log('Creating new chat "job nimbus"...');

  // Navigate to new chat view
  await page.goto(BASE_URL + '/sense/chat/new', { timeout: NAVIGATION_TIMEOUT });

  // Wait for message input to appear
  const messageInput = page.getByRole('textbox', { name: 'Message input' });
  await messageInput.waitFor({ state: 'visible', timeout: 15000 });

  console.log('New chat view ready');
}

/**
 * Wait for Sense AI response to complete.
 * Detects the "Thought for X.Xs" button indicating response completion.
 */
async function waitForResponse(page, expectedMinCount, timeoutMs) {
  expectedMinCount = expectedMinCount || 1;
  timeoutMs = timeoutMs || SENSE_RESPONSE_TIMEOUT;

  const thoughtButton = page.getByRole('button', { name: /Thought for/ });
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const count = await thoughtButton.count();
    if (count >= expectedMinCount) {
      break;
    }
    await page.waitForTimeout(2000);
  }

  // Verify the response appeared
  const finalCount = await thoughtButton.count();
  if (finalCount < expectedMinCount) {
    throw new Error('Timeout waiting for AI response (expected ' + expectedMinCount + ', got ' + finalCount + ')');
  }

  // Wait for last response to stabilize
  await thoughtButton.last().waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(2000); // Buffer for DOM to stabilize
}

/**
 * Send a prompt in the Sense chat and wait for response
 */
async function sendPrompt(page, prompt) {
  // Count existing "Thought for" buttons before sending
  const thoughtButton = page.getByRole('button', { name: /Thought for/ });
  const existingCount = await thoughtButton.count();

  // Fill and submit prompt
  const messageInput = page.getByRole('textbox', { name: 'Message input' });
  await messageInput.waitFor({ state: 'visible', timeout: 15000 });
  await messageInput.fill(prompt);
  await page.keyboard.press('Enter');

  // For the first prompt, wait for thread URL redirect
  const currentUrl = page.url();
  if (currentUrl.includes('/chat/new')) {
    await page.waitForURL('**/sense/chat/thread_**', { timeout: 30000 });
  }

  // Wait for the new response
  await waitForResponse(page, existingCount + 1);
}

/**
 * Rename the thread to "job nimbus" if possible
 */
async function renameThread(page) {
  try {
    var threadItems = page.locator('[class*="thread"]').filter({ hasText: /./ });
    var count = await threadItems.count();

    if (count > 0) {
      var editBtn = page.locator('button, [role="menuitem"]').filter({ hasText: /rename|edit/i });
      if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editBtn.click();
        var nameInput = page.locator('input:visible').first();
        await nameInput.fill('job nimbus');
        await page.keyboard.press('Enter');
        console.log('Thread renamed to "job nimbus"');
        return;
      }
    }

    console.log('Thread will be auto-named from first prompt');
  } catch (e) {
    console.log('Could not rename thread, continuing with auto-name');
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('===================================================');
  console.log('  Zuper Sense - JobNimbus Prompts Automation');
  console.log('===================================================\n');

  // Parse prompts from Excel
  var prompts = parsePrompts();
  console.log('Found ' + prompts.length + ' prompts to execute\n');

  // Backup the Excel file
  var backupPath = EXCEL_PATH.replace('.xlsx', '_backup.xlsx');
  copyFileSync(EXCEL_PATH, backupPath);
  console.log('Backup created: ' + backupPath + '\n');

  // Launch browser
  var browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--start-maximized',
    ],
  });

  var context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    serviceWorkers: 'block',
  });

  var page = await context.newPage();

  var completedCount = 0;
  var passCount = 0;
  var failCount = 0;

  try {
    // Step 1: Login
    await login(page);

    // Step 2: Navigate to Sense
    await navigateToSense(page);

    // Step 3: Create new chat
    await createNewChat(page);

    // Step 4: Execute prompts sequentially
    for (var i = 0; i < prompts.length; i++) {
      var rowIndex = prompts[i].rowIndex;
      var kpi = prompts[i].kpi;
      var prompt = prompts[i].prompt;
      var outputType = prompts[i].outputType;
      var promptNum = i + 1;

      console.log('\n--- Prompt ' + promptNum + '/' + prompts.length + ' ---');
      console.log('KPI: ' + kpi);
      console.log('Prompt: ' + prompt);
      console.log('Expected Output: ' + outputType);

      try {
        var startTime = Date.now();
        await sendPrompt(page, prompt);
        var elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        var status = 'Pass';
        var notes = 'Response received in ' + elapsed + 's. Automated execution via Playwright.';

        updateExcelStatus(rowIndex, status, notes);
        passCount++;
        console.log('PASS (' + elapsed + 's)');

        // After first prompt, try to rename thread
        if (i === 0) {
          await renameThread(page);
        }

      } catch (error) {
        var status = 'Fail';
        var notes = 'Error: ' + error.message + '. Automated execution via Playwright.';

        updateExcelStatus(rowIndex, status, notes);
        failCount++;
        console.log('FAIL: ' + error.message);

        // Try to recover
        await page.waitForTimeout(5000);
        try {
          var messageInput = page.getByRole('textbox', { name: 'Message input' });
          var isReady = await messageInput.isVisible({ timeout: 5000 }).catch(() => false);
          if (!isReady) {
            console.log('Message input not found, attempting to recover...');
            await page.goto(BASE_URL + '/sense', { timeout: NAVIGATION_TIMEOUT });
            await page.waitForTimeout(3000);
            await dismissPopups(page);

            await page.goto(BASE_URL + '/sense/chat/new', { timeout: NAVIGATION_TIMEOUT });
            var input = page.getByRole('textbox', { name: 'Message input' });
            await input.waitFor({ state: 'visible', timeout: 15000 });
            console.log('Recovered - continuing in new thread');
          }
        } catch (recoverError) {
          console.log('Recovery failed: ' + recoverError.message);
        }
      }

      completedCount++;

      // Cooldown between prompts
      if (i < prompts.length - 1) {
        await page.waitForTimeout(PROMPT_COOLDOWN);
      }

      // Progress update every 10 prompts
      if (promptNum % 10 === 0) {
        console.log('\nProgress: ' + promptNum + '/' + prompts.length + ' | Pass: ' + passCount + ' | Fail: ' + failCount + '\n');
      }
    }

  } catch (error) {
    console.error('\nFatal error: ' + error.message);
  } finally {
    // Final summary
    console.log('\n===================================================');
    console.log('  EXECUTION COMPLETE');
    console.log('===================================================');
    console.log('  Total Prompts: ' + prompts.length);
    console.log('  Completed:     ' + completedCount);
    console.log('  Passed:        ' + passCount);
    console.log('  Failed:        ' + failCount);
    console.log('  Results saved to: ' + RESULTS_PATH);
    console.log('===================================================\n');

    // Keep browser open for 10 seconds so user can see final state
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

main().catch(console.error);
