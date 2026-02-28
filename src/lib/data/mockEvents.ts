import type { LogEvent } from '$lib/types/event.js';
import { createRng } from '$lib/data/logGen/distributions.js';
import { generateTraceDefs, traceToEvents } from '$lib/data/logGen/traceGenerator.js';

/**
 * Generate deterministic mock events using trace-first generation.
 * Produces ~count events with trace correlation, service-specific messages, and realistic attrs.
 * Signature unchanged for backward compatibility with eventStore.
 */
export function generateEvents(count: number, startTs: number, seed = 42): LogEvent[] {
	const windowEnd = startTs + 24 * 60 * 60 * 1000; // 24h window
	// Average ~2.5 events per trace; generate enough traces to reach count
	const numTraces = Math.ceil(count / 2.5) + 50;
	const traceDefs = generateTraceDefs(numTraces, startTs, windowEnd, seed);
	const rng = createRng(seed + 1);
	const eventIdPrefix = `evt-${seed}`;
	const allEvents: LogEvent[] = [];
	for (const trace of traceDefs) {
		allEvents.push(...traceToEvents(trace, eventIdPrefix, rng));
		if (allEvents.length >= count * 1.2) break; // enough to slice
	}
	const sorted = allEvents.sort((a, b) => a.ts - b.ts);
	return sorted.slice(0, count);
}

let liveTailInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Simulate live tail: emit a batch of trace-correlated events per tick.
 * Uses 8–30 traces per tick for a heavier burst. Returns stop function.
 */
export function streamEvents(
	callback: (events: LogEvent[]) => void,
	intervalMs = 2000,
	seed = 99
): () => void {
	let counter = 0;
	const rng = createRng(seed);

	const tick = () => {
		const now = Date.now();
		// 8–30 traces per tick (cranked up for burst)
		const numTraces = 8 + Math.floor(rng() * 23);
		const windowStart = now - 5000;
		const traceDefs = generateTraceDefs(numTraces, windowStart, now + 100, seed + counter * 1000);
		const eventIdPrefix = `live-${now}`;
		const batch: LogEvent[] = [];
		for (const trace of traceDefs) {
			const events = traceToEvents(trace, eventIdPrefix, rng);
			for (const ev of events) {
				batch.push({
					...ev,
					id: `${ev.id}-${counter}`,
					ts: now + counter
				});
				counter++;
			}
		}
		if (batch.length > 0) callback(batch);
	};

	liveTailInterval = setInterval(tick, intervalMs);
	return () => {
		if (liveTailInterval) clearInterval(liveTailInterval);
		liveTailInterval = null;
	};
}
