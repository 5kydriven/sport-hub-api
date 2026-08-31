// auth/better-auth.ts
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer, openAPI } from 'better-auth/plugins';
import type { Database } from '@/db/client';
import type { Env } from '@/env';
import { isUserRole } from '@/db/schema';
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
		basePath: '/v1/api/auth',
		trustedOrigins: env.CORS_ORIGINS,
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false,
			minPasswordLength: 12,
		},
		user: {
			// These are server-owned fields. Registration collects credentials only;
			// onboarding assigns the final role and marks the account complete.
			additionalFields: {
				role: {
					type: 'string',
					required: false,
					defaultValue: 'player',
					input: false,
				},
				onboardingCompletedAt: {
					type: 'date',
					required: false,
					input: false,
				},
			},
		},
		databaseHooks: {
			user: {
				create: {
					before: async (user) => {
						const { role } = user as { role?: unknown };
						if (role === 'admin') {
							throw new APIError('FORBIDDEN', {
								message: 'The admin role cannot be self-assigned',
							});
						}
						// Reject before the insert. Left to Postgres, an unknown role
						// surfaces as a failed enum cast — a 500 where the caller
						// deserves a 400 naming the legal values.
						if (role !== undefined && !isUserRole(role)) {
							throw new APIError('BAD_REQUEST', {
								message: 'Invalid account role',
							});
						}
					},
				},
			},
		},
		session: {
			expiresIn: 60 * 60 * 24 * 7, // 7 days
			updateAge: 60 * 60 * 24, // slide the window daily
			// Role selection happens immediately after registration. A cached session
			// would expose the default player role for up to five minutes.
			cookieCache: { enabled: false },
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
