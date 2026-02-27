<script lang="ts">
	import { filteredEvents, totalCount } from '$lib/data/eventStore.js';

	const events = $derived($filteredEvents);
	const count = $derived($totalCount);

	// Mock metrics derived from filtered data
	const eventsPerMin = $derived(
		events.length > 0
			? Math.round(
					(events.length /
						Math.max(1, (Math.max(...events.map((e) => e.ts)) - Math.min(...events.map((e) => e.ts))) / 60000)) *
						10
				) / 10
			: 0
	);
	const errorCount = $derived(events.filter((e) => e.severity === 'error' || e.severity === 'fatal').length);
	const errorRate = $derived(events.length > 0 ? Math.round((errorCount / events.length) * 1000) / 10 : 0);
	const uniqueUsers = $derived(new Set(events.map((e) => e.userId).filter(Boolean)).size);
</script>

<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
	<div
		class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-3 shadow-sm"
	>
		<p class="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
			Events/min
		</p>
		<p class="text-2xl font-semibold mt-1">{eventsPerMin}</p>
	</div>
	<div
		class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-3 shadow-sm"
	>
		<p class="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
			Error rate
		</p>
		<p class="text-2xl font-semibold mt-1 {errorRate > 5 ? 'text-red-600 dark:text-red-400' : ''}">
			{errorRate}%
		</p>
	</div>
	<div
		class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-3 shadow-sm"
	>
		<p class="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
			P95 latency
		</p>
		<p class="text-2xl font-semibold mt-1">— ms</p>
	</div>
	<div
		class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-3 shadow-sm"
	>
		<p class="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
			Unique users
		</p>
		<p class="text-2xl font-semibold mt-1">{uniqueUsers}</p>
	</div>
</div>
