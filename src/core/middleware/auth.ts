import { createMiddleware } from 'hono/factory';
import { UnauthorizedError } from '@/core/errors';
import type { AppEnv } from '@/core/types';
import type { Principal } from '@/auth/principal';
import { Context } from 'hono';
/**
 * Extracts `Bearer <token>` per RFC 6750 §2.1.
 * Case-insensitive scheme, exactly one space.
 */
function extractBearer(header: string | undefined): string | null {
	if (!header) return null;
	const match = /^Bearer\s+(.+)$/i.exec(header.trim());
	return match?.[1] ?? null;
}
async function resolvePrincipal(c: Context<AppEnv>): Promise<Principal | null> {
	const { auth, services } = c.get('container');
	const token = extractBearer(c.req.header('Authorization'));
	// --- Path 1: API key (machine caller) ---
	// if (token?.startsWith('sk_')) {
	// 	return services.apiKey.verify(token);
	// }
	// --- Path 2: Session, via bearer OR cookie ---
	// Better Auth's bearer() plugin reads the header; getSession reads cookies.
	// Passing raw headers covers both in one call.
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session) return null;
	return {
		id: session.user.id,
		kind: 'user',
		email: session.user.email,
		roles: (session.user as { roles?: string[] }).roles ?? ['user'],
		scopes: ['*'], // humans have full scope; roles gate them
		sessionId: session.session.id,
		apiKeyId: null,
	};
}
/** Hard gate. Rejects unauthenticated requests. */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
	const principal = await resolvePrincipal(c);
	if (!principal) {
		// RFC 6750 §3 — the WWW-Authenticate challenge is mandatory on 401.
		c.header('WWW-Authenticate', 'Bearer realm="api", error="invalid_token"');
		throw new UnauthorizedError('Missing or invalid credentials');
	}
	c.set('principal', principal);
	c.set('logger', c.get('logger').child({ principalId: principal.id }));
	await next();
});
/** Soft gate. Populates principal if present; never rejects. */
export const optionalAuth = createMiddleware<AppEnv>(async (c, next) => {
	c.set('principal', await resolvePrincipal(c).catch(() => null));
	await next();
});
