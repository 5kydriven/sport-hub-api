// auth/better-auth.ts
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer, openAPI } from 'better-auth/plugins';
import type { Database } from '@/db/client';
import type { Env } from '@/env';
import { USER_ROLES, isUserRole } from '@/db/schema';
import * as schema from '../db/schema';

export function createAuth(env: Env, db: Database) {
	return betterAuth({
		database: drizzleAdapter(db, {
			provider: 'pg',
			schema,
			// Better Auth addresses models singularly (`user`, `session`, ...);
			// our schema exports them plural (`users`, `sessions`, ...).
			// This is the declared option for that, and it stays correct as
			// tables are added — unlike a hand-written name map.
			usePlural: true,
		}),
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		trustedOrigins: env.CORS_ORIGINS,
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: env.ENVIRONMENT === 'production',
			minPasswordLength: 12,
		},
		user: {
			// Without this the `role` column never reaches the session, and every
			// caller would look like a `player` to requireRole().
			additionalFields: {
				role: {
					// The literal-array form is what puts `role` in the sign-up body
					// and documents both values in /openapi.json. It does NOT
					// validate the incoming value — Better Auth compiles an array
					// type to `z.any()` — which is what databaseHooks below is for.
					type: [...USER_ROLES],
					required: false,
					defaultValue: 'player',
					// Accepted at sign-up. Omitting it yields a player.
					input: true,
				},
			},
		},
		databaseHooks: {
			user: {
				create: {
					before: async (user) => {
						const { role } = user as { role?: unknown };
						// Reject before the insert. Left to Postgres, an unknown role
						// surfaces as a failed enum cast — a 500 where the caller
						// deserves a 400 naming the legal values.
						if (role !== undefined && !isUserRole(role)) {
							throw new APIError('BAD_REQUEST', {
								message: `role must be one of: ${USER_ROLES.join(', ')}`,
							});
						}
					},
				},
			},
		},
		session: {
			expiresIn: 60 * 60 * 24 * 7, // 7 days
			updateAge: 60 * 60 * 24, // slide the window daily
			cookieCache: { enabled: true, maxAge: 60 * 5 },
		},
		advanced: {
			cookiePrefix: 'app',
			useSecureCookies: env.ENVIRONMENT === 'production',
			defaultCookieAttributes: { sameSite: 'lax', httpOnly: true },
			database: {
				// Every id column is `uuid`. Without this, Better Auth mints its
				// own random string ids and Postgres rejects the insert.
				generateId: 'uuid',
			},
		},
		plugins: [
			// THE critical plugin: accept `Authorization: Bearer <session-token>`
			// in addition to cookies. Required for mobile and CLI clients.
			bearer(),
			// Exposes `auth.api.generateOpenAPISchema()`, which core/http/openapi
			// merges into the single /openapi.json. The plugin's own reference
			// page is disabled — one docs surface, not two.
			openAPI({ disableDefaultReference: true }),
		],
	});
}
export type Auth = ReturnType<typeof createAuth>;
