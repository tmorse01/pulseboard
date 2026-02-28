import type { Severity } from '$lib/types/event.js';
import type { Service } from './distributions.js';

export interface ServiceCallTemplate {
	message: string;
	/** Optional description shown next to message in the event log */
	description?: string;
	severity: Severity;
	attrs: Record<string, unknown>;
	durationMsRange?: [number, number];
}

/** K8s-style host name for a service */
export function hostFor(service: Service, rng: () => number): string {
	const hash = Math.floor(rng() * 0xffffff)
		.toString(16)
		.padStart(6, '0');
	const suffix = Math.floor(rng() * 0xffff)
		.toString(36)
		.toLowerCase();
	switch (service) {
		case 'api':
			return `api-${hash}-${suffix}`;
		case 'web':
			return `web-${hash}-${suffix}`;
		case 'db':
			return `db-primary-${Math.floor(rng() * 3)}`;
		case 'cache':
			return `cache-${hash}`;
		case 'auth':
			return `auth-${hash}-${suffix}`;
		case 'worker':
			return `worker-${hash}-${suffix}`;
		default:
			return `${service}-${hash}`;
	}
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
const HTTP_PATHS = [
	'/api/orders',
	'/api/orders/{id}',
	'/api/cart',
	'/api/cart/items',
	'/api/users/me',
	'/api/products',
	'/api/products/{id}',
	'/api/health',
	'/api/search',
	'/api/checkout'
];
const USER_AGENTS = [
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1',
	'curl/7.68.0',
	'PostmanRuntime/7.32',
	'axios/1.6.0'
];

const DB_TABLES = ['orders', 'users', 'products', 'cart_items', 'sessions', 'audit_log'];
const DB_OPS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];

const CACHE_KEYS = ['user:session:', 'product:', 'cart:', 'rate_limit:', 'config:'];

const JOB_TYPES = ['send_email', 'process_order', 'sync_inventory', 'cleanup_sessions', 'generate_report'];

/** Pick one template at random; caller can override severity for errors */
function pickTemplate<T>(arr: readonly T[], rng: () => number): T {
	return arr[Math.floor(rng() * arr.length)];
}

/**
 * Generate a service-specific log template. Returns message, severity, and attrs.
 * Caller provides host and trace fields (spanId, parentSpanId).
 */
