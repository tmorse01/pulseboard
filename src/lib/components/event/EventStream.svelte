<script lang="ts">
	import SvelteVirtualList from '@humanspeak/svelte-virtual-list';
	import type { LogEvent } from '$lib/types/event.js';
	import { filteredEvents, subscribeToLiveTail } from '$lib/data/eventStore.js';
	import { density, liveTailPaused } from '$lib/stores/index.js';
	import EventRow from './EventRow.svelte';

	const events = $derived($filteredEvents);
	const densityValue = $derived($density);
	const paused = $derived($liveTailPaused);

	let listRef: import('@humanspeak/svelte-virtual-list').default<LogEvent> | undefined;
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
</script>

<div class="flex-1 min-h-0 flex flex-col" role="list">
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
</div>
