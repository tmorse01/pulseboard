<script lang="ts">
	import { filteredEvents } from '$lib/data/eventStore.js';
	import { filterState } from '$lib/stores/filterState.js';
	import type { Severity } from '$lib/types/event.js';

	const events = $derived($filteredEvents);

	const SERVICES_ORDER = ['api', 'worker', 'web', 'db', 'auth', 'cache'] as const;
	const SEVERITIES_ORDER: Severity[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

	// Grid: service -> severity -> count
	const heatmapData = $derived.by(() => {
		const grid = new Map<string, Map<Severity, number>>();
		for (const svc of SERVICES_ORDER) {
			grid.set(svc, new Map(SEVERITIES_ORDER.map((s) => [s, 0])));
		}
		for (const e of events) {
			const row = grid.get(e.service);
			if (row) {
				row.set(e.severity, (row.get(e.severity) ?? 0) + 1);
			} else {
				if (!grid.has(e.service)) {
					grid.set(e.service, new Map(SEVERITIES_ORDER.map((s) => [s, 0])));
				}
				grid.get(e.service)!.set(e.severity, (grid.get(e.service)!.get(e.severity) ?? 0) + 1);
			}
		}
		return grid;
	});
	// Always render exactly 6 rows (SERVICES_ORDER) to prevent layout shift when filters change
	const rowsToShow = $derived([...SERVICES_ORDER]);
	const maxCount = $derived(
		Math.max(
			1,
			...Array.from(heatmapData.values()).flatMap((row) =>
				Array.from(row.values())
			)
		)
	);

	function formatCount(count: number): string {
		if (count <= 0) return '—';
		if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
		return String(count);
	}

	function cellBackgroundStyle(count: number, severity: Severity): string {
		if (count <= 0) {
			return 'background-color: var(--color-bg-subtle);';
		}
		const pct = Math.round((0.15 + 0.8 * (count / maxCount)) * 100);
		return `background: color-mix(in srgb, var(--color-severity-${severity}) ${pct}%, var(--color-bg-subtle));`;
	}

	function handleCellClick(service: string, severity: Severity) {
		console.debug('[Heatmap] cell clicked', { service, severity });
		filterState.update((s) => {
			const nextServices = s.services.includes(service) ? s.services : [...s.services, service];
			const nextSeverities = s.severities.includes(severity) ? s.severities : [...s.severities, severity];
			console.debug('[Heatmap] updating filters', {
				services: nextServices,
				severities: nextSeverities
			});
			return {
				...s,
				services: nextServices,
				severities: nextSeverities
			};
		});
	}
</script>

<div
	class="rounded-lg border border-border-default bg-surface-2 p-2 transition-opacity duration-200"
	role="img"
	aria-label="Service by severity heatmap. Click a cell to filter by that service and severity."
>
	<h3 class="text-xs font-semibold text-text-muted mb-1">
		Service × severity
	</h3>
	<div class="overflow-x-auto overflow-y-hidden rounded border border-border-soft" style="width: 100%;">
		<table
			class="heatmap-table border-collapse text-xs"
			style="table-layout: fixed; width: 21rem; min-width: 21rem;"
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
					{#each SEVERITIES_ORDER as sev}
						<th
							class="py-1 text-[10px] font-medium text-text-muted text-center border-r border-border-default last:border-r-0 bg-bg-subtle truncate"
							style="width: 2.75rem; min-width: 2.75rem;"
							title={sev}
						>
							{sev}
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
							{#each SEVERITIES_ORDER as sev}
								{@const count = row.get(sev) ?? 0}
								<td
									class="p-0.5 border-r border-border-soft last:border-r-0 align-middle"
									style="width: 2.75rem; min-width: 2.75rem;"
								>
									<button
										type="button"
										class="cell-btn h-5 w-full min-w-0 overflow-hidden rounded-sm text-[10px] tabular-nums transition-[background-color] duration-150 focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-inset"
										style={cellBackgroundStyle(count, sev)}
										title="{svc} / {sev}: {count.toLocaleString()}"
										onclick={() => handleCellClick(svc, sev)}
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
		Click a cell to filter by that service and severity.
	</p>
</div>
