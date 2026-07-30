// auth/better-auth.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer } from 'better-auth/plugins';
import type { Database } from '@/db/client';
import type { Env } from '@/env';
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
		],
	});
}
export type Auth = ReturnType<typeof createAuth>;
