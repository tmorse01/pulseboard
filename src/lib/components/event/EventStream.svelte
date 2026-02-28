<script lang="ts">
	import { VList } from 'virtua/svelte';
	import type { LogEvent } from '$lib/types/event.js';
	import type { VListHandle } from 'virtua/svelte';
	import { filteredEvents, subscribeToLiveTail } from '$lib/data/eventStore.js';
	import { density, liveTailPaused, filterState } from '$lib/stores/index.js';
	import {
		computeScrollPreservation,
		type ScrollPreservationState
	} from '$lib/scrollPreservation.js';
	import EventRow from './EventRow.svelte';
	import { FilterX } from '@lucide/svelte';
	import FollowCursorScrollbar from './FollowCursorScrollbar.svelte';

	const events = $derived($filteredEvents);
	const densityValue = $derived($density);
	const paused = $derived($liveTailPaused);
	const estimatedRowHeight = $derived(densityValue === 'compact' ? 32 : 40);

	/** Count of events per traceId (for group vs one-off indicator on rows). */
	const traceIdCounts = $derived.by(() => {
		const map = new Map<string, number>();
		for (const e of events) {
			if (e.traceId) map.set(e.traceId, (map.get(e.traceId) ?? 0) + 1);
		}
		return map;
	});

	let listHandle = $state<VListHandle | null>(null);
	let viewportEl = $state<HTMLDivElement | null>(null);
	let scrollContainer = $state<HTMLDivElement | null>(null);
	let liveTailUnsub: (() => void) | undefined;

	/** Kept in sync via onscroll so we have the correct anchor when list length changes. */
	let scrollInfo = $state({ scrollTop: 0, startIndex: 0 });

	// Non-reactive: effect reads/writes this; must not be $state or we get effect_update_depth_exceeded.
	let scrollState: ScrollPreservationState = {
		anchorId: null,
		firstVisibleIndex: 0,
		scrollTop: 0,
		eventsLength: 0
	};

	/** Last time handleScroll ran (user scroll). Used to avoid overwriting thumb scroll. */
	let lastScrollTime = 0;
	const PRESERVATION_COOLDOWN_MS = 200;
	/** Max scroll delta (px) to consider "same position" for preservation. Beyond this = user moved (e.g. thumb). */
	const SCROLL_INTENT_THRESHOLD_PX = 150;
	/** If scroll is below this, treat as "user at top"; don't then scroll down for preservation. */
	const SCROLL_AT_TOP_THRESHOLD_PX = 100;

	/**
	 * Set when user scrolls to top (offset small, was previously far down). Skip preservation
	 * that would scroll down until we've applied (or cleared) this.
	 */
	let userScrolledToTop = false;

	function handleScroll(offset: number) {
		lastScrollTime = Date.now();
		if (offset <= SCROLL_AT_TOP_THRESHOLD_PX && scrollState.scrollTop > SCROLL_INTENT_THRESHOLD_PX) {
			userScrolledToTop = true;
		}
		const handle = listHandle;
		if (handle) {
			scrollInfo = { scrollTop: offset, startIndex: handle.findStartIndex() };
		}
	}

	$effect(() => {
		if (viewportEl && listHandle) {
			const wrapper = viewportEl.firstElementChild;
			const el = (wrapper?.firstElementChild ?? viewportEl.firstElementChild) as HTMLDivElement | null;
			if (scrollContainer && scrollContainer !== el) {
				scrollContainer.removeAttribute('data-event-list-scroll');
				scrollContainer.removeAttribute('id');
			}
			scrollContainer = el;
			scrollContainer?.setAttribute('data-event-list-scroll', 'true');
			scrollContainer?.setAttribute('id', 'event-list-scroll');
		} else {
			if (scrollContainer) {
				scrollContainer.removeAttribute('data-event-list-scroll');
				scrollContainer.removeAttribute('id');
			}
			scrollContainer = null;
		}
	});

	$effect(() => {
		const list = events;
		const handle = listHandle;
		if (!handle || list.length === 0) return;

		// Use scrollInfo (updated by onscroll) so we react to user scroll and have correct anchor.
		// Fall back to handle when scrollInfo not yet synced (e.g. initial load).
		const currentScrollTop = scrollInfo.scrollTop;
		const firstVisibleIndexFromDOM = scrollInfo.startIndex;

		const result = computeScrollPreservation({
			list,
			currentScrollTop,
			estimatedRowHeight,
			prev: scrollState,
			firstVisibleIndexFromDOM
		});

		const recentlyScrolled = Date.now() - lastScrollTime < PRESERVATION_COOLDOWN_MS;
		const scrollDelta = Math.abs(currentScrollTop - scrollState.scrollTop);
		const userMovedScroll = scrollDelta > SCROLL_INTENT_THRESHOLD_PX;
		const userAtTop = currentScrollTop <= SCROLL_AT_TOP_THRESHOLD_PX;
		const preservationWouldScrollDown =
			result.newScrollTop != null && result.newScrollTop > currentScrollTop + SCROLL_INTENT_THRESHOLD_PX;
		const scrollStateWasAtTop = scrollState.scrollTop <= SCROLL_AT_TOP_THRESHOLD_PX;
		const respectUserAtTop =
			(userAtTop || userScrolledToTop || scrollStateWasAtTop) && preservationWouldScrollDown;
		const shouldApply =
			result.shouldAdjust &&
			result.newScrollTop != null &&
			!recentlyScrolled &&
			!userMovedScroll &&
			!respectUserAtTop;

		if (shouldApply) {
			const targetScroll = result.newScrollTop!;
			queueMicrotask(() => {
				handle.scrollTo(targetScroll);
			});
		}

		// When we skip adjustment (recent scroll, user moved, or user chose top), keep state in sync with current view.
		const skipped =
			result.shouldAdjust &&
			(recentlyScrolled || userMovedScroll || respectUserAtTop);
		if (skipped) {
			if (userScrolledToTop) userScrolledToTop = false;
			// If user had scrolled to top, VList's shift may still move scroll; restore top.
			if (respectUserAtTop) {
				queueMicrotask(() => {
					handle.scrollTo(0);
				});
			}
			const firstVisibleIndex = Math.max(
				0,
				Math.min(list.length - 1, firstVisibleIndexFromDOM ?? 0)
			);
			scrollState = {
				anchorId: list[firstVisibleIndex]?.id ?? null,
				firstVisibleIndex,
				scrollTop: currentScrollTop,
				eventsLength: list.length
			};
		} else {
			scrollState = result.nextState;
		}
	});

	$effect(() => {
		if (paused && liveTailUnsub) {
			liveTailUnsub();
			liveTailUnsub = undefined;
		} else if (!paused && !liveTailUnsub) {
			liveTailUnsub = subscribeToLiveTail({ intervalMs: 2000 });
		}
		return () => {
			if (liveTailUnsub) liveTailUnsub();
		};
	});

	function clearFilters() {
		filterState.update((s) => ({
			...s,
			severities: [],
			services: [],
			environments: [],
			hosts: [],
			users: [],
			textSearch: '',
			fieldFilters: [],
			groups: []
		}));
	}
