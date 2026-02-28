<script lang="ts">
	import { filteredEvents, datasetStore, getTimeBounds } from '$lib/data/eventStore.js';
	import { filterState } from '$lib/stores/index.js';
	import type { Severity } from '$lib/types/event.js';

	const filter = $filterState;
	const timeBounds = $derived(getTimeBounds(filter));

	// When absolute range is selected, show expanded "context" so we can grey out the rest
	const displayBounds = $derived.by(() => {
		const { start, end } = timeBounds;
		if (filter.timeRange.type === 'absolute') {
			const span = end - start;
			const pad = Math.max(span * 0.25, 60 * 1000); // at least 1 min padding
			return { start: start - pad, end: end + pad };
		}
		return timeBounds;
	});

	const filteredEventsList = $derived($filteredEvents);

	// Events for chart: preset = filtered (match list); absolute = all in display range so we can show context + grey
	const eventsInDisplay = $derived.by(() => {
		if (filter.timeRange.type === 'preset') {
			return filteredEventsList;
		}
		const data = $datasetStore;
		const { start, end } = displayBounds;
		return data.filter((e) => e.ts >= start && e.ts <= end);
	});

	// Bucket events by time over displayBounds; mark bucket active if it overlaps the filter range
	const buckets = $derived.by(() => {
		if (eventsInDisplay.length === 0 && filter.timeRange.type !== 'absolute') return [];
		const { start, end } = displayBounds;
		const n = 60;
		const step = (end - start) / n;
		const sevs: Severity[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
		const counts: Record<Severity, number>[] = Array.from(
			{ length: n },
			() => Object.fromEntries(sevs.map((s) => [s, 0])) as Record<Severity, number>
		);
		for (const e of eventsInDisplay) {
			const i = Math.min(Math.floor((e.ts - start) / step), n - 1);
			if (i >= 0) counts[i][e.severity]++;
		}
		const filterStart = timeBounds.start;
		const filterEnd = timeBounds.end;
		return counts.map((c, i) => {
			const bucketStart = start + i * step;
			const bucketEnd = start + (i + 1) * step;
			const active =
				filter.timeRange.type === 'preset' || (bucketEnd > filterStart && bucketStart < filterEnd);
			return {
				x: start + (i + 0.5) * step,
				...c,
				active
			};
		});
	});

	const maxStack = $derived(
		buckets.length
			? Math.max(...buckets.map((b) => order.reduce((s, sev) => s + (b[sev] ?? 0), 0)))
			: 1
	);
	const order: Severity[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

	// Time axis: more ticks across the display range
	const timeTicks = $derived.by(() => {
		const { start, end } = displayBounds;
		const span = end - start;
		const count = 11;
		return Array.from({ length: count }, (_, i) => {
			const t = start + (i / (count - 1)) * span;
			return { t, x: (i / (count - 1)) * 400 };
		});
	});

	function formatTime(ts: number, start: number, end: number): string {
		const span = end - start;
		const d = new Date(ts);
		if (span <= 60 * 60 * 1000) {
			return d.toLocaleTimeString(undefined, {
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			});
		}
		if (span <= 24 * 60 * 60 * 1000) {
			return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
		}
		return d.toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Precompute rects: include active flag; use displayBounds for positioning
	// Use a floor and ceiling on effective max so: bars don't shrink to nothing on bursts, and bars never draw off screen
	const CHART_HEIGHT = 64;
	const MIN_EFFECTIVE_MAX = 8;   // floor so low counts don't look flat
	const MAX_EFFECTIVE_MAX = 64;  // ceiling so scale >= 1px/event and bars stay on screen (then we cap height)
	const rects = $derived.by(() => {
		const { start, end } = displayBounds;
		const n = buckets.length;
		const step = n > 0 ? (end - start) / n : 0;
		const effectiveMax = Math.max(MIN_EFFECTIVE_MAX, Math.min(maxStack, MAX_EFFECTIVE_MAX));
		const scale = effectiveMax > 0 ? CHART_HEIGHT / effectiveMax : 0;
		const w = Math.max(1, 400 / Math.max(1, buckets.length));
		return buckets.map((bucket, i) => {
			const x = (i / Math.max(1, buckets.length - 1)) * 400;
			let y = 70;
			const segments: { sev: Severity; y: number; h: number }[] = [];
			for (const sev of order) {
				const count = bucket[sev] ?? 0;
				if (count > 0) {
					const h = count * scale;
					segments.push({ sev, y: y - h, h });
					y -= h;
				}
			}
			// Cap total bar height at CHART_HEIGHT so bars never draw off screen
			const totalH = 70 - y;
			if (totalH > CHART_HEIGHT && segments.length > 0) {
				const factor = CHART_HEIGHT / totalH;
				let yy = 70;
				for (const seg of segments) {
					seg.h *= factor;
					seg.y = yy - seg.h;
					yy -= seg.h;
				}
			}
			const bucketStart = start + i * step;
			const bucketEnd = start + (i + 1) * step;
			return { x, w, segments, bucketStart, bucketEnd, active: bucket.active };
		});
	});

	function setTimeSlice(bucketStart: number, bucketEnd: number) {
		filterState.update((s) => ({
			...s,
			timeRange: { type: 'absolute', range: { start: bucketStart, end: bucketEnd } }
		}));
	}
</script>

<div class="w-full min-w-0 rounded border border-border-default bg-surface-2 p-2">
	<h3 class="mb-1 text-xs font-semibold text-text-muted">Event volume over time</h3>
	<div class="aspect-400/80 w-full min-w-0">
		<svg
			class="block h-full w-full"
			viewBox="0 0 400 80"
			preserveAspectRatio="xMidYMid meet"
			role="img"
			aria-label="Event volume over time. Click a time slice to filter to that range."
		>
			<!-- Chart area: draw inactive (greyed) first, then active (full color) -->
			<g aria-hidden="true">
				{#each rects as { x, w, segments, active }}
					{#if !active}
						{#each segments as { sev, y, h }}
							<rect {x} {y} width={w} height={h} fill="var(--color-text-faint)" opacity="0.35" />
						{/each}
					{/if}
				{/each}
				{#each rects as { x, w, segments, active }}
					{#if active}
						{#each segments as { sev, y, h }}
							<rect {x} {y} width={w} height={h} fill="var(--color-severity-{sev})" opacity="0.9" />
						{/each}
					{/if}
				{/each}
			</g>
			<!-- Clickable slice overlays -->
			<g>
				{#each rects as { x, w, bucketStart, bucketEnd }}
					<rect
						{x}
						y="0"
						width={w}
						height="70"
						class="cursor-pointer fill-transparent hover:fill-brand-primary/20"
						role="button"
						tabindex="-1"
						aria-label="Filter to {new Date(bucketStart).toLocaleString()} – {new Date(
							bucketEnd
						).toLocaleString()}"
						onclick={() => setTimeSlice(bucketStart, bucketEnd)}
						onkeydown={(e) => e.key === 'Enter' && setTimeSlice(bucketStart, bucketEnd)}
					>
						<title>Click to filter to this time range</title>
					</rect>
				{/each}
			</g>
			<!-- Time axis (y 70–80) -->
			<g
				class="time-axis"
				fill="var(--color-text-faint)"
				font-size="4"
				font-family="var(--font-sans)"
				text-anchor="middle"
			>
				<line x1="0" y1="70" x2="400" y2="70" stroke="currentColor" stroke-width="0.5" />
				{#each timeTicks as { t, x }}
					<line x1={x} y1="70" x2={x} y2="72" stroke="currentColor" stroke-width="0.5" />
					<text {x} y="76">{formatTime(t, displayBounds.start, displayBounds.end)}</text>
				{/each}
			</g>
		</svg>
	</div>
</div>
