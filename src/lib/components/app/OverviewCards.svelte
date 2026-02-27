<script lang="ts">
	import { filteredEvents, totalCount } from '$lib/data/eventStore.js';
	import { Activity, AlertTriangle, Gauge, Users } from '@lucide/svelte';

	const events = $derived($filteredEvents);
	const count = $derived($totalCount);

	// Mock metrics derived from filtered data
	const eventsPerMin = $derived(
		events.length > 0
			? Math.round(
					(events.length /
						Math.max(
							1,
							(Math.max(...events.map((e) => e.ts)) - Math.min(...events.map((e) => e.ts))) / 60000
						)) *
						10
				) / 10
			: 0
	);
	const errorCount = $derived(
		events.filter((e) => e.severity === 'error' || e.severity === 'fatal').length
	);
	const errorRate = $derived(
		events.length > 0 ? Math.round((errorCount / events.length) * 1000) / 10 : 0
	);
	const uniqueUsers = $derived(new Set(events.map((e) => e.userId).filter(Boolean)).size);

	const p95LatencyMs = $derived.by(() => {
		const durations = events
			.map((e) => e.durationMs)
			.filter((d): d is number => typeof d === 'number' && d >= 0);
		if (durations.length === 0) return null;
		const sorted = [...durations].sort((a, b) => a - b);
		const idx = Math.min(Math.ceil(sorted.length * 0.95) - 1, sorted.length - 1);
		return sorted[Math.max(0, idx)];
	});
</script>

<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
	<div class="rounded-lg border border-border-default bg-surface-2 p-3 shadow-sm">
		<p class="flex items-center gap-2 text-xs font-medium tracking-wide text-text-muted uppercase">
			<Activity class="h-5 w-5 shrink-0" aria-hidden="true" />
			Events/min
		</p>
		<p class="mt-1 text-2xl font-semibold">{eventsPerMin}</p>
	</div>
	<div class="rounded-lg border border-border-default bg-surface-2 p-3 shadow-sm">
		<p class="flex items-center gap-2 text-xs font-medium tracking-wide text-text-muted uppercase">
			<AlertTriangle class="h-5 w-5 shrink-0" aria-hidden="true" />
			Error rate
		</p>
		<p class="mt-1 text-2xl font-semibold {errorRate > 5 ? 'text-severity-error' : ''}">
			{errorRate}%
		</p>
	</div>
	<div class="rounded-lg border border-border-default bg-surface-2 p-3 shadow-sm">
		<p class="flex items-center gap-2 text-xs font-medium tracking-wide text-text-muted uppercase">
			<Gauge class="h-5 w-5 shrink-0" aria-hidden="true" />
			P95 latency
		</p>
		<p class="mt-1 text-2xl font-semibold">
			{p95LatencyMs != null ? `${Math.round(p95LatencyMs)} ms` : '— ms'}
		</p>
	</div>
	<div class="rounded-lg border border-border-default bg-surface-2 p-3 shadow-sm">
		<p class="flex items-center gap-2 text-xs font-medium tracking-wide text-text-muted uppercase">
			<Users class="h-5 w-5 shrink-0" aria-hidden="true" />
			Unique users
		</p>
		<p class="mt-1 text-2xl font-semibold">{uniqueUsers}</p>
	</div>
</div>
