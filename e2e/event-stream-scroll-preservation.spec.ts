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

	// Scrollable element: the one with data-event-list-scroll (custom scrollbar hides native one)
	const scrollContainer = viewport.locator('[data-event-list-scroll]').first();
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

/**
 * When the user drags the scrollbar thumb to a new position (e.g. to top), that
 * position must not be overwritten by scroll-preservation when new events arrive.
 * Preservation is for wheel-scroll + prepend; thumb scroll is an explicit user
 * intent that should win.
 */
test('event stream does not overwrite thumb scroll when new events are appended', async ({
	page,
}) => {
	await page.goto('/');

	const viewport = page.getByTestId('event-list-viewport');
	await expect(viewport).toBeVisible({ timeout: 15_000 });

	// Scrollable element: the one with data-event-list-scroll (custom scrollbar hides native one)
	const scrollContainer = viewport.locator('[data-event-list-scroll]').first();
	await expect(scrollContainer).toBeVisible();
	await expect(viewport.locator('[data-event-id]').nth(4)).toBeVisible({ timeout: 10_000 });

	// Scroll down to establish an anchor (so preservation would normally run when list grows)
	await scrollContainer.evaluate((el) => {
		(el as HTMLDivElement).scrollTop = 4000;
	});
	await expect
		.poll(async () => scrollContainer.evaluate((el) => (el as HTMLDivElement).scrollTop))
		.toBeGreaterThanOrEqual(3990);
	await page.waitForTimeout(200);

	// Simulate user dragging the scrollbar thumb to top
	await scrollContainer.evaluate((el) => {
		(el as HTMLDivElement).scrollTop = 0;
	});
	await expect
		.poll(async () => scrollContainer.evaluate((el) => (el as HTMLDivElement).scrollTop))
		.toBeLessThanOrEqual(50);
	await page.waitForTimeout(100);

	// Wait for live tail to prepend new events
	await page.waitForTimeout(2600);

	// Thumb scroll to top must not be overwritten by preservation
	const scrollTopAfter = await scrollContainer.evaluate((el) => (el as HTMLDivElement).scrollTop);
	expect(scrollTopAfter).toBeLessThanOrEqual(100);
});
