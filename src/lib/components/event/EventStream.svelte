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

	const events = $derived($filteredEvents);
	const densityValue = $derived($density);
	const paused = $derived($liveTailPaused);
	const estimatedRowHeight = $derived(densityValue === 'compact' ? 32 : 40);

	let listHandle = $state<VListHandle | null>(null);
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

	function handleScroll(offset: number) {
		const handle = listHandle;
		if (handle) {
			scrollInfo = { scrollTop: offset, startIndex: handle.findStartIndex() };
		}
	}

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

		if (result.shouldAdjust && result.newScrollTop != null) {
			const targetScroll = result.newScrollTop;
			queueMicrotask(() => {
				handle.scrollTo(targetScroll);
			});
		}

		scrollState = result.nextState;
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
		<div class="flex min-h-0 flex-1 flex-col" data-testid="event-list-viewport">
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
					<EventRow event={item} density={densityValue} />
				{/snippet}
			</VList>
		</div>
	{/if}
</div>
