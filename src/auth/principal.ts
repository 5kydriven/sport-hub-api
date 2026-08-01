// auth/principal.ts

/**
 * Who is making this request.
 *
 * Only human callers exist today — someone signed in through Better Auth.
 * The commented-out `'service'` parts below are for machine callers: another
 * server (or a cron job, or a customer's script) authenticating with a
 * long-lived API key instead of a login session. That needs an api_keys table
 * and a service to hash/verify keys, neither of which exists yet — see the
 * matching commented-out apiKey wiring in container.ts and middleware/auth.ts.
 * Uncomment all three together when you get there.
 */
export type PrincipalKind = 'user'; // | 'service';
export interface Principal {
	/** Stable identity. For services, the owning user's id. */
	id: string;
	kind: PrincipalKind;
	email: string | null;
	roles: readonly string[];
	scopes: readonly string[];
	/** Present only for `kind: 'user'`. Useful for revocation. */
	sessionId: string | null;
	/** Present only for `kind: 'service'`. Useful for audit. */
	// apiKeyId: string | null;
}
export const isUser = (p: Principal): boolean => p.kind === 'user';
// export const isService = (p: Principal): boolean => p.kind === 'service';