</script>

<div class="flex min-h-0 flex-1 flex-col" role="list">
	{#if events.length === 0}
		<div
			class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-text-muted"
		>
			<FilterX class="h-12 w-12 opacity-50" aria-hidden="true" />
			<p class="text-sm font-medium">No events match the current filters</p>
			<p class="max-w-xs text-xs">
				Try widening the time range or removing some filter chips above.
			</p>
			<button
				type="button"
				class="rounded-lg border border-border-default px-4 py-2 text-sm font-medium transition-colors hover:bg-hover-surface"
				onclick={clearFilters}
			>
				Clear all filters
			</button>
		</div>
	{:else}
		<div
			class="flex min-h-0 flex-1 flex-row gap-0"
			data-event-list-viewport
			data-testid="event-list-viewport"
			bind:this={viewportEl}
		>
			<div class="min-h-0 min-w-0 flex-1">
				<VList
					data={events}
					itemSize={estimatedRowHeight}
					shift={true}
					getKey={(e) => e.id}
					bind:this={listHandle}
					onscroll={handleScroll}
					style="height: 100%;"
				>
					{#snippet children(item, _index)}
						<EventRow
							event={item}
							density={densityValue}
							traceGroupSize={item.traceId ? traceIdCounts.get(item.traceId) : undefined}
						/>
					{/snippet}
				</VList>
			</div>
			<FollowCursorScrollbar container={scrollContainer} scrollTop={scrollInfo.scrollTop} />
		</div>
	{/if}
</div>

<style>
	/* Hide native scrollbar; custom FollowCursorScrollbar is used instead */
	:global([data-event-list-viewport] > div > div) {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}
	:global([data-event-list-viewport] > div > div::-webkit-scrollbar) {
		width: 0;
		height: 0;
		display: none;
	}
</style>
