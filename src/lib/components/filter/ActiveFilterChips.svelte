<script lang="ts">
	import { filterState } from '$lib/stores/filterState.js';

	const filter = $filterState;

	function removeSeverity(sev: string) {
		filterState.update((s) => ({
			...s,
			severities: s.severities.filter((x) => x !== sev)
		}));
	}

	function removeService(svc: string) {
		filterState.update((s) => ({
			...s,
			services: s.services.filter((x) => x !== svc)
		}));
	}

	function removeEnv(env: string) {
		filterState.update((s) => ({
			...s,
			environments: s.environments.filter((x) => x !== env)
		}));
	}

	function clearAll() {
		filterState.update((s) => ({
			...s,
			severities: [],
			services: [],
			environments: [],
			textSearch: ''
		}));
	}

	const hasAny = $derived(
		filter.severities.length > 0 ||
			filter.services.length > 0 ||
			filter.environments.length > 0 ||
			filter.textSearch.trim() !== ''
	);
</script>

{#if hasAny}
	<div class="flex flex-wrap items-center gap-2 py-1">
		{#each filter.severities as sev}
			<span
				class="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs"
			>
				severity: {sev}
				<button
					type="button"
					class="hover:bg-amber-200 dark:hover:bg-amber-800 rounded-full p-0.5"
					aria-label="Remove severity {sev}"
					onclick={() => removeSeverity(sev)}
				>
					×
				</button>
			</span>
		{/each}
		{#each filter.services as svc}
			<span
				class="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs"
			>
				service: {svc}
				<button
					type="button"
					class="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
					aria-label="Remove service {svc}"
					onclick={() => removeService(svc)}
				>
					×
				</button>
			</span>
		{/each}
		{#each filter.environments as env}
			<span
				class="inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-900/30 px-2 py-0.5 text-xs"
			>
				env: {env}
				<button
					type="button"
					class="hover:bg-sky-200 dark:hover:bg-sky-800 rounded-full p-0.5"
					aria-label="Remove env {env}"
					onclick={() => removeEnv(env)}
				>
					×
				</button>
			</span>
		{/each}
		{#if filter.textSearch.trim()}
			<span
				class="inline-flex items-center gap-1 rounded-full bg-neutral-200 dark:bg-neutral-700 px-2 py-0.5 text-xs"
			>
				"{filter.textSearch.trim()}"
				<button
					type="button"
					class="hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded-full p-0.5"
					aria-label="Clear search"
					onclick={() => filterState.update((s) => ({ ...s, textSearch: '' }))}
				>
					×
				</button>
			</span>
		{/if}
		<button
			type="button"
			class="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 underline"
			onclick={clearAll}
		>
			Clear all
		</button>
	</div>
{/if}
