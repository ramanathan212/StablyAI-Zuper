/**
 * PopupHandler — centralized, auto-dismissing popup manager.
 *
 * Handles all known popups/overlays that can intercept test interactions:
 *   - Beamer product-announcement modal  (#beamerPushModal)
 *   - Timezone-change dialog             (Cancel button)
 *   - Onboarding / "No, thanks" popup
 *   - CDK overlay backdrops              (.cdk-overlay-backdrop)
 *   - Native browser alert/confirm/prompt dialogs
 *
 * Usage:
 *   const handler = new PopupHandler(page);
 *   handler.start();          // begin background polling
 *   // … run your test steps …
 *   handler.stop();           // stop polling when done
 *
 * Or use the one-shot helper for a specific moment:
 *   await PopupHandler.dismissAll(page);
 */
export class PopupHandler {
  constructor(page, { pollInterval = 1500 } = {}) {
    this.page = page;
    this.pollInterval = pollInterval;
    this._timer = null;
    this._running = false;

    // Auto-dismiss native browser dialogs (alert / confirm / prompt)
    this.page.on('dialog', async (dialog) => {
      console.log(`⚠️  Native dialog detected [${dialog.type()}]: "${dialog.message()}" — auto-dismissing`);
      await dialog.dismiss().catch(() => {});
    });
  }

  /** Start background polling */
  start() {
    if (this._running) return;
    this._running = true;
    this._poll();
  }

  /** Stop background polling */
  stop() {
    this._running = false;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  _poll() {
    if (!this._running) return;
    this._timer = setTimeout(async () => {
      try {
        // Only auto-dismiss popups that appear unexpectedly in the background.
        // CDK overlays are intentionally excluded from the background poller because
        // they are also used by date pickers, dropdowns and dialogs that tests interact
        // with — dismissing them would close those UI elements mid-action.
        await Promise.all([
          PopupHandler._dismissBeamer(this.page),
          PopupHandler._dismissTimezoneDialog(this.page),
          PopupHandler._dismissOnboarding(this.page),
        ]);
      } catch {
        // page may have navigated — ignore
      }
      this._poll();
    }, this.pollInterval);
  }

  /**
   * One-shot: dismiss every known popup on the page right now.
   * Safe to call at any time — all checks are non-throwing.
   * Pass { includeCdkOverlay: true } only when you are sure no intentional
   * overlay (date picker, dropdown, dialog) is open.
   */
  static async dismissAll(page, { includeCdkOverlay = false } = {}) {
    const tasks = [
      PopupHandler._dismissBeamer(page),
      PopupHandler._dismissTimezoneDialog(page),
      PopupHandler._dismissOnboarding(page),
    ];
    if (includeCdkOverlay) tasks.push(PopupHandler._dismissCdkOverlay(page));
    await Promise.all(tasks);
  }

  // ── individual dismissers ──────────────────────────────────────────────────

  static async _dismissBeamer(page) {
    try {
      const modal = page.locator('#beamerPushModal');
      if (!await modal.isVisible({ timeout: 500 }).catch(() => false)) return;

      console.log('⚠️  Beamer modal — dismissing...');
      const closeBtn = page.locator(
        '#beamerPushModal .beamer_icon.close, #beamerPushModal [class*="close"]'
      ).first();

      if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await closeBtn.click({ force: true });
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForSelector('#beamerPushModal', { state: 'hidden', timeout: 3000 }).catch(() => {});
      console.log('✓ Beamer modal dismissed');
    } catch { /* already gone */ }
  }

  static async _dismissTimezoneDialog(page) {
    try {
      // The timezone dialog specifically contains text about timezone/time zone change.
      // We match only dialogs that contain that text to avoid closing unrelated dialogs.
      const timezoneDialog = page.locator('mat-dialog-container, [role="dialog"]')
        .filter({ hasText: /timezone|time zone/i })
        .first();
      if (!await timezoneDialog.isVisible({ timeout: 500 }).catch(() => false)) return;

      console.log('⚠️  Timezone dialog — dismissing...');
      const cancelBtn = timezoneDialog.getByRole('button', { name: /^Cancel$/i });
      await cancelBtn.click({ force: true });
      console.log('✓ Timezone dialog dismissed');
    } catch { /* not present */ }
  }

  static async _dismissOnboarding(page) {
    try {
      const noThanks = page.getByRole('button', { name: 'No, thanks' });
      if (!await noThanks.isVisible({ timeout: 500 }).catch(() => false)) return;

      console.log('⚠️  Onboarding popup — dismissing...');
      await noThanks.click({ force: true });
      console.log('✓ Onboarding popup dismissed');
    } catch { /* not present */ }
  }

  static async _dismissCdkOverlay(page) {
    try {
      // Only dismiss transparent/dark backdrops that have no meaningful dialog behind them
      // (i.e. not the ones belonging to date-pickers, dropdowns, search dialogs the test needs)
      const backdrop = page.locator('.cdk-overlay-backdrop:not(.cdk-overlay-transparent-backdrop)');
      if (!await backdrop.isVisible({ timeout: 500 }).catch(() => false)) return;

      // Check if backdrop belongs to a beamer or notification — handled separately
      const beamerVisible = await page.locator('#beamerPushModal').isVisible({ timeout: 300 }).catch(() => false);
      if (beamerVisible) return; // will be handled by _dismissBeamer

      console.log('⚠️  CDK overlay backdrop — dismissing...');
      await page.keyboard.press('Escape');
      await page.waitForSelector(
        '.cdk-overlay-backdrop:not(.cdk-overlay-transparent-backdrop)',
        { state: 'hidden', timeout: 2000 }
      ).catch(() => {});
      console.log('✓ CDK overlay dismissed');
    } catch { /* not present */ }
  }
}
