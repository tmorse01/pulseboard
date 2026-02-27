<script lang="ts">
	import { filteredEvents } from '$lib/data/eventStore.js';

	const events = $derived($filteredEvents);

	// Top services by event count and by error count
	const byVolume = $derived.by(() => {
		const m = new Map<string, number>();
		for (const e of events) {
			m.set(e.service, (m.get(e.service) ?? 0) + 1);
		}
		return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
	});

	const byErrors = $derived.by(() => {
		const m = new Map<string, number>();
		for (const e of events) {
			if (e.severity === 'error' || e.severity === 'fatal') {
				m.set(e.service, (m.get(e.service) ?? 0) + 1);
			}
		}
		return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
	});

	const maxVol = $derived(Math.max(1, ...byVolume.map(([, c]) => c)));
	const maxErr = $derived(Math.max(1, ...byErrors.map(([, c]) => c)));
</script>

<div class="rounded border border-border-default bg-surface-2 p-2">
	<h3 class="text-xs font-semibold text-text-muted mb-2">Top services by volume</h3>
	<div class="space-y-1.5">
		{#each byVolume as [svc, count]}
			<div class="flex items-center gap-2">
				<span class="w-20 text-xs truncate font-medium text-text-primary" title={svc}>{svc}</span>
				<div class="flex-1 h-4 rounded bg-bg-subtle overflow-hidden">
					<div
						class="h-full bg-brand-primary rounded transition-all"
						style="width: {(count / maxVol) * 100}%"
					></div>
				</div>
				<span class="text-xs text-text-muted w-8 text-right">{count}</span>
			</div>
		{/each}
	</div>
	<h3 class="text-xs font-semibold text-text-muted mt-3 mb-2">Top services by errors</h3>
	<div class="space-y-1.5">
		{#each byErrors as [svc, count]}
			<div class="flex items-center gap-2">
				<span class="w-20 text-xs truncate font-medium text-text-primary" title={svc}>{svc}</span>
				<div class="flex-1 h-4 rounded bg-bg-subtle overflow-hidden">
					<div
						class="h-full bg-severity-error rounded transition-all"
						style="width: {(count / maxErr) * 100}%"
					></div>
				</div>
				<span class="text-xs text-text-muted w-8 text-right">{count}</span>
			</div>
		{/each}
	</div>
</div>
