import type { LogEvent } from '$lib/types/event.js';
import type { Service } from './distributions.js';
import { createRng, pickEnv, type Env } from './distributions.js';
import { templateFor, hostFor, addErrorAttrs } from './serviceTemplates.js';

/** One service invocation within a trace */
export interface ServiceCall {
	service: Service;
	/** Offset in ms from trace startTs */
	offsetMs: number;
	/** Optional: force error for this span */
	forceError?: boolean;
	forceWarn?: boolean;
}

/** Trace definition: shared ids and ordered service calls */
export interface TraceDef {
	traceId: string;
	requestId: string;
	userId?: string;
	env: Env;
	startTs: number;
	serviceCalls: ServiceCall[];
}

/** Predefined service call chains (request flows) */
const TRACE_CHAINS: Service[][] = [
	['api', 'auth', 'db', 'cache'],
	['api', 'db'],
	['api', 'auth', 'db'],
	['web', 'api', 'cache'],
	['api', 'db', 'cache'],
	['worker', 'db'],
	['worker', 'cache'],
	['api', 'auth'],
	['web'],
	['api', 'db', 'db']
];

function pickChain(rng: () => number): Service[] {
	return TRACE_CHAINS[Math.floor(rng() * TRACE_CHAINS.length)].slice();
}

/**
 * Generate trace definitions. Each trace has a start time in [windowStart, windowEnd]
 * with optional burst/time-of-day weighting, and a random service chain.
 */
export function generateTraceDefs(
	count: number,
	windowStart: number,
	windowEnd: number,
	seed: number
): TraceDef[] {
	const rng = createRng(seed);
	const traces: TraceDef[] = [];
	const windowMs = windowEnd - windowStart;

	for (let i = 0; i < count; i++) {
		// Spread over window; slight clustering for bursts
		const t = rng();
		const baseTs = windowStart + t * windowMs;
		// Jitter ± a few seconds
		const startTs = Math.round(baseTs + (rng() - 0.5) * 4000);

		const traceId = `trace-${seed}-${i}-${Math.floor(rng() * 0xffff).toString(16)}`;
		const requestId = `req-${seed}-${i}-${Math.floor(rng() * 0xffffff).toString(36)}`;
		const userId = rng() < 0.7 ? `user-${Math.floor(rng() * 500)}` : undefined;
		const env = pickEnv(rng);
		const chain = pickChain(rng);

		const serviceCalls: ServiceCall[] = [];
		let offsetMs = 0;
		for (const svc of chain) {
			serviceCalls.push({
				service: svc,
				offsetMs,
				forceError: rng() < 0.02,
				forceWarn: rng() < 0.03
			});
			// Each call takes 10–80ms before next
			offsetMs += 10 + Math.floor(rng() * 70);
		}

		traces.push({
			traceId,
			requestId,
			userId,
			env,
			startTs,
			serviceCalls
		});
	}

	return traces;
}

/**
 * Convert one trace definition into LogEvents (one per service call).
 * Uses serviceTemplates for message/attrs and adds spanId/parentSpanId.
 */
export function traceToEvents(
	trace: TraceDef,
	eventIdPrefix: string,
	rng: () => number
): LogEvent[] {
	const events: LogEvent[] = [];
	let spanCounter = 0;
	const hostCache = new Map<Service, string>();

	for (let i = 0; i < trace.serviceCalls.length; i++) {
		const call = trace.serviceCalls[i];
		const host = hostCache.get(call.service) ?? (() => {
			const h = hostFor(call.service, rng);
			hostCache.set(call.service, h);
			return h;
		})();
		const ts = trace.startTs + call.offsetMs;
		const spanId = `span-${spanCounter}`;
		const parentSpanId = i === 0 ? undefined : `span-${spanCounter - 1}`;
		spanCounter++;

		const template = templateFor(call.service, host, rng, {
			forceError: call.forceError,
			forceWarn: call.forceWarn
		});
		const durationMs =
			template.durationMsRange != null
				? template.durationMsRange[0] +
					Math.floor(rng() * (template.durationMsRange[1] - template.durationMsRange[0] + 1))
				: undefined;

		const attrs: Record<string, unknown> = {
			...template.attrs,
			spanId,
			...(parentSpanId != null && { parentSpanId })
		};
		if ((template.severity === 'error' || template.severity === 'fatal') && !attrs['error.message']) {
			addErrorAttrs(attrs, template.message, rng);
		}

		const topLevelDuration =
			durationMs ??
			(attrs['http.duration_ms'] as number) ??
			(attrs['db.duration_ms'] as number) ??
			(attrs['job.duration_ms'] as number);

		events.push({
			id: `${eventIdPrefix}-${trace.traceId}-${i}`,
			ts,
			severity: template.severity,
			service: call.service,
			env: trace.env,
			message: template.message,
			traceId: trace.traceId,
			requestId: trace.requestId,
			durationMs: topLevelDuration,
			userId: trace.userId,
			attrs
		});
	}

	return events;
}
