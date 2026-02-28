<script lang="ts">
	import type { LogEvent } from '$lib/types/event.js';
	import type { Density } from '$lib/stores/filterState.js';
	import { selectedEventId } from '$lib/stores/index.js';
	import { Info, Bug, AlertTriangle, CircleAlert, Skull } from '@lucide/svelte';

	interface Props {
		event: LogEvent;
		density?: Density;
	}

	let { event, density: densityProp = 'comfortable' }: Props = $props();

	const isSelected = $derived($selectedEventId === event.id);

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
	class="w-full text-left px-3 border-b border-border-soft transition-colors {isSelected
		? 'bg-selected-bg border-l-4 border-l-selected-border'
		: 'hover:bg-hover-surface'} {densityProp === 'compact'
		? 'py-1.5 text-sm'
		: 'py-2'}"
	onclick={() => selectedEventId.set(event.id)}
>
	<div class="flex items-center gap-2 flex-wrap min-w-0">
		{#each [event.severity] as sev}
			{@const SeverityIcon = severityIcons[sev]}
			<span
				class="shrink-0 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-white {severityColors[sev]}"
			>
				<SeverityIcon class="w-3 h-3 shrink-0" aria-hidden="true" />
				{sev}
			</span>
		{/each}
		<span class="shrink-0 text-text-faint text-xs font-mono">
			{formatTime(event.ts)}
		</span>
		<span class="shrink-0 font-medium text-text-primary">{event.service}</span>
		<span class="min-w-0 truncate text-text-muted">{event.message}</span>
	</div>
</button>
