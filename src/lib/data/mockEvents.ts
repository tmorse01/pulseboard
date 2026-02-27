import type { LogEvent, Severity } from '$lib/types/event.js';

/** Simple seeded LCG for deterministic mock data */
function createRng(seed: number) {
	let state = seed;
	return function next(): number {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 2 ** 32;
	};
}

const SERVICES = ['api', 'worker', 'web', 'db', 'auth', 'cache'] as const;
const ENVS = ['prod', 'staging', 'dev'] as const;
const SEVERITIES: Severity[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
const MESSAGES = [
	'Request processed',
	'Connection established',
	'Cache miss',
	'Database query executed',
	'User login',
	'Deployment started',
	'Health check passed',
	'Rate limit exceeded',
	'Validation failed',
	'External API call'
];

function pick<T>(arr: readonly T[], rng: () => number): T {
	return arr[Math.floor(rng() * arr.length)];
}

/** Generate deterministic mock events. */
export function generateEvents(count: number, startTs: number, seed = 42): LogEvent[] {
	const rng = createRng(seed);
	const events: LogEvent[] = [];
	const traceIds = new Map<number, string>();
	let spanCounter = 0;

	for (let i = 0; i < count; i++) {
		const ts = startTs + i * 1000 + Math.floor(rng() * 2000);
		const service = pick(SERVICES, rng);
		const env = pick(ENVS, rng);
		const severity = pick(SEVERITIES, rng);
		const hasTrace = rng() > 0.3;
		const traceId = hasTrace
			? (traceIds.get(i % 10) ?? `trace-${seed}-${i}`)
			: undefined;
		if (hasTrace && !traceIds.has(i % 10)) traceIds.set(i % 10, `trace-${seed}-${i}`);
		const requestId = hasTrace && rng() > 0.5 ? `req-${seed}-${i}` : undefined;
		const durationMs = rng() > 0.6 ? Math.floor(rng() * 500) : undefined;
		const userId = rng() > 0.5 ? `user-${Math.floor(rng() * 100)}` : undefined;

		events.push({
			id: `evt-${seed}-${i}`,
			ts,
			severity,
			service,
			env,
			message: pick(MESSAGES, rng),
			traceId,
			requestId,
			durationMs,
			userId,
			attrs: {
				...(spanCounter++ && { spanId: `span-${spanCounter}` }),
				...(rng() > 0.7 && { host: `host-${Math.floor(rng() * 5)}` })
			}
		});
	}

	return events.sort((a, b) => a.ts - b.ts);
}

let liveTailInterval: ReturnType<typeof setInterval> | null = null;

/** Simulate live tail: call callback with new events at interval. Returns stop function. */
export function streamEvents(
	callback: (event: LogEvent) => void,
	intervalMs = 2000,
	seed = 99
): () => void {
	let counter = 0;
	const rng = createRng(seed);

	const tick = () => {
		const ts = Date.now();
		const event: LogEvent = {
			id: `live-${ts}-${counter}`,
			ts,
			severity: pick(SEVERITIES, rng),
			service: pick(SERVICES, rng),
			env: pick(ENVS, rng),
			message: pick(MESSAGES, rng),
			attrs: {}
		};
		callback(event);
		counter++;
	};

	liveTailInterval = setInterval(tick, intervalMs);
	return () => {
		if (liveTailInterval) clearInterval(liveTailInterval);
		liveTailInterval = null;
	};
}
