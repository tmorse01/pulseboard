import { writable } from 'svelte/store';
import type { FilterState, TimeRangePreset } from '$lib/types/filter.js';
import type { Severity } from '$lib/types/event.js';
import { DEFAULT_TIME_PRESET } from '$lib/types/filter.js';

function defaultFilterState(): FilterState {
	const now = Date.now();
	return {
		timeRange: { type: 'preset', preset: DEFAULT_TIME_PRESET },
		severities: [],
		services: [],
		environments: [],
		hosts: [],
		users: [],
		textSearch: '',
		fieldFilters: [],
		groups: []
	};
}

export const filterState = writable<FilterState>(defaultFilterState());

export function getDefaultFilterState(): FilterState {
	return defaultFilterState();
}

export const selectedEventId = writable<string | null>(null);
export const savedViewId = writable<string | null>(null);
export const sortDesc = writable<boolean>(true);
export type Density = 'comfortable' | 'compact';
export const density = writable<Density>('comfortable');
export const liveTailPaused = writable<boolean>(false);

const PRESET_MS: Record<TimeRangePreset, number> = {
	'15m': 15 * 60 * 1000,
	'1h': 60 * 60 * 1000,
	'24h': 24 * 60 * 60 * 1000
};

export function serializeToUrl(state: FilterState): URLSearchParams {
	const params = new URLSearchParams();
	if (state.timeRange.type === 'preset') {
		params.set('tr', state.timeRange.preset);
	} else {
		params.set('ts', String(state.timeRange.range.start));
		params.set('te', String(state.timeRange.range.end));
	}
	if (state.severities.length) params.set('sev', state.severities.join(','));
	if (state.services.length) params.set('svc', state.services.join(','));
	if (state.environments.length) params.set('env', state.environments.join(','));
	if (state.textSearch) params.set('q', state.textSearch);
	return params;
}

export function parseFromUrl(params: URLSearchParams): Partial<FilterState> {
	const state: Partial<FilterState> = {};
	const tr = params.get('tr');
	const ts = params.get('ts');
	const te = params.get('te');
	if (tr && ['15m', '1h', '24h'].includes(tr)) {
		state.timeRange = { type: 'preset', preset: tr as TimeRangePreset };
	} else if (ts && te) {
		const start = Number(ts);
		const end = Number(te);
		if (!Number.isNaN(start) && !Number.isNaN(end)) {
			state.timeRange = { type: 'absolute', range: { start, end } };
		}
	}
	const sev = params.get('sev');
	if (sev) {
		const valid: Severity[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
		state.severities = sev.split(',').filter((s): s is Severity => valid.includes(s as Severity));
	}
	const svc = params.get('svc');
	if (svc) state.services = svc.split(',').filter(Boolean);
	const env = params.get('env');
	if (env) state.environments = env.split(',').filter(Boolean);
	const q = params.get('q');
	if (q != null) state.textSearch = q;
	return state;
}

export function mergeFilterState(
	base: FilterState,
	partial: Partial<FilterState>
): FilterState {
	return {
		timeRange: partial.timeRange ?? base.timeRange,
		severities: partial.severities ?? base.severities,
		services: partial.services ?? base.services,
		environments: partial.environments ?? base.environments,
		hosts: partial.hosts ?? base.hosts,
		users: partial.users ?? base.users,
		textSearch: partial.textSearch ?? base.textSearch,
		fieldFilters: partial.fieldFilters ?? base.fieldFilters,
		groups: partial.groups ?? base.groups
	};
}
