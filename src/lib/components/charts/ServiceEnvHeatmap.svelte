<script lang="ts">
	import { filteredEvents } from '$lib/data/eventStore.js';
	import { filterState } from '$lib/stores/filterState.js';

	const events = $derived($filteredEvents);

	const SERVICES_ORDER = ['api', 'worker', 'web', 'db', 'auth', 'cache'] as const;
	const ENVS_ORDER = ['prod', 'staging', 'dev'] as const;

	// Grid: service -> env -> count
	const heatmapData = $derived.by(() => {
		const grid = new Map<string, Map<string, number>>();
		for (const svc of SERVICES_ORDER) {
			grid.set(svc, new Map(ENVS_ORDER.map((e) => [e, 0])));
		}
		for (const e of events) {
			const row = grid.get(e.service);
			if (row) {
				row.set(e.env, (row.get(e.env) ?? 0) + 1);
			} else {
				if (!grid.has(e.service)) {
					grid.set(e.service, new Map(ENVS_ORDER.map((env) => [env, 0])));
				}
				grid.get(e.service)!.set(e.env, (grid.get(e.service)!.get(e.env) ?? 0) + 1);
			}
		}
		return grid;
	});

	const rowsToShow = $derived([...SERVICES_ORDER]);
	const maxCount = $derived(
		Math.max(
			1,
			...Array.from(heatmapData.values()).flatMap((row) => Array.from(row.values()))
		)
	);

	function formatCount(count: number): string {
		if (count <= 0) return '—';
		if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
		return String(count);
	}

	function cellBackgroundStyle(count: number): string {
		if (count <= 0) {
			return 'background-color: var(--color-bg-subtle);';
		}
		const pct = Math.round((0.2 + 0.75 * (count / maxCount)) * 100);
		return `background: color-mix(in srgb, var(--color-viz-2) ${pct}%, var(--color-bg-subtle));`;
	}

	function handleCellClick(service: string, env: string) {
		filterState.update((s) => ({
			...s,
			services: s.services.includes(service) ? s.services : [...s.services, service],
			environments: s.environments.includes(env) ? s.environments : [...s.environments, env]
		}));
	}
</script>

<div
	class="rounded-lg border border-border-default bg-surface-2 p-2 transition-opacity duration-200"
	role="img"
	aria-label="Service by environment heatmap. Click a cell to filter by that service and environment."
>
	<h3 class="text-xs font-semibold text-text-muted mb-1">
		Service × environment
	</h3>
	<div class="overflow-x-auto overflow-y-hidden rounded border border-border-soft" style="width: 100%;">
		<table
			class="w-full border-collapse text-xs"
			style="table-layout: fixed; width: 14rem; min-width: 14rem;"
			role="grid"
		>
			<thead>
				<tr class="border-b border-border-default">
					<th
						class="text-left py-1 pl-1.5 pr-2 text-[10px] font-medium text-text-muted border-r border-border-default bg-bg-subtle"
						style="width: 4.5rem;"
					>
						Service
					</th>
					{#each ENVS_ORDER as env}
						<th
							class="py-1 text-[10px] font-medium text-text-muted text-center border-r border-border-default last:border-r-0 bg-bg-subtle truncate"
							style="width: 2.5rem; min-width: 2.5rem;"
							title={env}
						>
							{env}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each rowsToShow as svc}
					{@const row = heatmapData.get(svc)}
					{#if row}
						<tr class="border-b border-border-soft last:border-b-0">
							<td
								class="py-0 pr-1.5 pl-1.5 text-[11px] font-medium text-text-primary truncate border-r border-border-default"
								style="width: 4.5rem;"
								title={svc}
							>
								{svc}
							</td>
							{#each ENVS_ORDER as env}
								{@const count = row.get(env) ?? 0}
								<td
									class="p-0.5 border-r border-border-soft last:border-r-0 align-middle"
									style="width: 2.5rem; min-width: 2.5rem;"
								>
									<button
										type="button"
										class="cell-btn h-5 w-full min-w-0 overflow-hidden rounded-sm text-[10px] tabular-nums transition-[background-color] duration-150 focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-inset"
										style={cellBackgroundStyle(count)}
										title="{svc} / {env}: {count.toLocaleString()}"
										onclick={() => handleCellClick(svc, env)}
									>
										<span class="block truncate {count > 0 ? 'text-text-primary font-medium' : 'text-text-faint'}">
											{formatCount(count)}
										</span>
									</button>
								</td>
							{/each}
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
	<p class="text-[10px] text-text-faint mt-1">
		Click a cell to filter by service and environment.
	</p>
</div>
