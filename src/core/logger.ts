// core/logger.ts
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const RANK: Record<LogLevel, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
};
export interface Logger {
	debug(msg: string, meta?: Record<string, unknown>): void;
	info(msg: string, meta?: Record<string, unknown>): void;
	warn(msg: string, meta?: Record<string, unknown>): void;
	error(msg: string, meta?: Record<string, unknown>): void;
	child(bindings: Record<string, unknown>): Logger;
}
export function createLogger(opts: {
	level: LogLevel;
	requestId: string;
	environment: string;
	bindings?: Record<string, unknown>;
}): Logger {
	const threshold = RANK[opts.level];
	const emit = (
		level: LogLevel,
		msg: string,
		meta?: Record<string, unknown>,
	) => {
		if (RANK[level] < threshold) return;
		// Single-line JSON — parseable by any log aggregator.
		console.log(
			JSON.stringify({
				level,
				msg,
				ts: new Date().toISOString(),
				requestId: opts.requestId,
				env: opts.environment,
				...opts.bindings,
				...meta,
			}),
		);
	};
	return {
		debug: (m, meta) => emit('debug', m, meta),
		info: (m, meta) => emit('info', m, meta),
		warn: (m, meta) => emit('warn', m, meta),
		error: (m, meta) => emit('error', m, meta),
		child: (bindings) =>
			createLogger({ ...opts, bindings: { ...opts.bindings, ...bindings } }),
	};
}
