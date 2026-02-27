<script lang="ts">
	import type { SavedView } from '$lib/types/filter.js';
	import { filterState, savedViewId } from '$lib/stores/filterState.js';
	import { get } from 'svelte/store';
	import { Star, X, Bookmark } from '@lucide/svelte';
	import { clickOutside } from '$lib/utils/clickOutside.js';

	const STORAGE_KEY = 'pulseboard-saved-views';

	let open = $state(false);
	let views = $state<SavedView[]>([]);

	function loadViews() {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) views = JSON.parse(raw);
			else views = [];
		} catch {
			views = [];
		}
	}

	function saveViews() {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
	}

	$effect(() => {
		if (open) loadViews();
	});

	function applyView(v: SavedView) {
		filterState.set(v.filterState);
		savedViewId.set(v.id);
		open = false;
	}

	function createView() {
		const name = prompt('View name');
		if (!name?.trim()) return;
		const state = get(filterState);
		const id = crypto.randomUUID();
		const newView: SavedView = {
			id,
			name: name.trim(),
			filterState: { ...state },
			isDefault: views.length === 0
		};
		views = [...views, newView];
		saveViews();
		savedViewId.set(id);
		open = false;
	}

	function deleteView(v: SavedView) {
		views = views.filter((x) => x.id !== v.id);
		if (get(savedViewId) === v.id) savedViewId.set(null);
		saveViews();
	}

	function setDefault(v: SavedView) {
		views = views.map((x) => ({ ...x, isDefault: x.id === v.id }));
		saveViews();
	}
</script>

<div class="relative" use:clickOutside={{ open, onClose: () => (open = false) }}>
	<button
		type="button"
		class="flex items-center gap-2 px-3 py-1.5 rounded border border-border-default hover:bg-hover-surface text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
		onclick={() => (open = !open)}
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-label="Saved views"
	>
		<Bookmark class="w-4 h-4 shrink-0" aria-hidden="true" />
		<span class="hidden md:inline">Saved views</span>
	</button>
	{#if open}
		<div
			class="absolute right-0 top-full mt-1 w-64 rounded border border-border-default bg-surface-2 shadow-lg z-50 py-2"
			role="listbox"
		>
			<div class="px-3 pb-2 border-b border-border-default">
				<button
					type="button"
					class="w-full text-left px-2 py-1.5 rounded hover:bg-hover-surface text-sm font-medium"
					onclick={createView}
				>
					+ Save current view
				</button>
			</div>
			{#each views as v}
				<div
					class="flex items-center justify-between gap-2 px-3 py-2 hover:bg-hover-surface"
				>
					<button
						type="button"
						class="flex-1 text-left text-sm truncate"
						onclick={() => applyView(v)}
					>
						{v.name}
						{#if v.isDefault}
							<span class="text-xs text-text-faint">(default)</span>
						{/if}
					</button>
				<button
					type="button"
					class="text-xs text-text-muted hover:text-text-primary"
					onclick={() => setDefault(v)}
					title="Set as default"
				>
					<Star class="w-4 h-4" aria-hidden="true" />
				</button>
				<button
					type="button"
					class="text-xs text-severity-error hover:opacity-80 p-0.5"
					onclick={() => deleteView(v)}
					aria-label="Delete view"
				>
					<X class="w-4 h-4" aria-hidden="true" />
				</button>
				</div>
			{/each}
			{#if views.length === 0}
				<p class="px-3 py-2 text-sm text-text-muted">No saved views yet.</p>
			{/if}
		</div>
	{/if}
</div>
