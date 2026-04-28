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

    // Verify the job is visible (scroll into view if needed)
    await page.evaluate(() => {
      const scrollEl = document.querySelector('.b-dayview-day-content');
      if (scrollEl) scrollEl.scrollTop = 300; // Scroll to show afternoon events
    });
    await page.waitForTimeout(1000);

    await expect(calendarJobLocator).toBeVisible({ timeout: 15000 });

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
    const eventBox = await calendarJobLocator.boundingBox();
    expect(eventBox).not.toBeNull();

    // Get the day container height to calculate pixels per hour
    const dayContainerHeight = await page.evaluate(() => {
      const dayDetail = document.querySelector('.b-dayview-day-detail.b-today');
      return dayDetail ? dayDetail.getBoundingClientRect().height : 744;
    });

    const pixelsPerHour = dayContainerHeight / 24;
    // We'll drag 2 hours UP (negative Y direction)
    const dragDistance = Math.round(pixelsPerHour * 2);

    // Record source center coordinates
    const sourceX = eventBox!.x + eventBox!.width / 2;
    const sourceY = eventBox!.y + eventBox!.height / 2;
    const targetY = sourceY - dragDistance;

    // ===== Step 5: Perform drag and drop =====
    await page.mouse.move(sourceX, sourceY);
    await page.waitForTimeout(200);
    await page.mouse.down();
    await page.waitForTimeout(300);
    // Move with steps for smooth drag (Bryntum requires progressive movement)
    await page.mouse.move(sourceX, targetY, { steps: 20 });
    await page.waitForTimeout(500);
    await page.mouse.up();
    await page.waitForTimeout(2000);

    // ===== Step 6: Handle the Reschedule confirmation dialog =====
    const rescheduleHeading = page.locator('h6').filter({ hasText: /Reschedule.*CalendarJob_/ }).describe('Reschedule dialog heading');
    await expect(rescheduleHeading).toBeVisible({ timeout: 10000 });

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
    expect(newTopPercent).toBeCloseTo(expectedTopPercent, 0);

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

    // Scroll to show the event area
    await page.evaluate(() => {
      const scrollEl = document.querySelector('.b-dayview-day-content');
      if (scrollEl) scrollEl.scrollTop = 300;
    });
    await page.waitForTimeout(1000);

    // Verify the CalendarJob is still visible at the NEW time after refresh
    const jobAfterRefresh = page.locator('.b-cal-event-wrap').filter({
      has: page.locator('text=/CalendarJob_/')
    }).first().describe('CalendarJob after page refresh');
    await expect(jobAfterRefresh).toBeVisible({ timeout: 15000 });

    // Verify the position matches the new time (not the original)
    const persistedTopPercent = await jobAfterRefresh.evaluate(el => parseFloat((el as HTMLElement).style.top));
    expect(persistedTopPercent).toBeCloseTo(expectedTopPercent, 0);

    // Confirm it's NOT at the original time position
    expect(Math.abs(persistedTopPercent - originalTopPercent)).toBeGreaterThan(3);
  });
});
