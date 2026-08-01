export abstract class AppError extends Error {
	abstract readonly status: number;
	/** Stable, machine-readable. Clients switch on this, not on `message`. */
	abstract readonly code: string;
	/** Safe to serialize to the client. Never contains internals. */
	readonly details?: Record<string, unknown> | undefined;
	constructor(message: string, details?: Record<string, unknown>) {
		super(message);
		this.name = new.target.name;
		this.details = details;
	}
}
export class ValidationError extends AppError {
	readonly status = 422;
	readonly code = 'VALIDATION_FAILED';
}
export class UnauthorizedError extends AppError {
	readonly status = 401;
	readonly code = 'UNAUTHORIZED';
	constructor(message = 'Authentication required') {
		super(message);
	}
}
export class ForbiddenError extends AppError {
	readonly status = 403;
	readonly code = 'FORBIDDEN';
	constructor(
		message = 'Insufficient permissions',
		details?: Record<string, unknown>,
	) {
		super(message, details);
	}
}
export class NotFoundError extends AppError {
	readonly status = 404;
	readonly code = 'NOT_FOUND';
	constructor(resource: string, id?: string) {
		super(`${resource} not found`, id ? { resource, id } : { resource });
	}
}
export class ConflictError extends AppError {
	readonly status = 409;
	readonly code = 'CONFLICT';
}
export class RateLimitError extends AppError {
	readonly status = 429;
	readonly code = 'RATE_LIMITED';
	constructor(resetAt: number) {
		super('Rate limit exceeded', { resetAt });
	}
}
export class InternalError extends AppError {
	readonly status = 500;
	readonly code = 'INTERNAL_ERROR';
	constructor(message = 'An unexpected error occurred') {
		super(message);
	}
}
