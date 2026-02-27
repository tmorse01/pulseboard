<script lang="ts">
	import { filteredEvents } from '$lib/data/eventStore.js';
	import { selectedEventId, filterState } from '$lib/stores/index.js';
	import { X } from '@lucide/svelte';

	interface Props {
		eventId: string;
	}

	let { eventId }: Props = $props();

	const events = $derived($filteredEvents);
	const event = $derived(events.find((e) => e.id === eventId));

	let tab = $state<'summary' | 'raw' | 'related' | 'context'>('summary');

	$effect(() => {
		eventId;
		tab = 'summary';
	});

	import type { Severity } from '$lib/types/event.js';

	function addToFilter(field: string, value: string) {
		if (field === 'service') {
			filterState.update((s) => ({
				...s,
				services: s.services.includes(value) ? s.services : [...s.services, value]
			}));
		} else if (field === 'env' || field === 'environment') {
			filterState.update((s) => ({
				...s,
				environments: s.environments.includes(value) ? s.environments : [...s.environments, value]
			}));
		} else if (field === 'severity') {
			const valid: Severity[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
			if (valid.includes(value as Severity)) {
				filterState.update((s) => ({
					...s,
					severities: s.severities.includes(value as Severity)
						? s.severities
						: [...s.severities, value as Severity]
				}));
			}
		} else if (field === 'traceId' || field === 'requestId') {
			filterState.update((s) => {
				const exists = s.fieldFilters.some(
					(f) => f.key === field && f.operator === '=' && f.value === value
				);
				if (exists) return s;
				return {
					...s,
					fieldFilters: [...s.fieldFilters, { key: field, operator: '=' as const, value }]
				};
			});
		}
	}

	const relatedEvents = $derived(
		event
			? events.filter(
					(e) =>
						e.id !== event.id &&
						((event.traceId && e.traceId === event.traceId) ||
							(event.requestId && e.requestId === event.requestId))
				)
			: []
	);

	const WINDOW_MS = 5 * 60 * 1000;
	const nearbyEvents = $derived(
		event
			? events.filter(
					(e) =>
						e.id !== event.id &&
						e.ts >= event.ts - WINDOW_MS &&
						e.ts <= event.ts + WINDOW_MS
				)
			: []
	);
</script>

{#if event}
	<div
		class="h-full flex flex-col rounded border border-border-default bg-surface-1 overflow-hidden"
		role="complementary"
		aria-label="Event details"
	>
		<div class="flex items-center justify-between border-b border-border-default px-3 py-2">
			<h3 class="font-semibold text-sm">Event details</h3>
			<button
				type="button"
				class="p-1 rounded hover:bg-hover-surface"
				aria-label="Close"
				onclick={() => selectedEventId.set(null)}
			>
				<X class="w-5 h-5" aria-hidden="true" />
			</button>
		</div>
		<div class="flex border-b border-border-default">
			{#each (['summary', 'raw', 'related', 'context'] as const) as t}
				<button
					type="button"
					class="px-3 py-2 text-sm font-medium border-b-2 {tab === t
						? 'border-brand-primary text-brand-primary'
						: 'border-transparent text-text-muted hover:text-text-primary'}"
					onclick={() => (tab = t)}
				>
					{t.charAt(0).toUpperCase() + t.slice(1)}
				</button>
			{/each}
		</div>
		<div class="flex-1 overflow-auto p-3 text-sm">
			{#if tab === 'summary'}
				<dl class="space-y-2">
					<div>
						<dt class="text-text-muted">Timestamp</dt>
						<dd class="font-mono">{new Date(event.ts).toISOString()}</dd>
					</div>
					{#if event.traceId}
						<div>
							<dt class="text-text-muted">Trace ID</dt>
							<dd>
								<button
									type="button"
									class="font-mono text-brand-primary hover:underline"
									onclick={() => addToFilter('traceId', event.traceId!)}
								>
									{event.traceId}
								</button>
							</dd>
						</div>
					{/if}
					{#if event.requestId}
						<div>
							<dt class="text-text-muted">Request ID</dt>
							<dd>
								<button
									type="button"
									class="font-mono text-brand-primary hover:underline"
									onclick={() => addToFilter('requestId', event.requestId!)}
								>
									{event.requestId}
								</button>
							</dd>
						</div>
					{/if}
					{#if event.userId}
						<div>
							<dt class="text-text-muted">User ID</dt>
							<dd class="font-mono">{event.userId}</dd>
						</div>
					{/if}
					<div>
						<dt class="text-text-muted">Service</dt>
						<dd>
							<button
								type="button"
								class="text-brand-primary hover:underline"
								onclick={() => addToFilter('service', event.service)}
							>
								{event.service}
							</button>
						</dd>
					</div>
					<div>
						<dt class="text-text-muted">Environment</dt>
						<dd>
							<button
								type="button"
								class="text-brand-primary hover:underline"
								onclick={() => addToFilter('env', event.env)}
							>
								{event.env}
							</button>
						</dd>
					</div>
					<div>
						<dt class="text-text-muted">Severity</dt>
						<dd>
							<button
								type="button"
								class="text-brand-primary hover:underline"
								onclick={() => addToFilter('severity', event.severity)}
							>
								{event.severity}
							</button>
						</dd>
					</div>
					<div>
						<dt class="text-text-muted">Message</dt>
						<dd class="wrap-break-word">{event.message}</dd>
					</div>
				</dl>
			{:else if tab === 'raw'}
				<pre
					class="text-xs font-mono overflow-auto rounded bg-bg-subtle p-2 whitespace-pre-wrap break-all"
				>{JSON.stringify(event, null, 2)}</pre>
			{:else if tab === 'related'}
				<p class="text-text-muted mb-2">
					{relatedEvents.length} related event(s) by trace/request ID
				</p>
				<ul class="space-y-1">
					{#each relatedEvents.slice(0, 20) as rel}
						<li>
							<button
								type="button"
								class="text-left w-full px-2 py-1 rounded hover:bg-hover-surface text-xs"
								onclick={() => selectedEventId.set(rel.id)}
							>
								<span class="text-text-faint">{new Date(rel.ts).toISOString()}</span>
								<span class="ml-2">{rel.message}</span>
							</button>
						</li>
					{/each}
				</ul>
			{:else}
				<div class="space-y-4">
					{#if event.traceId}
						<section>
							<h4 class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
								Trace
							</h4>
							<p class="text-text-muted text-sm mb-2">
								This event is part of trace <span class="font-mono">{event.traceId}</span>
								with {relatedEvents.length + 1} total event(s).
							</p>
							{#if relatedEvents.length > 0}
								<ul class="space-y-1">
									{#each relatedEvents.slice(0, 10) as rel}
										<li>
											<button
												type="button"
												class="text-left w-full px-2 py-1 rounded hover:bg-hover-surface text-xs flex items-center gap-2"
												onclick={() => selectedEventId.set(rel.id)}
											>
												<span class="text-text-faint shrink-0">{new Date(rel.ts).toLocaleTimeString()}</span>
												<span class="font-medium">{rel.service}</span>
												<span class="truncate">{rel.message}</span>
											</button>
										</li>
									{/each}
								</ul>
								{#if relatedEvents.length > 10}
									<p class="text-xs text-text-faint mt-1">+{relatedEvents.length - 10} more in Related tab</p>
								{/if}
							{/if}
						</section>
					{/if}
					<section>
						<h4 class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
							Nearby events (±5 min)
						</h4>
						{#if nearbyEvents.length === 0}
							<p class="text-text-muted text-sm">No other events in this time window.</p>
						{:else}
							<ul class="space-y-1">
								{#each nearbyEvents.slice(0, 15) as near}
									<li>
										<button
											type="button"
											class="text-left w-full px-2 py-1 rounded hover:bg-hover-surface text-xs flex items-center gap-2"
											onclick={() => selectedEventId.set(near.id)}
										>
											<span class="text-text-faint shrink-0">{new Date(near.ts).toLocaleTimeString()}</span>
											<span class="font-medium">{near.service}</span>
											<span class="truncate">{near.message}</span>
										</button>
									</li>
								{/each}
							</ul>
							{#if nearbyEvents.length > 15}
								<p class="text-xs text-text-faint mt-1">Showing 15 of {nearbyEvents.length}</p>
							{/if}
						{/if}
					</section>
				</div>
			{/if}
		</div>
	</div>
{:else}
	<div class="p-4 text-text-muted text-sm">Event not found.</div>
{/if}
