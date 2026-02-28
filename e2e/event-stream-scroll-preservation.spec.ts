import { test, expect } from '@playwright/test';

/**
 * UI test: when new events are appended (live tail), the scroll position must be
 * preserved so the same "anchor" event stays in view. No visible flash/jump.
 *
 * Fails if the list jumps when new events are prepended (e.g. scroll resets or
 * corrects too late).
 */
test('event stream preserves scroll position when new events are appended (no flash)', async ({
	page,
}) => {
	await page.goto('/');

	// Wait for the event list to be populated
	const viewport = page.getByTestId('event-list-viewport');
	await expect(viewport).toBeVisible({ timeout: 15_000 });

	// Scrollable element is the first div inside the viewport (VList root)
	const scrollContainer = viewport.locator('div').first();
	await expect(scrollContainer).toBeVisible();

	// Wait until we have at least a few event rows
	await expect(viewport.locator('[data-event-id]').nth(4)).toBeVisible({ timeout: 10_000 });

	// Scroll down so we have an "anchor" row we can track (not the very first row)
	await scrollContainer.evaluate((el) => {
		(el as HTMLDivElement).scrollTop = 4000;
	});

	// Wait for scroll to apply and virtual list to render the new window
	await expect
		.poll(async () => {
			return scrollContainer.evaluate((el) => (el as HTMLDivElement).scrollTop);
		})
		.toBeGreaterThanOrEqual(3990);
	await page.waitForTimeout(200);

	// First [data-event-id] inside the viewport is the first visible row
	const anchorRow = viewport.locator('[data-event-id]').first();
	await expect(anchorRow).toBeVisible();
	const anchorId = await anchorRow.getAttribute('data-event-id');
	expect(anchorId).toBeTruthy();

	// Wait for at least one batch of new events (live tail mock uses 2s interval)
	await page.waitForTimeout(2600);

	// Anchor must still be visible (scroll was preserved). Use a short timeout:
	// if preserved, it's visible immediately; if not, fail quickly.
	const anchorAfter = viewport.locator(`[data-event-id="${anchorId}"]`);
	await expect(anchorAfter).toBeVisible({ timeout: 3000 });
});