export function templateFor(
	service: Service,
	host: string,
	rng: () => number,
	opts?: { forceError?: boolean; forceWarn?: boolean }
): ServiceCallTemplate {
	const base: Record<string, unknown> = { host };

	if (service === 'api') {
		const method = pickTemplate(HTTP_METHODS, rng);
		const path = pickTemplate(HTTP_PATHS, rng);
		const isError = opts?.forceError ?? (rng() < 0.05);
		const is4xx = !isError && rng() < 0.08;
		const statusCode = isError ? (rng() < 0.7 ? 500 : 503) : is4xx ? (rng() < 0.5 ? 400 : 404) : rng() < 0.8 ? 200 : 201;
		const durationMs = statusCode >= 400 ? Math.floor(50 + rng() * 200) : Math.floor(20 + rng() * 180);
		const message =
			statusCode >= 500
				? 'Request failed'
				: `${method} ${path.replace(/\{id\}/g, String(Math.floor(rng() * 1000)))} ${statusCode}`;
		const severity: Severity = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : rng() < 0.1 ? 'debug' : 'info';
		return {
			message,
			description: statusCode >= 400 ? `HTTP ${statusCode} for ${method} ${path}` : undefined,
			severity: opts?.forceError ? 'error' : opts?.forceWarn ? 'warn' : severity,
			attrs: {
				...base,
				'http.method': method,
				'http.path': path,
				'http.statusCode': statusCode,
				'http.userAgent': pickTemplate(USER_AGENTS, rng),
				'http.duration_ms': durationMs
			},
			durationMsRange: [durationMs, durationMs]
		};
	}

	if (service === 'auth') {
		const actions = [
			{ message: 'User login success', severity: 'info' as Severity },
			{ message: 'Token validation', severity: 'info' as Severity },
			{ message: 'Session expired', severity: 'warn' as Severity },
			{ message: 'Invalid token', severity: 'warn' as Severity },
			{ message: 'Auth failed', severity: 'error' as Severity }
		];
		const a = pickTemplate(actions, rng);
		const durationMs = a.severity === 'error' ? 100 + rng() * 50 : 5 + rng() * 20;
		return {
			message: a.message,
			description: a.severity === 'error' ? 'Authentication failed for the given credentials' : undefined,
			severity: opts?.forceError ? 'error' : opts?.forceWarn ? 'warn' : a.severity,
			attrs: {
				...base,
				'auth.action': a.message.toLowerCase().replace(/\s+/g, '_'),
				'user.id': `user-${Math.floor(rng() * 500)}`
			},
			durationMsRange: [durationMs, durationMs]
		};
	}

	if (service === 'db') {
		const isSlow = rng() < 0.03;
		const isExhausted = opts?.forceError && rng() < 0.5;
		const message = isExhausted
			? 'Connection pool exhausted'
			: isSlow
				? 'Slow query'
				: 'Query executed';
		const op = pickTemplate(DB_OPS, rng);
		const table = pickTemplate(DB_TABLES, rng);
		const durationMs = isExhausted ? 5000 : isSlow ? 200 + rng() * 300 : 2 + rng() * 48;
		const severity: Severity = isExhausted ? 'error' : isSlow ? 'warn' : rng() < 0.08 ? 'debug' : 'info';
		return {
			message,
			description: isExhausted ? 'All connections in the pool are in use' : isSlow ? `Query exceeded threshold (${durationMs}ms)` : undefined,
			severity: opts?.forceError && isExhausted ? 'error' : severity,
			attrs: {
				...base,
				'db.operation': op,
				'db.table': table,
				'db.duration_ms': durationMs
			},
			durationMsRange: [durationMs, durationMs]
		};
	}

	if (service === 'cache') {
		const hit = rng() < 0.75;
		const message = hit ? 'Cache hit' : rng() < 0.9 ? 'Cache miss' : 'Cache eviction';
		const key = pickTemplate(CACHE_KEYS, rng) + Math.floor(rng() * 1000);
		const durationMs = hit ? 1 + rng() * 2 : 5 + rng() * 10;
		const severity: Severity = message === 'Cache miss' ? 'warn' : 'info';
		return {
			message,
			severity: opts?.forceWarn ? 'warn' : severity,
			attrs: {
				...base,
				'cache.hit': hit,
				'cache.key': key
			},
			durationMsRange: [durationMs, durationMs]
		};
	}

	if (service === 'worker') {
		const outcomes = [
			{ message: 'Job started', severity: 'info' as Severity },
			{ message: 'Job completed', severity: 'info' as Severity },
			{ message: 'Job failed', severity: 'error' as Severity }
		];
		const o = pickTemplate(outcomes, rng);
		const jobType = pickTemplate(JOB_TYPES, rng);
		const durationMs = o.message === 'Job failed' ? 100 + rng() * 400 : 50 + rng() * 200;
		return {
			message: o.message,
			severity: opts?.forceError ? 'error' : o.severity,
			attrs: {
				...base,
				'job.type': jobType,
				'job.id': `job-${Math.floor(rng() * 1e6)}`,
				'job.duration_ms': durationMs
			},
			durationMsRange: [durationMs, durationMs]
		};
	}

	// web
	const webOutcomes = [
		{ message: 'Static asset served', path: '/assets/main.js' },
		{ message: 'SSR render', path: '/products' },
		{ message: 'Redirect', path: '/login' }
	];
	const w = pickTemplate(webOutcomes, rng);
	const renderMs = 10 + rng() * 90;
	return {
		message: w.message,
		severity: rng() < 0.1 ? 'debug' : 'info',
		attrs: {
			...base,
			...(w.message === 'Static asset served' ? { 'asset.path': w.path } : { 'render.duration_ms': renderMs })
		},
		durationMsRange: [renderMs, renderMs]
	};
}

/** Add error.message and error.stack to attrs for error/fatal events */
export function addErrorAttrs(attrs: Record<string, unknown>, message: string, rng: () => number): void {
	const errMessages = [
		'Connection timeout',
		'Internal server error',
		'Database connection refused',
		'Upstream service unavailable'
	];
	attrs['error.message'] = message || pickTemplate(errMessages, rng);
	attrs['error.stack'] = `Error: ${attrs['error.message']}\n    at handleRequest (api/server.ts:42:11)\n    at dispatch (router.ts:18:5)`;
}
