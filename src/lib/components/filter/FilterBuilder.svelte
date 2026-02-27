<script lang="ts">
	import { filterState } from '$lib/stores/filterState.js';
	import { getTimeBounds } from '$lib/data/eventStore.js';
	import { SEVERITIES } from '$lib/types/filter.js';
	import type { TimeRangePreset } from '$lib/types/filter.js';
	import { Search, FilterX } from '@lucide/svelte';

	const filter = $derived($filterState);

	const hasAnyFilters = $derived(
		filter.severities.length > 0 ||
			filter.services.length > 0 ||
			filter.environments.length > 0 ||
			filter.hosts.length > 0 ||
			filter.users.length > 0 ||
			filter.textSearch.trim() !== '' ||
			filter.fieldFilters.length > 0
	);

	function clearAllFilters() {
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

	function timestampToDatetimeLocal(ts: number): string {
		const d = new Date(ts);
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		const h = String(d.getHours()).padStart(2, '0');
		const min = String(d.getMinutes()).padStart(2, '0');
		const s = String(d.getSeconds()).padStart(2, '0');
		return `${y}-${m}-${day}T${h}:${min}:${s}`;
	}

	function datetimeLocalToTimestamp(str: string): number {
		if (!str) return NaN;
		return new Date(str).getTime();
	}

	function setTimePreset(preset: TimeRangePreset) {
		filterState.update((s) => ({
			...s,
			timeRange: { type: 'preset', preset }
		}));
	}

	function setCustomTimeRange() {
		const bounds = getTimeBounds($filterState);
		filterState.update((s) => ({
			...s,
			timeRange: { type: 'absolute', range: { start: bounds.start, end: bounds.end } }
		}));
	}

	let customStartInput = $state('');
	let customEndInput = $state('');
	$effect(() => {
		if ($filterState.timeRange.type === 'absolute') {
			customStartInput = timestampToDatetimeLocal($filterState.timeRange.range.start);
			customEndInput = timestampToDatetimeLocal($filterState.timeRange.range.end);
		}
	});

	function applyCustomStart(value: string) {
		const start = datetimeLocalToTimestamp(value);
		if (Number.isNaN(start)) return;
		filterState.update((s) => {
			if (s.timeRange.type !== 'absolute') return s;
			const end = s.timeRange.range.end;
			return { ...s, timeRange: { type: 'absolute', range: { start: Math.min(start, end), end } } };
		});
	}

	function applyCustomEnd(value: string) {
		const end = datetimeLocalToTimestamp(value);
		if (Number.isNaN(end)) return;
		filterState.update((s) => {
			if (s.timeRange.type !== 'absolute') return s;
			const start = s.timeRange.range.start;
			return { ...s, timeRange: { type: 'absolute', range: { start, end: Math.max(end, start) } } };
		});
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
	<h2 class="text-sm font-semibold text-text-primary">Time range</h2>
	<div class="flex flex-wrap gap-2">
		{#each (['15m', '1h', '24h'] as const) as preset}
			<button
				type="button"
				class="px-2 py-1 rounded text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 {filter.timeRange.type === 'preset' &&
				filter.timeRange.preset === preset
					? 'border-2 border-brand-primary bg-selected-bg text-brand-primary'
					: 'border border-border-default text-text-primary hover:bg-hover-surface'}"
				onclick={() => setTimePreset(preset)}
			>
				{preset}
			</button>
		{/each}
		<button
			type="button"
			class="px-2 py-1 rounded text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 {filter.timeRange.type === 'absolute'
				? 'border-2 border-brand-primary bg-selected-bg text-brand-primary'
				: 'border border-border-default text-text-primary hover:bg-hover-surface'}"
			onclick={() => setCustomTimeRange()}
		>
			Custom
		</button>
	</div>
	{#if filter.timeRange.type === 'absolute'}
		<div class="space-y-2 pl-0 pt-1">
			<label class="block text-xs font-medium text-text-muted" for="time-range-start">From</label>
			<input
				id="time-range-start"
				type="datetime-local"
				step="1"
				class="w-full rounded border border-border-default bg-surface-1 px-2 py-1.5 text-sm text-text-primary"
				bind:value={customStartInput}
				onchange={() => applyCustomStart(customStartInput)}
				onblur={() => applyCustomStart(customStartInput)}
			/>
			<label class="block text-xs font-medium text-text-muted" for="time-range-end">To</label>
			<input
				id="time-range-end"
				type="datetime-local"
				step="1"
				class="w-full rounded border border-border-default bg-surface-1 px-2 py-1.5 text-sm text-text-primary"
				bind:value={customEndInput}
				onchange={() => applyCustomEnd(customEndInput)}
				onblur={() => applyCustomEnd(customEndInput)}
			/>
		</div>
	{/if}

	<h2 class="text-sm font-semibold text-text-primary pt-2">Search</h2>
	<div class="relative">
		<Search
			class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-faint pointer-events-none"
			aria-hidden="true"
		/>
		<input
			id="pulseboard-search"
			type="search"
			placeholder="Search messages..."
			class="w-full pl-10 pr-3 py-2 rounded border border-border-default bg-surface-1 text-text-primary placeholder-text-faint"
			bind:value={searchInput}
			oninput={(e) => updateSearch((e.target as HTMLInputElement).value)}
			aria-label="Search events"
		/>
	</div>

	<h2 class="text-sm font-semibold text-text-primary pt-2">Severity</h2>
	<div class="flex flex-wrap gap-1">
		{#each SEVERITIES as sev}
			<button
				type="button"
				class="px-2 py-1 rounded text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 {filter.severities.includes(sev)
					? 'border-2 border-severity-warn bg-severity-warn/20 text-severity-warn'
					: 'border border-border-default text-text-primary hover:bg-hover-surface'}"
				onclick={() => toggleSeverity(sev)}
			>
				{sev}
			</button>
		{/each}
	</div>

	<h2 class="text-sm font-semibold text-text-primary pt-2">Services</h2>
	<div class="flex flex-wrap gap-1">
		{#each SERVICES as svc}
			<button
				type="button"
				class="px-2 py-1 rounded text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 {filter.services.includes(svc)
					? 'border-2 border-brand-primary bg-selected-bg text-brand-primary'
					: 'border border-border-default text-text-primary hover:bg-hover-surface'}"
				onclick={() => toggleService(svc)}
			>
				{svc}
			</button>
		{/each}
	</div>

	<h2 class="text-sm font-semibold text-text-primary pt-2">Environments</h2>
	<div class="flex flex-wrap gap-1">
		{#each ENVS as env}
			<button
				type="button"
				class="px-2 py-1 rounded text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 {filter.environments.includes(env)
					? 'border-2 border-brand-teal bg-brand-teal/20 text-brand-teal'
					: 'border border-border-default text-text-primary hover:bg-hover-surface'}"
				onclick={() => toggleEnv(env)}
			>
				{env}
			</button>
		{/each}
	</div>

	{#if hasAnyFilters}
		<div class="pt-4 border-t border-border-default">
			<button
				type="button"
				class="w-full inline-flex items-center justify-center gap-2 rounded border border-border-default bg-surface-2 px-3 py-2 text-sm font-medium text-text-primary hover:bg-hover-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
				onclick={clearAllFilters}
				aria-label="Clear all filters"
			>
				<FilterX class="w-4 h-4 shrink-0" aria-hidden="true" />
				Clear filters
			</button>
		</div>
	{/if}
</div>
