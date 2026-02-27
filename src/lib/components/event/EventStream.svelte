<script lang="ts">
	import SvelteVirtualList from '@humanspeak/svelte-virtual-list';
	import type { LogEvent } from '$lib/types/event.js';
	import { filteredEvents, subscribeToLiveTail } from '$lib/data/eventStore.js';
	import { density, liveTailPaused, filterState } from '$lib/stores/index.js';
	import EventRow from './EventRow.svelte';
	import { FilterX } from '@lucide/svelte';

	const events = $derived($filteredEvents);
	const densityValue = $derived($density);
	const paused = $derived($liveTailPaused);

	let listRef = $state<import('@humanspeak/svelte-virtual-list').default<LogEvent> | undefined>(
		undefined
	);
	let liveTailUnsub: (() => void) | undefined;

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
		<SvelteVirtualList
			bind:this={listRef}
			items={events}
			defaultEstimatedItemHeight={densityValue === 'compact' ? 32 : 40}
			containerClass="virtual-list-container flex-1 min-h-0"
		>
			{#snippet renderItem(event, index)}
				<EventRow {event} density={densityValue} />
			{/snippet}
		</SvelteVirtualList>
	{/if}
</div>
