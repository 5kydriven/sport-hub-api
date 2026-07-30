// auth/principal.ts
export type PrincipalKind = 'user' | 'service';
export interface Principal {
	/** Stable identity. For services, the owning user's id. */
	id: string;
	kind: PrincipalKind;
	email: string | null;
	roles: readonly string[];
	scopes: readonly string[];
	/** Present only for `kind: 'session'`. Useful for revocation. */
	sessionId: string | null;
	/** Present only for `kind: 'service'`. Useful for audit. */
	apiKeyId: string | null;
}
export const isUser = (p: Principal): boolean => p.kind === 'user';
export const isService = (p: Principal): boolean => p.kind === 'service';
