import { OpenAPIHono } from '@hono/zod-openapi';
import { ZodError } from 'zod';

import type { AppEnv } from '@/core/types';

/** Where authRouter is mounted in app.ts. Better Auth emits paths relative to it. */
const AUTH_BASE_PATH = '/api/auth';
/** Better Auth tags every operation 'Default'; regroup them once merged. */
const AUTH_TAG = 'Authentication';

const HTTP_METHODS = new Set([
	'get',
	'put',
	'post',
	'delete',
	'options',
	'head',
	'patch',
	'trace',
]);

type Doc = Record<string, unknown>;

export function createApp() {
	return new OpenAPIHono<AppEnv>({
		// Route validation failures through OUR error envelope.
		defaultHook: (result) => {
			if (!result.success) {
				throw result.error as ZodError;
			}
		},
	});
}

/**
 * Fold Better Auth's generated spec into ours.
 *
 * Better Auth owns the shape of its own routes, so hand-writing OpenAPI
 * definitions for them would drift the moment a plugin is added or the library
 * is upgraded. Generating at request time keeps /openapi.json truthful for free.
 */
function mergeAuthSchema(base: Doc, auth: Doc): Doc {
	const basePaths = (base.paths ?? {}) as Record<string, Doc>;
	const authPaths = (auth.paths ?? {}) as Record<string, Doc>;

	const merged: Record<string, Doc> = { ...basePaths };

	for (const [path, item] of Object.entries(authPaths)) {
		const operations: Doc = {};

		for (const [key, op] of Object.entries(item)) {
			// Path items also carry non-operation keys ($ref, parameters, summary).
			// Only real operations get retagged.
			operations[key] =
				HTTP_METHODS.has(key) && op && typeof op === 'object'
					? { ...(op as Doc), tags: [AUTH_TAG] }
					: op;
		}

		merged[`${AUTH_BASE_PATH}${path}`] = operations;
	}

	const baseComponents = (base.components ?? {}) as Record<string, Doc>;
	const authComponents = (auth.components ?? {}) as Record<string, Doc>;

	return {
		...base,
		paths: merged,
		components: {
			...baseComponents,
			schemas: {
				...(authComponents.schemas ?? {}),
				...(baseComponents.schemas ?? {}),
			},
			// Ours win on collision — `bearerAuth` is described deliberately below.
			securitySchemes: {
				...(authComponents.securitySchemes ?? {}),
				...(baseComponents.securitySchemes ?? {}),
			},
		},
		tags: [
			...((base.tags ?? []) as Doc[]),
			{
				name: AUTH_TAG,
				description: 'Session and credential endpoints served by Better Auth.',
			},
		],
	};
}

export function registerOpenApi(app: OpenAPIHono<AppEnv>) {
	app.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
		type: 'http',
		scheme: 'bearer',
		bearerFormat: 'opaque',
		description:
			'Session token from `POST /api/auth/sign-in/email`, or an API key (`sk_live_...`).',
	});

	app.get('/openapi.json', async (c) => {
		const base: Doc = {
			...app.getOpenAPI31Document({
				openapi: '3.1.0',
				info: {
					title: 'Sport API',
					version: '1.0.0',
					description: 'Reference implementation.',
				},
				// Derived from the incoming request so "Try it" targets the host you
				// are actually on — localhost in dev, the real origin in production.
				servers: [{ url: new URL(c.req.url).origin }],
				security: [{ bearerAuth: [] }], // Default; overridden per-route.
			}),
		};

		const { auth, logger } = c.get('container');

		try {
			const authSchema = (await auth.api.generateOpenAPISchema()) as Doc;
			return c.json(mergeAuthSchema(base, authSchema));
		} catch (err) {
			// Docs must never take the API down with them. Serve what we have.
			logger.warn('openapi.auth_schema_failed', {
				message: err instanceof Error ? err.message : String(err),
			});
			return c.json(base);
		}
	});
}
