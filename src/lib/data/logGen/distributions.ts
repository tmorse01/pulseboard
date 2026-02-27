import type { Severity } from '$lib/types/event.js';

/** Service names - must match FilterBuilder and eventStore */
export const SERVICES = ['api', 'worker', 'web', 'db', 'auth', 'cache'] as const;
export type Service = (typeof SERVICES)[number];

export const ENVS = ['prod', 'staging', 'dev'] as const;
export type Env = (typeof ENVS)[number];

/** Severity weights: ~70% info, ~15% debug, ~8% warn, ~5% error, ~1% fatal, ~1% trace */
export const SEVERITY_WEIGHTS: Record<Severity, number> = {
	trace: 0.01,
	debug: 0.15,
	info: 0.70,
	warn: 0.08,
	error: 0.05,
	fatal: 0.01
};

export const SEVERITIES: Severity[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

/** Environment weights: ~60% prod, ~25% staging, ~15% dev */
export const ENV_WEIGHTS: Record<Env, number> = {
	prod: 0.6,
	staging: 0.25,
	dev: 0.15
};

/** Relative service volume: api and web highest; db, cache, auth moderate; worker lower */
export const SERVICE_WEIGHTS: Record<Service, number> = {
	api: 0.28,
	web: 0.25,
	db: 0.18,
	cache: 0.12,
	auth: 0.10,
	worker: 0.07
};

/** Weighted pick from array using cumulative weights */
export function weightedPick<T extends string>(
	items: readonly T[],
	weights: Record<T, number>,
	rng: () => number
): T {
	const total = items.reduce((s, k) => s + weights[k as T], 0);
	let r = rng() * total;
	for (const k of items) {
		r -= weights[k as T];
		if (r <= 0) return k;
	}
	return items[items.length - 1];
}

/** Pick severity according to SEVERITY_WEIGHTS */
export function pickSeverity(rng: () => number): Severity {
	return weightedPick(SEVERITIES, SEVERITY_WEIGHTS, rng);
}

/** Pick env according to ENV_WEIGHTS */
export function pickEnv(rng: () => number): Env {
	return weightedPick(ENVS, ENV_WEIGHTS, rng);
}

/** Pick service according to SERVICE_WEIGHTS */
export function pickService(rng: () => number): Service {
	return weightedPick(SERVICES, SERVICE_WEIGHTS, rng);
}

/** Simple seeded LCG for deterministic mock data */
export function createRng(seed: number): () => number {
	let state = seed;
	return function next(): number {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 2 ** 32;
	};
}

/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

/**
 * Add burstiness: some time buckets get 2-3x average volume.
 * Returns a multiplier for the given timestamp (normalized 0..1 over the window).
 */
export function burstMultiplier(normalizedT: number, rng: () => number): number {
	// Create ~8 burst windows over the range
	const burstCenter = Math.floor(normalizedT * 8) / 8 + 0.0625;
	const dist = Math.abs(normalizedT - burstCenter) * 8;
	if (dist < 0.5 && rng() < 0.4) {
		return lerp(1, 2.5, rng());
	}
	return 1;
}

/**
 * Time-of-day factor: slightly higher volume during "business hours" (9-17 in UTC).
 * ts is Unix ms; windowStart/End define the data window in ms.
 */
export function timeOfDayFactor(ts: number, windowStart: number, windowEnd: number): number {
	const hour = (new Date(ts).getUTCHours() - 9) / 8; // 0 at 9 UTC, 1 at 17 UTC
	const inBusinessHours = hour >= 0 && hour <= 1 ? 1 : 0.7;
	return inBusinessHours;
}
