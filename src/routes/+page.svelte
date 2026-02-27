<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import AppShell from '$lib/components/app/AppShell.svelte';
	import { filterState, selectedEventId, serializeToUrl, parseFromUrl, mergeFilterState, getDefaultFilterState } from '$lib/stores/index.js';
	import { filteredEvents } from '$lib/data/eventStore.js';

	// Hydrate filter from URL on load (client)
	onMount(() => {
		const params = $page.url.searchParams;
		if (params.toString()) {
			const partial = parseFromUrl(params);
			filterState.set(mergeFilterState(getDefaultFilterState(), partial));
		}
	});

	const events = $derived($filteredEvents);
	let urlSyncTimeout: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		const state = $filterState;
		if (urlSyncTimeout) clearTimeout(urlSyncTimeout);
		urlSyncTimeout = setTimeout(() => {
			const params = serializeToUrl(state);
			const q = params.toString();
			const path = q ? `?${q}` : window.location.pathname;
			if (path !== window.location.pathname + window.location.search) {
				goto(path, { replaceState: true, noScroll: true });
			}
		}, 300);
		return () => {
			if (urlSyncTimeout) clearTimeout(urlSyncTimeout);
		};
	});

	// Keyboard: j/k move selection, Enter open details, / focus search
	function handleKeydown(e: KeyboardEvent) {
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
			if (e.key === '/') return;
			return;
		}
		if (e.key === '/') {
			e.preventDefault();
			document.getElementById('pulseboard-search')?.focus();
			return;
		}
		const selected = $selectedEventId;
		const idx = selected ? events.findIndex((ev) => ev.id === selected) : -1;
		if (e.key === 'j' || e.key === 'k') {
			e.preventDefault();
			const next = e.key === 'j' ? idx + 1 : idx - 1;
			if (next >= 0 && next < events.length) {
				selectedEventId.set(events[next].id);
			} else if (idx < 0 && events.length > 0) {
				selectedEventId.set(events[0].id);
			}
			return;
		}
		if (e.key === 'Enter' && selected) {
			// Already showing detail panel when selected
			e.preventDefault();
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

<AppShell />
