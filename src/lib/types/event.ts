export type Severity = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEvent {
	id: string;
	ts: number;
	severity: Severity;
	service: string;
	env: string;
	message: string;
	traceId?: string;
	requestId?: string;
	durationMs?: number;
	userId?: string;
	attrs: Record<string, unknown>;
}
