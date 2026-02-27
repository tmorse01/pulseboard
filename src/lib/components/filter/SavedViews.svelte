<script lang="ts">
	import type { SavedView } from '$lib/types/filter.js';
	import { filterState, savedViewId } from '$lib/stores/filterState.js';
	import { get } from 'svelte/store';

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

<div class="relative">
	<button
		type="button"
		class="px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-sm"
		onclick={() => (open = !open)}
		aria-haspopup="listbox"
		aria-expanded={open}
	>
		Saved views
	</button>
	{#if open}
		<div
			class="absolute right-0 top-full mt-1 w-64 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg z-50 py-2"
			role="listbox"
		>
			<div class="px-3 pb-2 border-b border-neutral-200 dark:border-neutral-700">
				<button
					type="button"
					class="w-full text-left px-2 py-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-sm font-medium"
					onclick={createView}
				>
					+ Save current view
				</button>
			</div>
			{#each views as v}
				<div
					class="flex items-center justify-between gap-2 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
				>
					<button
						type="button"
						class="flex-1 text-left text-sm truncate"
						onclick={() => applyView(v)}
					>
						{v.name}
						{#if v.isDefault}
							<span class="text-xs text-neutral-400">(default)</span>
						{/if}
					</button>
					<button
						type="button"
						class="text-xs text-neutral-500 hover:text-neutral-700"
						onclick={() => setDefault(v)}
						title="Set as default"
					>
						★
					</button>
					<button
						type="button"
						class="text-xs text-red-600 hover:text-red-700"
						onclick={() => deleteView(v)}
						aria-label="Delete view"
					>
						×
					</button>
				</div>
			{/each}
			{#if views.length === 0}
				<p class="px-3 py-2 text-sm text-neutral-500">No saved views yet.</p>
			{/if}
		</div>
	{/if}
</div>
