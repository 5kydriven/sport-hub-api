/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';
/**
 * Cloudflare bindings, as declared in wrangler.toml.
 * These arrive untyped and unvalidated on `c.env`.
 */
export const EnvSchema = z.object({
	// --- secrets (wrangler secret put) ---
	DATABASE_URL: z.url().startsWith('postgres'),
	BETTER_AUTH_SECRET: z.string().min(32),
	// API_KEY_PEPPER belongs here the day `auth/api-key.service` lands.
	// Config is required only for capabilities the app actually has (R1) —
	// demanding a secret for an unbuilt module fails every request at boot.
	// --- vars (wrangler.toml [vars]) ---
	ENVIRONMENT: z.enum(['development', 'preview', 'production']),
	BETTER_AUTH_URL: z.url(),
	LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
	CORS_ORIGINS: z
		.string()
		.transform((s) => s.split(',').map((o) => o.trim()))
		.pipe(z.array(z.url())),
	// --- pagination policy ---
	PAGE_SIZE_DEFAULT: z.coerce.number().int().min(1).max(200).default(20),
	PAGE_SIZE_MAX: z.coerce.number().int().min(1).max(500).default(100),
});
export type Env = z.infer<typeof EnvSchema>;
/**
 * Raw bindings type — what Cloudflare actually hands us.
 * Includes non-serializable bindings that Zod cannot describe.
 */
export type RawBindings = Record<string, unknown> & {
	RATE_LIMIT_KV: any;
	IDEMPOTENCY_KV: any;
};
export function parseEnv(raw: unknown): Env {
	const result = EnvSchema.safeParse(raw);
	if (!result.success) {
		// Flatten produces a readable, greppable log line.
		const issues = result.error.issues
			.map((i) => `${i.path.join('.')}: ${i.message}`)
			.join('; ');
		throw new Error(`[env] Invalid configuration — ${issues}`);
	}
	return result.data;
}
