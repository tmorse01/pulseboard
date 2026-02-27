import type { Severity } from './event.js';

export type TimeRangePreset = '15m' | '1h' | '24h';

export interface AbsoluteTimeRange {
	start: number;
	end: number;
}

export type TimeRange =
	| { type: 'preset'; preset: TimeRangePreset }
	| { type: 'absolute'; range: AbsoluteTimeRange };

export type FieldFilterOperator = '=' | '!=' | 'contains' | 'regex';

export interface FieldFilter {
	key: string;
	operator: FieldFilterOperator;
	value: string;
}

export type FilterGroupLogic = 'and' | 'or';

export interface FilterGroup {
	logic: FilterGroupLogic;
	filters: (FieldFilter | FilterGroup)[];
}

export interface FilterState {
	timeRange: TimeRange;
	severities: Severity[];
	services: string[];
	environments: string[];
	hosts: string[];
	users: string[];
	textSearch: string;
	fieldFilters: FieldFilter[];
	groups: FilterGroup[];
}

export interface SavedView {
	id: string;
	name: string;
	filterState: FilterState;
	isDefault: boolean;
}

export const DEFAULT_TIME_PRESET: TimeRangePreset = '1h';

export const SEVERITIES: Severity[] = [
	'trace',
	'debug',
	'info',
	'warn',
	'error',
	'fatal'
];
