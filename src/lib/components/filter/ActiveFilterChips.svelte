<script lang="ts">
	import { filterState } from '$lib/stores/filterState.js';
	import { DEFAULT_TIME_PRESET } from '$lib/types/filter.js';
	import { X, FilterX } from '@lucide/svelte';

	const filter = $filterState;

	function formatTimeRangeLabel(start: number, end: number): string {
		const s = new Date(start);
		const e = new Date(end);
		const sameDay = s.toDateString() === e.toDateString();
		if (sameDay) {
			return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${s.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })} – ${e.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
		}
		return `${s.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} – ${e.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
	}

	function removeCustomTimeRange() {
		filterState.update((s) => ({
			...s,
			timeRange: { type: 'preset', preset: DEFAULT_TIME_PRESET }
		}));
	}

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

	function removeHost(host: string) {
		filterState.update((s) => ({
			...s,
			hosts: s.hosts.filter((x) => x !== host)
		}));
	}

	function removeUser(user: string) {
		filterState.update((s) => ({
			...s,
			users: s.users.filter((x) => x !== user)
		}));
	}

	function removeFieldFilter(index: number) {
		filterState.update((s) => ({
			...s,
			fieldFilters: s.fieldFilters.filter((_, i) => i !== index)
		}));
	}

	function clearAll() {
		filterState.update((s) => ({
			...s,
			timeRange: { type: 'preset', preset: DEFAULT_TIME_PRESET },
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

	const hasAny = $derived(
		(filter.timeRange.type === 'absolute') ||
			filter.severities.length > 0 ||
			filter.services.length > 0 ||
			filter.environments.length > 0 ||
			filter.hosts.length > 0 ||
			filter.users.length > 0 ||
			filter.textSearch.trim() !== '' ||
			filter.fieldFilters.length > 0
	);
</script>

{#if hasAny}
	<div class="flex flex-wrap items-center gap-2 py-1">
		{#if filter.timeRange.type === 'absolute'}
			<span
				class="inline-flex items-center gap-1 rounded-full border-l-2 border-l-brand-primary bg-selected-bg px-2 py-0.5 text-xs text-text-primary"
			>
				time: {formatTimeRangeLabel(filter.timeRange.range.start, filter.timeRange.range.end)}
				<button
					type="button"
					class="hover:bg-hover-surface rounded-full p-0.5"
					aria-label="Remove time range"
					onclick={() => removeCustomTimeRange()}
				>
					<X class="w-3.5 h-3.5" aria-hidden="true" />
				</button>
			</span>
		{/if}
		{#each filter.severities as sev}
			<span
				class="inline-flex items-center gap-1 rounded-full border-l-2 border-l-severity-warn bg-selected-bg px-2 py-0.5 text-xs text-text-primary"
			>
				severity: {sev}
				<button
					type="button"
					class="hover:bg-hover-surface rounded-full p-0.5"
					aria-label="Remove severity {sev}"
					onclick={() => removeSeverity(sev)}
				>
					<X class="w-3.5 h-3.5" aria-hidden="true" />
				</button>
			</span>
		{/each}
		{#each filter.services as svc}
			<span
				class="inline-flex items-center gap-1 rounded-full border-l-2 border-l-brand-primary bg-selected-bg px-2 py-0.5 text-xs text-text-primary"
			>
				service: {svc}
				<button
					type="button"
					class="hover:bg-hover-surface rounded-full p-0.5"
					aria-label="Remove service {svc}"
					onclick={() => removeService(svc)}
				>
					<X class="w-3.5 h-3.5" aria-hidden="true" />
				</button>
			</span>
		{/each}
		{#each filter.environments as env}
			<span
				class="inline-flex items-center gap-1 rounded-full border-l-2 border-l-brand-teal bg-selected-bg px-2 py-0.5 text-xs text-text-primary"
			>
				env: {env}
				<button
					type="button"
					class="hover:bg-hover-surface rounded-full p-0.5"
					aria-label="Remove env {env}"
					onclick={() => removeEnv(env)}
				>
					<X class="w-3.5 h-3.5" aria-hidden="true" />
				</button>
			</span>
		{/each}
		{#each filter.hosts as host}
			<span
				class="inline-flex items-center gap-1 rounded-full border-l-2 border-l-viz-6 bg-selected-bg px-2 py-0.5 text-xs text-text-primary"
			>
				host: {host}
				<button
					type="button"
					class="hover:bg-hover-surface rounded-full p-0.5"
					aria-label="Remove host {host}"
					onclick={() => removeHost(host)}
				>
					<X class="w-3.5 h-3.5" aria-hidden="true" />
				</button>
			</span>
		{/each}
		{#each filter.users as user}
			<span
				class="inline-flex items-center gap-1 rounded-full border-l-2 border-l-brand-teal bg-selected-bg px-2 py-0.5 text-xs text-text-primary"
			>
				user: {user}
				<button
					type="button"
					class="hover:bg-hover-surface rounded-full p-0.5"
					aria-label="Remove user {user}"
					onclick={() => removeUser(user)}
				>
					<X class="w-3.5 h-3.5" aria-hidden="true" />
				</button>
			</span>
		{/each}
		{#each filter.fieldFilters as f, i}
			<span
				class="inline-flex items-center gap-1 rounded-full bg-surface-3 border border-border-soft px-2 py-0.5 text-xs font-mono text-text-primary"
			>
				{f.key}: {f.value}
				<button
					type="button"
					class="hover:bg-hover-surface rounded-full p-0.5"
					aria-label="Remove {f.key} filter"
					onclick={() => removeFieldFilter(i)}
				>
					<X class="w-3.5 h-3.5" aria-hidden="true" />
				</button>
			</span>
		{/each}
		{#if filter.textSearch.trim()}
			<span
				class="inline-flex items-center gap-1 rounded-full bg-surface-3 border border-border-soft px-2 py-0.5 text-xs text-text-primary"
			>
				"{filter.textSearch.trim()}"
				<button
					type="button"
					class="hover:bg-hover-surface rounded-full p-0.5"
					aria-label="Clear search"
					onclick={() => filterState.update((s) => ({ ...s, textSearch: '' }))}
				>
					<X class="w-3.5 h-3.5" aria-hidden="true" />
				</button>
			</span>
		{/if}
		<button
			type="button"
			class="inline-flex items-center gap-1.5 rounded border border-border-default bg-surface-2 px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-hover-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
			onclick={clearAll}
			aria-label="Clear all filters"
		>
			<FilterX class="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
			Clear filters
		</button>
	</div>
{/if}
