<script lang="ts">
	import { filteredEvents } from '$lib/data/eventStore.js';
	import { selectedEventId, filterState } from '$lib/stores/index.js';

	interface Props {
		eventId: string;
	}

	let { eventId }: Props = $props();

	const events = $derived($filteredEvents);
	const event = $derived(events.find((e) => e.id === eventId));

	let tab = $state<'summary' | 'raw' | 'related' | 'context'>('summary');

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
</script>

{#if event}
	<div
		class="h-full flex flex-col rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden"
		role="complementary"
		aria-label="Event details"
	>
		<div class="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 px-3 py-2">
			<h3 class="font-semibold text-sm">Event details</h3>
			<button
				type="button"
				class="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"
				aria-label="Close"
				onclick={() => selectedEventId.set(null)}
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
		<div class="flex border-b border-neutral-200 dark:border-neutral-700">
			{#each (['summary', 'raw', 'related', 'context'] as const) as t}
				<button
					type="button"
					class="px-3 py-2 text-sm font-medium {tab === t
						? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
						: 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}"
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
						<dt class="text-neutral-500 dark:text-neutral-400">Timestamp</dt>
						<dd class="font-mono">{new Date(event.ts).toISOString()}</dd>
					</div>
					{#if event.traceId}
						<div>
							<dt class="text-neutral-500 dark:text-neutral-400">Trace ID</dt>
							<dd>
								<button
									type="button"
									class="font-mono text-blue-600 dark:text-blue-400 hover:underline"
									onclick={() => addToFilter('traceId', event.traceId!)}
								>
									{event.traceId}
								</button>
							</dd>
						</div>
					{/if}
					{#if event.requestId}
						<div>
							<dt class="text-neutral-500 dark:text-neutral-400">Request ID</dt>
							<dd class="font-mono">{event.requestId}</dd>
						</div>
					{/if}
					{#if event.userId}
						<div>
							<dt class="text-neutral-500 dark:text-neutral-400">User ID</dt>
							<dd class="font-mono">{event.userId}</dd>
						</div>
					{/if}
					<div>
						<dt class="text-neutral-500 dark:text-neutral-400">Service</dt>
						<dd>
							<button
								type="button"
								class="text-blue-600 dark:text-blue-400 hover:underline"
								onclick={() => addToFilter('service', event.service)}
							>
								{event.service}
							</button>
						</dd>
					</div>
					<div>
						<dt class="text-neutral-500 dark:text-neutral-400">Environment</dt>
						<dd>
							<button
								type="button"
								class="text-blue-600 dark:text-blue-400 hover:underline"
								onclick={() => addToFilter('env', event.env)}
							>
								{event.env}
							</button>
						</dd>
					</div>
					<div>
						<dt class="text-neutral-500 dark:text-neutral-400">Severity</dt>
						<dd>
							<button
								type="button"
								class="text-blue-600 dark:text-blue-400 hover:underline"
								onclick={() => addToFilter('severity', event.severity)}
							>
								{event.severity}
							</button>
						</dd>
					</div>
					<div>
						<dt class="text-neutral-500 dark:text-neutral-400">Message</dt>
						<dd class="break-words">{event.message}</dd>
					</div>
				</dl>
			{:else if tab === 'raw'}
				<pre
					class="text-xs font-mono overflow-auto rounded bg-neutral-100 dark:bg-neutral-900 p-2 whitespace-pre-wrap break-all"
				>{JSON.stringify(event, null, 2)}</pre>
			{:else if tab === 'related'}
				<p class="text-neutral-500 dark:text-neutral-400 mb-2">
					{relatedEvents.length} related event(s) by trace/request ID
				</p>
				<ul class="space-y-1">
					{#each relatedEvents.slice(0, 20) as rel}
						<li>
							<button
								type="button"
								class="text-left w-full px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-xs"
								onclick={() => selectedEventId.set(rel.id)}
							>
								<span class="text-neutral-500">{new Date(rel.ts).toISOString()}</span>
								<span class="ml-2">{rel.message}</span>
							</button>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-neutral-500 dark:text-neutral-400">Context view placeholder.</p>
			{/if}
		</div>
	</div>
{:else}
	<div class="p-4 text-neutral-500 dark:text-neutral-400 text-sm">Event not found.</div>
{/if}
