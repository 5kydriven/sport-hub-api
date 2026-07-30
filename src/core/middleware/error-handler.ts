import { ZodError } from 'zod';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '@/core/types';
import type { Context, ErrorHandler, NotFoundHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { AppError } from '@/core/errors';
import { createLogger, type Logger } from '@/core/logger';

interface ErrorBody {
	error: {
		code: string;
		message: string;
		details?: Record<string, unknown>;
		requestId: string;
	};
}

const body = (
	code: string,
	message: string,
	requestId: string,
	details?: Record<string, unknown>,
): ErrorBody => ({
	error: { code, message, requestId, ...(details && { details }) },
});

/**
 * The container middleware is what puts `logger` on the context — so any error
 * thrown *before* or *by* it (bad config, failed infra construction) leaves the
 * context bare. Falling back to a standalone logger guarantees the invariant
 * that matters: a 500 is never silent.
 */
function resolveLogger(c: Context<AppEnv>, requestId: string): Logger {
	return (
		c.get('logger') ??
		createLogger({
			level: 'debug',
			requestId,
			environment: String(c.env?.ENVIRONMENT ?? 'unknown'),
		})
	);
}

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
	const requestId = c.get('requestId') ?? 'unknown';
	const logger = resolveLogger(c, requestId);
	// 1. Our own domain errors — expected, safe to surface.
	if (err instanceof AppError) {
		logger.warn('app.error', {
			code: err.code,
			status: err.status,
			msg: err.message,
		});
		return c.json(
			body(err.code, err.message, requestId, err.details),
			err.status as ContentfulStatusCode,
		);
	}
	// 2. Zod — validation failures from @hono/zod-openapi.
	if (err instanceof ZodError) {
		return c.json(
			body('VALIDATION_FAILED', 'Request failed validation', requestId, {
				issues: err.issues.map((i) => ({
					path: i.path.join('.'),
					message: i.message,
					code: i.code,
				})),
			}),
			422,
		);
	}
	// 3. Postgres constraint violations — translate to domain semantics.
	if (isPgError(err)) {
		switch (err.code) {
			case '23505': // unique_violation
				return c.json(
					body('CONFLICT', 'Resource already exists', requestId),
					409,
				);
			case '23503': // foreign_key_violation
				return c.json(
					body('CONFLICT', 'Referenced resource does not exist', requestId),
					409,
				);
			case '23514': // check_violation
				return c.json(
					body('VALIDATION_FAILED', 'Constraint violated', requestId),
					422,
				);
		}
	}
	// 4. Hono internals.
	if (err instanceof HTTPException) {
		return c.json(body('HTTP_ERROR', err.message, requestId), err.status);
	}
	// 5. Everything else. LOG THE FULL ERROR. LEAK NOTHING.
	logger.error('unhandled.error', {
		message: err.message,
		stack: err.stack,
		name: err.name,
	});
	return c.json(
		body('INTERNAL_ERROR', 'An unexpected error occurred', requestId),
		500,
	);
};

export const notFoundHandler: NotFoundHandler<AppEnv> = (c) =>
	c.json(
		body(
			'NOT_FOUND',
			`No route for ${c.req.method} ${c.req.path}`,
			c.get('requestId') ?? 'unknown',
		),
		404,
	);

function isPgError(e: unknown): e is { code: string } {
	return (
		typeof e === 'object' &&
		e !== null &&
		'code' in e &&
		typeof (e as { code: unknown }).code === 'string'
	);
}
