<script lang="ts">
	import { filteredEvents } from '$lib/data/eventStore.js';
	import { filterState } from '$lib/stores/index.js';
	import type { Severity } from '$lib/types/event.js';
	import { getTimeBounds } from '$lib/data/eventStore.js';

	const events = $derived($filteredEvents);
	const filter = $filterState;

	// Bucket events by time (e.g. 60 buckets) and severity
	const buckets = $derived.by(() => {
		if (events.length === 0) return [];
		const { start, end } = getTimeBounds(filter);
		const n = 60;
		const step = (end - start) / n;
		const sevs: Severity[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
		const counts: Record<Severity, number>[] = Array.from({ length: n }, () =>
			Object.fromEntries(sevs.map((s) => [s, 0])) as Record<Severity, number>
		);
		for (const e of events) {
			const i = Math.min(Math.floor((e.ts - start) / step), n - 1);
			if (i >= 0) counts[i][e.severity]++;
		}
		return counts.map((c, i) => ({
			x: start + (i + 0.5) * step,
			...c
		}));
	});

	const maxStack = $derived(
		buckets.length
			? Math.max(
					...buckets.map((b) =>
						order.reduce((s, sev) => s + (b[sev] ?? 0), 0)
					)
				)
			: 1
	);
	const colors: Record<Severity, string> = {
		trace: '#94a3b8',
		debug: '#0ea5e9',
		info: '#3b82f6',
		warn: '#f59e0b',
		error: '#ef4444',
		fatal: '#b91c1c'
	};
	const order: Severity[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

	// Precompute rects for stacked bars: { x, w, segments: { sev, y, h }[] }
	const rects = $derived.by(() => {
		const scale = maxStack > 0 ? 90 / maxStack : 0;
		const w = Math.max(1, 400 / Math.max(1, buckets.length));
		return buckets.map((bucket, i) => {
			const x = (i / Math.max(1, buckets.length - 1)) * 400;
			let y = 96;
			const segments: { sev: Severity; y: number; h: number }[] = [];
			for (const sev of order) {
				const count = bucket[sev] ?? 0;
				if (count > 0) {
					const h = count * scale;
					segments.push({ sev, y: y - h, h });
					y -= h;
				}
			}
			return { x, w, segments };
		});
	});
</script>

<div class="rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-2">
	<h3 class="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">Event volume over time</h3>
	<svg
		class="w-full h-24"
		viewBox="0 0 400 96"
		preserveAspectRatio="none"
		role="img"
		aria-label="Timeline chart"
	>
		{#each rects as { x, w, segments }}
			{#each segments as { sev, y, h }}
				<rect x={x} y={y} width={w} height={h} fill={colors[sev]} opacity="0.9" />
			{/each}
		{/each}
	</svg>
</div>
