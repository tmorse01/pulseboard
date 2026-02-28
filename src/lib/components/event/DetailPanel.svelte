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

	let tab = $state<'summary' | 'raw' | 'related' | 'attributes'>('summary');

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

	const relatedByTrace = $derived(
		event?.traceId ? events.filter((e) => e.id !== event.id && e.traceId === event.traceId) : []
	);
	const relatedByRequest = $derived(
		event?.requestId
			? events.filter((e) => e.id !== event.id && e.requestId === event.requestId)
			: []
	);

	const traceGroupSummary = $derived(
		event?.traceId
			? relatedByTrace.length > 0
				? { type: 'group' as const, total: relatedByTrace.length + 1, traceId: event.traceId }
				: { type: 'oneoff' as const, traceId: event.traceId }
			: null
	);
	const requestGroupSummary = $derived(
		event?.requestId
			? relatedByRequest.length > 0
				? { type: 'group' as const, total: relatedByRequest.length + 1 }
				: { type: 'oneoff' as const }
			: null
	);

	const attrEntries = $derived(
		event?.attrs && typeof event.attrs === 'object'
			? Object.entries(event.attrs).filter(([, v]) => v !== undefined && v !== null)
			: []
	);

	function formatAttrValue(value: unknown): string {
		if (value === null || value === undefined) return '—';
		if (typeof value === 'string') return value;
		if (typeof value === 'number' || typeof value === 'boolean') return String(value);
		try {
			return JSON.stringify(value, null, 2);
		} catch {
			return String(value);
		}
	}
</script>

