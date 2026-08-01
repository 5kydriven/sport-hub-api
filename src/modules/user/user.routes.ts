import { createApp } from '@/core/http/openapi';
import { requireAuth } from '@/core/middleware/auth';
import { requireScopes } from '@/core/middleware/require-scopes';
import { buildLinkHeader } from '@/core/pagination/link-header';
import {
	cursorPaginated,
	CursorQuerySchema,
	paginated,
} from '@/core/pagination/schema';
import { createRoute, z } from '@hono/zod-openapi';
import { UserSchema } from './user.schema';
import { errs } from '@/core/http/responses';

export const userRoutes = createApp();

/**
 * ONE flat object — deliberately not `z.union([Cursor, Offset])`.
 *
 * OpenAPI models query strings as a flat list of named parameters, each with
 * its own schema and required flag. There is no way to say "either this whole
 * set of params or that whole set" — `oneOf` describes a single schema (a
 * request body), not a parameter collection. So @hono/zod-openapi types
 * `request.query` as ZodObject and a union simply cannot be lowered into a
 * valid spec.
 *
 * Instead: `page` is the mode switch. Present → offset. Absent → cursor.
 *
 * It MUST stay `.optional()` with no `.default()`. OffsetQuerySchema defaults
 * page to 1, and a default is applied during parsing — so `page` would always
 * be set after validation and the cursor branch would be dead code.
 */
const ListQuerySchema = CursorQuerySchema.extend({
	page: z.coerce
		.number()
		.int()
		.min(1)
		.optional()
		.openapi({
			description:
				'Opt into offset pagination. Omit for cursor pagination (the default). Mutually exclusive with `cursor`.',
			example: 1,
		}),
});

const listRoute = createRoute({
	method: 'get',
	path: '/users',
	tags: ['Users'],
	summary: 'List users',
	description:
		'Supports both cursor (default, stable) and offset (`?page=`) pagination. Prefer cursor for feeds and infinite scroll.',
	security: [{ bearerAuth: [] }],
	middleware: [requireAuth, requireScopes('users:read')] as const,
	request: {
		query: ListQuerySchema,
	},
	// `responses`, plural. `response` is silently accepted as an OpenAPI
	// specification extension and then ignored, so the route ends up with no
	// declared responses at all.
	responses: {
		200: {
			content: {
				'application/json': {
					schema: z.union([
						cursorPaginated(UserSchema, 'UserCursorPage'),
						paginated(UserSchema, 'UserOffsetPage'),
					]),
				},
			},
			description: 'A page of users.',
			headers: z.object({
				Link: z
					.string()
					.optional()
					.openapi({ description: 'RFC 8288 navigation.' }),
			}),
		},
		...errs(401, 403, 422, 429),
	},
});

userRoutes.openapi(listRoute, async (c) => {
	const { services } = c.get('container');
	const q = c.req.valid('query');

	// `'page' in q` would be true even when absent — Zod emits the key with an
	// `undefined` value. Check the value, not the key.
	if (q.page !== undefined) {
		return c.json(
			await services.user.listOffset({ page: q.page, limit: q.limit }),
			200,
		);
	}

	const result = await services.user.listCursor(q);
	const link = buildLinkHeader(new URL(c.req.url), result.meta);
	if (link) c.header('Link', link);
	return c.json(result, 200);
});
