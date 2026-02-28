<script lang="ts">
	import type { LogEvent } from '$lib/types/event.js';
	import type { Density } from '$lib/stores/filterState.js';
	import { selectedEventId } from '$lib/stores/index.js';
	import {
		Info,
		Bug,
		AlertTriangle,
		CircleAlert,
		Skull,
		GitBranch
	} from '@lucide/svelte';

	interface Props {
		event: LogEvent;
		density?: Density;
		/** Number of events sharing this event's trace ID (undefined if no traceId). */
		traceGroupSize?: number;
	}

	let { event, density: densityProp = 'comfortable', traceGroupSize }: Props = $props();

	const isSelected = $derived($selectedEventId === event.id);
	const isTraceGroup = $derived(traceGroupSize !== undefined && traceGroupSize > 1);

	function formatTime(ts: number) {
		return new Date(ts).toLocaleTimeString(undefined, {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false
		});
	}

	const severityColors: Record<LogEvent['severity'], string> = {
		trace: 'bg-severity-trace',
		debug: 'bg-severity-debug',
		info: 'bg-severity-info',
		warn: 'bg-severity-warn',
		error: 'bg-severity-error',
		fatal: 'bg-severity-fatal'
	};

	const severityIcons: Record<LogEvent['severity'], typeof Info> = {
		trace: Info,
		debug: Bug,
		info: Info,
		warn: AlertTriangle,
		error: CircleAlert,
		fatal: Skull
	};
</script>

<button
	type="button"
	data-event-id={event.id}
	class="w-full border-b border-border-soft px-3 text-left transition-colors {isSelected
		? 'border-l-4 border-l-selected-border bg-selected-bg'
		: 'hover:bg-hover-surface'} {densityProp === 'compact' ? 'py-1.5 text-sm' : 'py-2'}"
	onclick={() => selectedEventId.set(event.id)}
>
	<div class="flex min-w-0 flex-wrap items-center gap-2">
		<span class="shrink-0 font-mono text-xs text-text-faint">
			{formatTime(event.ts)}
		</span>
		<span class="shrink-0 font-medium text-text-primary">{event.service}</span>
		<span class="min-w-0 truncate text-text-muted">{event.message}</span>
		<div class="ml-auto flex shrink-0 items-center gap-2">
			{#each [event.severity] as sev}
				{@const SeverityIcon = severityIcons[sev]}
				<span
					class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-white {severityColors[
						sev
					]}"
				>
					<SeverityIcon class="h-3 w-3 shrink-0" aria-hidden="true" />
					{sev}
				</span>
			{/each}
			{#if traceGroupSize !== undefined}
				<span
					class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium {isTraceGroup
						? 'bg-brand-primary/15 text-brand-primary'
						: 'bg-bg-subtle text-text-muted'}"
					title={isTraceGroup ? `Part of trace (${traceGroupSize} events)` : 'One-off trace'}
				>
					<GitBranch class="h-3 w-3 shrink-0" aria-hidden="true" />
					{traceGroupSize}
				</span>
			{/if}
		</div>
	</div>
</button>