{#if event}
	<div
		class="flex h-full flex-col overflow-hidden rounded border border-border-default bg-surface-1"
		role="complementary"
		aria-label="Event details"
	>
		<div class="flex items-center justify-between border-b border-border-default px-3 py-2">
			<h3 class="text-sm font-semibold">Event details</h3>
			<button
				type="button"
				class="rounded p-1 hover:bg-hover-surface"
				aria-label="Close"
				onclick={() => selectedEventId.set(null)}
			>
				<X class="h-5 w-5" aria-hidden="true" />
			</button>
		</div>
		<div class="flex border-b border-border-default">
			{#each ['summary', 'raw', 'related', 'attributes'] as const as t}
				<button
					type="button"
					class="border-b-2 px-3 py-2 text-sm font-medium {tab === t
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
				<div class="space-y-0">
					<section class="pb-4">
						<h2 class="mb-3 text-base font-semibold text-text-primary">Time & identifiers</h2>
						<dl class="space-y-2">
							<div>
								<dt class="text-xs text-text-muted">Timestamp</dt>
								<dd class="font-mono">{new Date(event.ts).toISOString()}</dd>
							</div>
							{#if event.traceId}
								<div>
									<dt class="text-xs text-text-muted">Trace ID</dt>
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
									<dt class="text-xs text-text-muted">Request ID</dt>
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
									<dt class="text-xs text-text-muted">User ID</dt>
									<dd class="font-mono">{event.userId}</dd>
								</div>
							{/if}
						</dl>
					</section>
					<div class="border-t border-border-default" aria-hidden="true"></div>
					<section class="py-4">
						<h2 class="mb-3 text-base font-semibold text-text-primary">Service & environment</h2>
						<dl class="space-y-2">
							<div>
								<dt class="text-xs text-text-muted">Service</dt>
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
								<dt class="text-xs text-text-muted">Environment</dt>
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
								<dt class="text-xs text-text-muted">Severity</dt>
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
						</dl>
					</section>
					<div class="border-t border-border-default" aria-hidden="true"></div>
					<section class="pt-4">
						<h2 class="mb-3 text-base font-semibold text-text-primary">Message</h2>
						<p class="wrap-break-word text-text-primary">{event.message}</p>
					</section>
					{#if event.description}
						<section class="pt-4">
							<p class="mt-2 text-sm wrap-break-word text-text-muted">{event.description}</p>
						</section>
					{/if}
				</div>
			{:else if tab === 'raw'}
				<section>
					<h2
						class="mb-3 border-b border-border-default pb-2 text-base font-semibold text-text-primary"
					>
						Raw event
					</h2>
					<pre
						class="mt-3 overflow-auto rounded bg-bg-subtle p-2 font-mono text-xs break-all whitespace-pre-wrap">{JSON.stringify(
							event,
							null,
							2
						)}</pre>
				</section>
			{:else if tab === 'related'}
				<div class="space-y-0">
					<section class="pb-4">
						<h2 class="mb-3 text-base font-semibold text-text-primary">Overview</h2>
						<div class="flex flex-wrap gap-2">
							{#if traceGroupSummary}
								{#if traceGroupSummary.type === 'group'}
									<span
										class="inline-flex items-center gap-1.5 rounded-full bg-brand-primary/15 px-2.5 py-1 text-xs font-medium text-brand-primary"
										title="Part of a multi-event trace"
									>
										<svg
											class="h-3.5 w-3.5"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											aria-hidden="true"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
											/>
										</svg>
										Trace group ({traceGroupSummary.total} events)
									</span>
								{:else}
									<span
										class="inline-flex items-center gap-1.5 rounded-full bg-bg-subtle px-2.5 py-1 text-xs font-medium text-text-muted"
										title="Only event in this trace"
									>
										<svg
											class="h-3.5 w-3.5"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											aria-hidden="true"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
											/>
										</svg>
										One-off trace
									</span>
								{/if}
							{/if}
							{#if requestGroupSummary}
								{#if requestGroupSummary.type === 'group'}
									<span
										class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
										title="Part of a multi-request group"
									>
										<svg
											class="h-3.5 w-3.5"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											aria-hidden="true"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M4 6h16M4 10h16M4 14h16M4 18h16"
											/>
										</svg>
										Request group ({requestGroupSummary.total} events)
									</span>
								{:else}
									<span
										class="inline-flex items-center gap-1.5 rounded-full bg-bg-subtle px-2.5 py-1 text-xs font-medium text-text-muted"
										title="Only event with this request ID"
									>
										One-off request
									</span>
								{/if}
							{/if}
							{#if !traceGroupSummary && !requestGroupSummary}
								<p class="text-sm text-text-muted">No trace or request ID on this event.</p>
							{/if}
						</div>
					</section>

					{#if event?.traceId}
						<div class="border-t border-border-default" aria-hidden="true"></div>
						<section class="py-4">
							<h2 class="mb-3 text-base font-semibold text-text-primary">By trace ID</h2>
							<p class="mb-2 font-mono text-xs text-text-muted">{event.traceId}</p>
							{#if relatedByTrace.length === 0}
								<p class="py-1 text-sm text-text-muted">No other events in this trace.</p>
							{:else}
								<ul class="space-y-1">
									{#each relatedByTrace.slice(0, 25) as rel}
										<li>
											<button
												type="button"
												class="flex w-full flex-wrap items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-hover-surface"
												onclick={() => selectedEventId.set(rel.id)}
											>
												<span
													class="shrink-0 rounded bg-brand-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-brand-primary"
													>trace</span
												>
												<span class="shrink-0 text-text-faint"
													>{new Date(rel.ts).toISOString()}</span
												>
												{#if rel.service}
													<span class="shrink-0 font-medium text-text-muted">{rel.service}</span>
												{/if}
												<span class="min-w-0 truncate">{rel.message}</span>
											</button>
										</li>
									{/each}
								</ul>
								{#if relatedByTrace.length > 25}
									<p class="mt-1 text-xs text-text-faint">+{relatedByTrace.length - 25} more</p>
								{/if}
							{/if}
						</section>
					{/if}

					{#if event?.requestId}
						<div class="border-t border-border-default" aria-hidden="true"></div>
						<section class="py-4">
							<h2 class="mb-3 text-base font-semibold text-text-primary">By request ID</h2>
							<p
								class="mb-2 max-w-48 truncate font-mono text-xs text-text-muted"
								title={event.requestId}
							>
								{event.requestId}
							</p>
							{#if relatedByRequest.length === 0}
								<p class="py-1 text-sm text-text-muted">No other events with this request ID.</p>
							{:else}
								<ul class="space-y-1">
									{#each relatedByRequest.slice(0, 25) as rel}
										<li>
											<button
												type="button"
												class="flex w-full flex-wrap items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-hover-surface"
												onclick={() => selectedEventId.set(rel.id)}
											>
												<span
													class="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
													>request</span
												>
												<span class="shrink-0 text-text-faint"
													>{new Date(rel.ts).toISOString()}</span
												>
												{#if rel.service}
													<span class="shrink-0 font-medium text-text-muted">{rel.service}</span>
												{/if}
												<span class="min-w-0 truncate">{rel.message}</span>
											</button>
										</li>
									{/each}
								</ul>
								{#if relatedByRequest.length > 25}
									<p class="mt-1 text-xs text-text-faint">+{relatedByRequest.length - 25} more</p>
								{/if}
							{/if}
						</section>
					{/if}
				</div>
			{:else if tab === 'attributes'}
				<section>
					<h2
						class="mb-3 border-b border-border-default pb-2 text-base font-semibold text-text-primary"
					>
						Custom attributes
					</h2>
					{#if attrEntries.length === 0}
						<p class="mt-3 text-sm text-text-muted">No custom attributes on this event.</p>
					{:else}
						<dl class="mt-3 space-y-2">
							{#each attrEntries as [key, value]}
								<div class="rounded bg-bg-subtle/50 px-2 py-1.5">
									<dt class="truncate text-xs font-medium text-text-muted" title={key}>{key}</dt>
									<dd
										class="mt-0.5 font-mono text-xs wrap-break-word break-all whitespace-pre-wrap"
									>
										{formatAttrValue(value)}
									</dd>
								</div>
							{/each}
						</dl>
					{/if}
				</section>
			{/if}
		</div>
	</div>
{:else}
	<div class="p-4 text-sm text-text-muted">Event not found.</div>
{/if}
