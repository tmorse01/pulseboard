import type { LogEvent } from '$lib/types/event.js';
import type { FieldFilter, FilterState, TimeRangePreset } from '$lib/types/filter.js';
import { generateEvents, streamEvents } from './mockEvents.js';
import { writable, derived, get } from 'svelte/store';
import { filterState } from '$lib/stores/filterState.js';

const PRESET_MS: Record<TimeRangePreset, number> = {
	'15m': 15 * 60 * 1000,
	'1h': 60 * 60 * 1000,
	'24h': 24 * 60 * 60 * 1000
};

function getTimeBounds(state: FilterState): { start: number; end: number } {
	const now = Date.now();
	if (state.timeRange.type === 'preset') {
		const ms = PRESET_MS[state.timeRange.preset];
		return { start: now - ms, end: now };
	}
	return state.timeRange.range;
}

export { getTimeBounds };

function matchesFieldFilter(event: LogEvent, f: FieldFilter): boolean {
	const value = event.attrs[f.key] ?? (event as unknown as Record<string, unknown>)[f.key];
	const str = value != null ? String(value) : '';
	const v = f.value;
	switch (f.operator) {
		case '=':
			return str === v;
		case '!=':
			return str !== v;
		case 'contains':
			return str.toLowerCase().includes(v.toLowerCase());
		case 'regex':
			try {
				return new RegExp(v).test(str);
			} catch {
				return false;
			}
		default:
			return false;
	}
}

function filterEvents(events: LogEvent[], state: FilterState): LogEvent[] {
	const { start, end } = getTimeBounds(state);
	let result = events.filter(
		(e) => e.ts >= start && e.ts <= end
	);

	if (state.severities.length > 0) {
		const set = new Set(state.severities);
		result = result.filter((e) => set.has(e.severity));
	}
	if (state.services.length > 0) {
		const set = new Set(state.services);
		result = result.filter((e) => set.has(e.service));
	}
	if (state.environments.length > 0) {
		const set = new Set(state.environments);
		result = result.filter((e) => set.has(e.env));
	}
	if (state.hosts.length > 0) {
		const set = new Set(state.hosts);
		result = result.filter((e) => {
			const h = (e.attrs?.host as string) ?? '';
			return h && set.has(h);
		});
	}
	if (state.users.length > 0) {
		const set = new Set(state.users);
		result = result.filter((e) => e.userId && set.has(e.userId));
	}
	if (state.textSearch.trim()) {
		const q = state.textSearch.trim().toLowerCase();
		const quoted = /"([^"]+)"/.exec(state.textSearch);
		if (quoted) {
			const phrase = quoted[1].toLowerCase();
			result = result.filter(
				(e) =>
					e.message.toLowerCase().includes(phrase) ||
					JSON.stringify(e.attrs).toLowerCase().includes(phrase)
			);
		} else {
			const terms = q.split(/\s+/).filter(Boolean);
			result = result.filter((e) =>
				terms.every(
					(t) =>
						e.message.toLowerCase().includes(t) ||
						(e.service && e.service.toLowerCase().includes(t)) ||
						JSON.stringify(e.attrs).toLowerCase().includes(t)
				)
			);
		}
	}
	for (const f of state.fieldFilters) {
		result = result.filter((e) => matchesFieldFilter(e, f));
	}
	// Sort by ts descending (newest first)
	result = [...result].sort((a, b) => b.ts - a.ts);
	return result;
}

/** Merge incoming events into existing list by id (incoming wins), then sort by ts descending. */
function mergeEventsByIdAndTs(existing: LogEvent[], incoming: LogEvent[]): LogEvent[] {
	const byId = new Map<string, LogEvent>();
	for (const e of existing) byId.set(e.id, e);
	for (const e of incoming) byId.set(e.id, e);
	return [...byId.values()].sort((a, b) => b.ts - a.ts);
}

/** Initial dataset: 100k events spanning last 24h */
const INITIAL_END = Date.now();
const INITIAL_START = INITIAL_END - 24 * 60 * 60 * 1000;
const INITIAL_EVENTS = generateEvents(100_000, INITIAL_START);

export const datasetStore = writable<LogEvent[]>(INITIAL_EVENTS);

export const filteredEvents = derived(
	[datasetStore, filterState],
	([data, state]) => filterEvents(data, state)
);

export const totalCount = derived(filteredEvents, (events) => events.length);

/** Get a slice of the filtered list (call with current filtered array from store). */
export function getPaginatedSlice(
	events: LogEvent[],
	offset: number,
	limit: number
): LogEvent[] {
	return events.slice(offset, offset + limit);
}

let stopLiveTail: (() => void) | null = null;

/** Subscribe to live tail simulation. New events are merged into datasetStore by id/ts. Returns unsubscribe. */
export function subscribeToLiveTail(
	opts: { intervalMs?: number } = {}
): () => void {
	if (stopLiveTail) stopLiveTail();
	stopLiveTail = streamEvents(
		(batch) => {
			datasetStore.update((arr) => mergeEventsByIdAndTs(arr, batch));
		},
		opts.intervalMs ?? 2000
	);
	return () => {
		if (stopLiveTail) stopLiveTail();
		stopLiveTail = null;
	};
}

/** For use in non-Svelte contexts (e.g. tests). */
export function getFilteredEvents(state: FilterState): LogEvent[] {
	return filterEvents(get(datasetStore), state);
}
