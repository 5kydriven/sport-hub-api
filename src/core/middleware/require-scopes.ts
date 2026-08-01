// core/middleware/require-scopes.ts
import { createMiddleware } from 'hono/factory';
import { ForbiddenError, UnauthorizedError } from '@/core/errors';
import type { AppEnv } from '@/core/types';
export function requireScopes(...required: string[]) {
	return createMiddleware<AppEnv>(async (c, next) => {
		const principal = c.get('principal');
		if (!principal) throw new UnauthorizedError();
		const granted = new Set(principal.scopes);
		const satisfied = required.every(
			(scope) =>
				granted.has('*') ||
				granted.has(scope) ||
				// Wildcard: `posts:*` satisfies `posts:write`
				granted.has(`${scope.split(':')[0]}:*`),
		);
		if (!satisfied) {
			c.header(
				'WWW-Authenticate',
				`Bearer realm="api", error="insufficient_scope", scope="${required.join(' ')}"`,
			);
			throw new ForbiddenError('Insufficient scope', { required });
		}
		await next();
	});
}
export function requireRole(...roles: string[]) {
	return createMiddleware<AppEnv>(async (c, next) => {
		const principal = c.get('principal');
		if (!principal) throw new UnauthorizedError();
		if (!roles.some((r) => principal.roles.includes(r))) {
			throw new ForbiddenError('Insufficient role', { required: roles });
		}
		await next();
	});
}
