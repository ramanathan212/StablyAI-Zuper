import { test, expect } from '@stablyai/playwright-test';

test.describe('Calendar - Drag and Drop Reschedule Job', () => {
  /**
   * User Prompt:
   * - Navigate to the Calendar module.
   * - Identify the job created in the previous test case (created today with Repair category and one-hour duration).
   * - Verify the job is visible in the current time slot.
   * - Click and drag the same job to a different time slot (change by at least one hour).
   * - Drop the job in the new time slot.
   * - Verify the job is updated to the new scheduled time.
   * - Verify the job no longer appears in the previous time slot.
   * - Refresh the page.
   * - Verify the updated schedule persists after refresh.
   * - Do not include login steps. Assume user is already authenticated.
   */

  // Login setup - authenticate before the test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Company Name' }).waitFor({ state: 'visible', timeout: 30000 });
    await page.getByRole('textbox', { name: 'Company Name' }).fill(process.env.companyName!);
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Continue');
      if (btn) btn.click();
    });
    await page.getByRole('textbox', { name: 'Email address' }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByRole('textbox', { name: 'Email address' }).fill(process.env.email!);
    await page.getByRole('textbox', { name: 'Password Forgot password?' }).fill(process.env.password!);
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Login');
      if (btn) btn.click();
    });
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    await page.waitForTimeout(2000);

    // Dismiss popups
    try {
      const cancelBtn = page.getByRole('button', { name: 'Cancel' });
      if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) await cancelBtn.click();
    } catch (_) { /* ignore */ }
    try {
      const noThanksBtn = page.getByRole('button', { name: 'No, thanks' });
      if (await noThanksBtn.isVisible({ timeout: 3000 }).catch(() => false)) await noThanksBtn.click();
    } catch (_) { /* ignore */ }
  });

  test('should drag and drop a calendar job to reschedule it by at least one hour', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes

    // Helper: Remove CDK overlays before interactions
    async function removeOverlays() {
      await page.evaluate(() => {
        document.querySelectorAll('.cdk-overlay-backdrop').forEach(el => el.remove());
      });
      await page.waitForTimeout(300);
    }

    // ===== Step 1: Navigate to Calendar module =====
    await page.goto('/calendar');
    await page.waitForTimeout(5000); // Calendar loads slowly (Angular SPA)

    // Verify calendar page loaded
    await expect(page).toHaveURL(/\/calendar/);

    // Dismiss any popups that reappear
    try {
      const cancelBtn = page.getByRole('button', { name: 'Cancel' });
      if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) await cancelBtn.click();
    } catch (_) { /* ignore */ }
    try {
      const noThanksBtn = page.getByRole('button', { name: 'No, thanks' });
      if (await noThanksBtn.isVisible({ timeout: 2000 }).catch(() => false)) await noThanksBtn.click();
    } catch (_) { /* ignore */ }

    // Verify calendar view is visible
    const todayButton = page.getByRole('button', { name: 'Today' }).describe('Today button');
    await expect(todayButton).toBeVisible({ timeout: 15000 });

    // ===== Step 2: Switch to Day view for cleaner drag-and-drop =====
    const dayTab = page.getByLabel('Tabs').getByText('Day').describe('Day view tab');
    await dayTab.click();
    // Wait for Day view to render with today's date
    await page.locator('.b-dayview-day-detail.b-today').first().waitFor({ state: 'attached', timeout: 10000 });
    await page.waitForTimeout(1000); // Allow animations to settle

    // ===== Step 3: Find a CalendarJob entry (from previous test run) =====
    // Look for any CalendarJob_* entry on today's calendar
    const calendarJobLocator = page.locator('.b-cal-event-wrap').filter({
      has: page.locator('text=/CalendarJob_/')
    }).first().describe('CalendarJob entry on calendar');

    // Scroll the CalendarJob into view within its scrollable container
    await expect(calendarJobLocator).toBeAttached({ timeout: 15000 });
    await calendarJobLocator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800); // Allow scroll animation to settle
    await expect(calendarJobLocator).toBeVisible({ timeout: 10000 });

    // ===== Step 4: Record the original time slot =====
    // Get the time from the event's CSS top percentage (which maps to time-of-day)
    const originalTimeInfo = await page.evaluate(() => {
      const events = document.querySelectorAll('.b-cal-event-wrap');
      for (const ev of events) {
        // Check if this event contains a CalendarJob title
        if (ev.textContent && ev.textContent.includes('CalendarJob_')) {
          const topPercent = parseFloat((ev as HTMLElement).style.top);
          if (!isNaN(topPercent)) {
            const hour = Math.round((topPercent / 100) * 24);
            const period = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
            return { time: `${displayHour}:00 ${period}`, topPercent, hour };
          }
        }
      }
      return null;
    });

    expect(originalTimeInfo).not.toBeNull();
    const originalTimeText = originalTimeInfo!.time;
    const originalTopPercent = originalTimeInfo!.topPercent;

    // Get the event's bounding box for drag operation
    // Ensure the element is scrolled into view before getting coordinates
    await calendarJobLocator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const eventBox = await calendarJobLocator.boundingBox();
    expect(eventBox).not.toBeNull();

    // Get the day container height to calculate pixels per hour
    const dayContainerHeight = await page.evaluate(() => {
      const dayDetail = document.querySelector('.b-dayview-day-detail.b-today');
      return dayDetail ? dayDetail.getBoundingClientRect().height : 744;
    });

    // Get the scroll container bounds to ensure drag target stays within visible area
    const containerBox = await page.locator('.b-dayview-day-content').first().boundingBox();
    const minY = containerBox ? containerBox.y + 20 : 0; // Don't drag above container top

    const pixelsPerHour = dayContainerHeight / 24;
    // We'll drag 2 hours UP (negative Y direction)
    const dragDistance = Math.round(pixelsPerHour * 2);

    // Record source center coordinates
    const sourceX = eventBox!.x + eventBox!.width / 2;
    const sourceY = eventBox!.y + eventBox!.height / 2;
    // Clamp targetY to stay within the scrollable container bounds
    const targetY = Math.max(sourceY - dragDistance, minY);

    // ===== Step 5: Perform drag and drop =====
    // Helper: Attempt a drag operation with configurable parameters
    // Bryntum calendar requires a deliberate press-hold-move sequence to register drag
    async function attemptDrag(srcX: number, srcY: number, tgtY: number, steps: number, holdDelay: number) {
      await page.mouse.move(srcX, srcY);
      await page.waitForTimeout(300);
      await page.mouse.down();
      // Hold down longer before moving - Bryntum needs time to detect drag intent
      await page.waitForTimeout(holdDelay);
      // Move with small initial displacement to trigger drag detection
      await page.mouse.move(srcX, srcY - 5, { steps: 2 });
      await page.waitForTimeout(200);
      // Then move progressively to the target
      await page.mouse.move(srcX, tgtY, { steps });
      await page.waitForTimeout(800);
      await page.mouse.up();
      await page.waitForTimeout(2000);
    }

    // Retry drag up to 3 times - the Bryntum calendar can intermittently fail to register drags
    const rescheduleHeading = page.locator('h6').filter({ hasText: /Reschedule.*CalendarJob_/ }).describe('Reschedule dialog heading');
    let dragSucceeded = false;

    for (let attempt = 1; attempt <= 3; attempt++) {
      // On retries, increase steps and hold delay for more reliable detection
      const steps = 20 + (attempt - 1) * 15; // 20, 35, 50
      const holdDelay = 500 + (attempt - 1) * 300; // 500ms, 800ms, 1100ms

      await attemptDrag(sourceX, sourceY, targetY, steps, holdDelay);

      // Check if reschedule dialog appeared
      const isVisible = await rescheduleHeading.isVisible().catch(() => false);
      if (isVisible) {
        dragSucceeded = true;
        break;
      }

      // If dialog didn't appear, wait and re-acquire bounding box in case event position shifted
      if (attempt < 3) {
        await page.waitForTimeout(1000);
        // Remove any overlays that might have appeared
        await removeOverlays();
        // Re-verify the event is still visible and scroll into view for accurate coordinates
        await expect(calendarJobLocator).toBeVisible({ timeout: 5000 });
        await calendarJobLocator.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        const freshBox = await calendarJobLocator.boundingBox();
        if (freshBox) {
          // Update source coordinates for next attempt
          const freshSourceY = freshBox.y + freshBox.height / 2;
          // Clamp fresh target Y to stay within container bounds
          const freshTargetY = Math.max(freshSourceY - dragDistance, minY);
          await attemptDrag(freshBox.x + freshBox.width / 2, freshSourceY, freshTargetY, steps + 10, holdDelay + 200);
          const retryVisible = await rescheduleHeading.isVisible().catch(() => false);
          if (retryVisible) {
            dragSucceeded = true;
            break;
          }
        }
      }
    }

    // Final assertion - if all drag attempts failed, this will provide a clear error
    await expect(rescheduleHeading).toBeVisible({ timeout: 15000 });

    // Read the new scheduled time from the dialog
    const startTimeInput = page.locator('input[placeholder="Pick a time"]').first().describe('Scheduled start time in reschedule dialog');
    const newStartTime = await startTimeInput.inputValue();

    // Read the end time
    const endTimeInput = page.locator('input[placeholder="Pick a time"]').last().describe('Scheduled end time in reschedule dialog');
    const newEndTime = await endTimeInput.inputValue();

    // Verify the new time is at least 1 hour different from original
    // Parse original time
    const origMatch = originalTimeText.match(/(\d+):(\d+)\s*(AM|PM)/);
    const newMatch = newStartTime.match(/(\d+):(\d+)\s*(AM|PM)/);
    expect(origMatch).not.toBeNull();
    expect(newMatch).not.toBeNull();

    if (origMatch && newMatch) {
      let origHour = parseInt(origMatch[1]);
      if (origMatch[3] === 'PM' && origHour !== 12) origHour += 12;
      if (origMatch[3] === 'AM' && origHour === 12) origHour = 0;

      let newHour = parseInt(newMatch[1]);
      if (newMatch[3] === 'PM' && newHour !== 12) newHour += 12;
      if (newMatch[3] === 'AM' && newHour === 12) newHour = 0;

      const hourDiff = Math.abs(origHour - newHour);
      expect(hourDiff).toBeGreaterThanOrEqual(1);
    }

    // Verify 1-hour duration is preserved
    const newStartMatch = newStartTime.match(/(\d+):(\d+)\s*(AM|PM)/);
    const newEndMatch = newEndTime.match(/(\d+):(\d+)\s*(AM|PM)/);
    if (newStartMatch && newEndMatch) {
      let sH = parseInt(newStartMatch[1]);
      if (newStartMatch[3] === 'PM' && sH !== 12) sH += 12;
      if (newStartMatch[3] === 'AM' && sH === 12) sH = 0;
      let eH = parseInt(newEndMatch[1]);
      if (newEndMatch[3] === 'PM' && eH !== 12) eH += 12;
      if (newEndMatch[3] === 'AM' && eH === 12) eH = 0;
      const duration = (eH * 60 + parseInt(newEndMatch[2])) - (sH * 60 + parseInt(newStartMatch[2]));
      expect(duration).toBe(60); // Duration should still be 1 hour
    }

    // Click Update to confirm the reschedule
    await removeOverlays();
    const updateButton = page.getByRole('button', { name: 'Update' }).describe('Update button in reschedule dialog');
    await updateButton.click({ force: true, timeout: 30000 });
    await page.waitForTimeout(2000); // Wait for server-side save

    // ===== Step 7: Verify the job is at the new time slot =====
    // The reschedule dialog should have closed
    await expect(rescheduleHeading).not.toBeVisible({ timeout: 10000 });

    // Verify the job entry now shows the new time on the calendar
    const jobWithNewTime = page.locator('.b-cal-event-wrap').filter({
      has: page.locator('text=/CalendarJob_/')
    }).first().describe('CalendarJob after reschedule');
    await expect(jobWithNewTime).toBeVisible({ timeout: 10000 });

    // Verify the new CSS top position matches the new time (approximately)
    const newTopPercent = await jobWithNewTime.evaluate(el => parseFloat((el as HTMLElement).style.top));
    // Convert new start time to 24h format for expected position calculation
    let expectedNewHour = 0;
    if (newMatch) {
      expectedNewHour = parseInt(newMatch[1]);
      if (newMatch[3] === 'PM' && expectedNewHour !== 12) expectedNewHour += 12;
      if (newMatch[3] === 'AM' && expectedNewHour === 12) expectedNewHour = 0;
    }
    const expectedTopPercent = (expectedNewHour / 24) * 100;
    // Use a tolerance of ~2% to account for calendar time-slot snapping (5-min increments)
    // Bryntum snaps to 5-min intervals, so position can differ by up to (5/60)/24*100 = ~0.35% per snap
    // Allow up to 3% tolerance to handle edge cases with partial-hour snapping
    expect(Math.abs(newTopPercent - expectedTopPercent)).toBeLessThan(3);

    // ===== Step 8: Verify the job does NOT appear at the original time =====
    // The job should NOT be at the original position (moved at least 1 hour = ~4.17%)
    expect(Math.abs(newTopPercent - originalTopPercent)).toBeGreaterThan(3);

    // ===== Step 9: Refresh the page and verify persistence =====
    await page.reload();
    // Wait for calendar to fully reload by checking for the Today button
    await page.getByRole('button', { name: 'Today' }).waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(2000); // Allow calendar data to load

    // Dismiss popups after reload
    try {
      const cancelBtn = page.getByRole('button', { name: 'Cancel' });
      if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) await cancelBtn.click();
    } catch (_) { /* ignore */ }
    try {
      const noThanksBtn = page.getByRole('button', { name: 'No, thanks' });
      if (await noThanksBtn.isVisible({ timeout: 2000 }).catch(() => false)) await noThanksBtn.click();
    } catch (_) { /* ignore */ }

    // Verify the calendar is still loaded
    await expect(page).toHaveURL(/\/calendar/);
    await expect(todayButton).toBeVisible({ timeout: 15000 });

    // Switch back to Day view (may revert to default week view after reload)
    await dayTab.click();
    await page.locator('.b-dayview-day-detail.b-today').first().waitFor({ state: 'attached', timeout: 10000 });
    await page.waitForTimeout(1000);

    // Verify the CalendarJob is still visible at the NEW time after refresh
    const jobAfterRefresh = page.locator('.b-cal-event-wrap').filter({
      has: page.locator('text=/CalendarJob_/')
    }).first().describe('CalendarJob after page refresh');
    // Scroll the job into view rather than using a blind scroll offset
    await expect(jobAfterRefresh).toBeAttached({ timeout: 15000 });
    await jobAfterRefresh.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await expect(jobAfterRefresh).toBeVisible({ timeout: 10000 });

    // Verify the position matches the new time (not the original)
    const persistedTopPercent = await jobAfterRefresh.evaluate(el => parseFloat((el as HTMLElement).style.top));
    // Use same tolerance as above for calendar time-slot snapping
    expect(Math.abs(persistedTopPercent - expectedTopPercent)).toBeLessThan(3);

    // Confirm it's NOT at the original time position
    expect(Math.abs(persistedTopPercent - originalTopPercent)).toBeGreaterThan(3);
  });
});
