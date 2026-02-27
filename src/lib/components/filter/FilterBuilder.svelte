<script lang="ts">
	import { filterState } from '$lib/stores/filterState.js';
	import { SEVERITIES } from '$lib/types/filter.js';
	import type { TimeRangePreset } from '$lib/types/filter.js';
	import { Search } from '@lucide/svelte';

	const filter = $derived($filterState);

	let searchInput = $state('');
	$effect(() => {
		searchInput = $filterState.textSearch;
	});
	let searchDebounce: ReturnType<typeof setTimeout> | undefined;

	function updateSearch(value: string) {
		searchInput = value;
		if (searchDebounce) clearTimeout(searchDebounce);
		searchDebounce = setTimeout(() => {
			filterState.update((s) => ({ ...s, textSearch: value }));
		}, 300);
	}

	function setTimePreset(preset: TimeRangePreset) {
		filterState.update((s) => ({
			...s,
			timeRange: { type: 'preset', preset }
		}));
	}

	function toggleSeverity(sev: (typeof SEVERITIES)[number]) {
		filterState.update((s) => {
			const next = s.severities.includes(sev)
				? s.severities.filter((x) => x !== sev)
				: [...s.severities, sev];
			return { ...s, severities: next };
		});
	}

	const SERVICES = ['api', 'worker', 'web', 'db', 'auth', 'cache'];
	const ENVS = ['prod', 'staging', 'dev'];

	function toggleService(svc: string) {
		filterState.update((s) => {
			const next = s.services.includes(svc)
				? s.services.filter((x) => x !== svc)
				: [...s.services, svc];
			return { ...s, services: next };
		});
	}

	function toggleEnv(env: string) {
		filterState.update((s) => {
			const next = s.environments.includes(env)
				? s.environments.filter((x) => x !== env)
				: [...s.environments, env];
			return { ...s, environments: next };
		});
	}
</script>

<div class="p-3 space-y-4">
	<h2 class="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Time range</h2>
	<div class="flex flex-wrap gap-2">
		{#each (['15m', '1h', '24h'] as const) as preset}
			<button
				type="button"
				class="px-2 py-1 rounded text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 {filter.timeRange.type === 'preset' &&
				filter.timeRange.preset === preset
					? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
					: 'border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'}"
				onclick={() => setTimePreset(preset)}
			>
				{preset}
			</button>
		{/each}
	</div>

	<h2 class="text-sm font-semibold text-neutral-700 dark:text-neutral-300 pt-2">Search</h2>
	<div class="relative">
		<Search
			class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none"
			aria-hidden="true"
		/>
		<input
			id="pulseboard-search"
			type="search"
			placeholder="Search messages..."
			class="w-full pl-10 pr-3 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400"
			bind:value={searchInput}
			oninput={(e) => updateSearch((e.target as HTMLInputElement).value)}
			aria-label="Search events"
		/>
	</div>

	<h2 class="text-sm font-semibold text-neutral-700 dark:text-neutral-300 pt-2">Severity</h2>
	<div class="flex flex-wrap gap-1">
		{#each SEVERITIES as sev}
			<button
				type="button"
				class="px-2 py-1 rounded text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 {filter.severities.includes(sev)
					? 'border-2 border-amber-500 bg-amber-50 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200'
					: 'border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'}"
				onclick={() => toggleSeverity(sev)}
			>
				{sev}
			</button>
		{/each}
	</div>

	<h2 class="text-sm font-semibold text-neutral-700 dark:text-neutral-300 pt-2">Services</h2>
	<div class="flex flex-wrap gap-1">
		{#each SERVICES as svc}
			<button
				type="button"
				class="px-2 py-1 rounded text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 {filter.services.includes(svc)
					? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
					: 'border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'}"
				onclick={() => toggleService(svc)}
			>
				{svc}
			</button>
		{/each}
	</div>

	<h2 class="text-sm font-semibold text-neutral-700 dark:text-neutral-300 pt-2">Environments</h2>
	<div class="flex flex-wrap gap-1">
		{#each ENVS as env}
			<button
				type="button"
				class="px-2 py-1 rounded text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 {filter.environments.includes(env)
					? 'border-2 border-sky-500 bg-sky-50 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200'
					: 'border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'}"
				onclick={() => toggleEnv(env)}
			>
				{env}
			</button>
		{/each}
	</div>
</div>
