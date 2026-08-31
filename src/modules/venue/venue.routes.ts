import { createRoute } from '@hono/zod-openapi';
import { createApp } from '@/core/http/openapi';
import { errs } from '@/core/http/responses';
import { requireAuth } from '@/core/middleware/auth';
import { requireOnboarding } from '@/core/middleware/require-onboarding';
import { requireRole } from '@/core/middleware/require-scopes';
import { buildLinkHeader } from '@/core/pagination/link-header';
import { cursorPaginated, CursorQuerySchema } from '@/core/pagination/schema';
import {
	CourtIdParamSchema,
	CourtSchema,
	CreateCourtSchema,
	CreateVenueSchema,
	UpdateCourtSchema,
	UpdateVenueSchema,
	VenueIdParamSchema,
	VenueSchema,
} from './venue.schema';

export const venueRoutes = createApp();
const ownerOnly = [requireAuth, requireOnboarding, requireRole('gym_owner')];

const listVenuesRoute = createRoute({
	method: 'get',
	path: '/me/venues',
	tags: ['Venue management'],
	summary: 'List my venues',
	security: [{ bearerAuth: [] }],
	middleware: ownerOnly,
	request: { query: CursorQuerySchema },
	responses: {
		200: {
			content: {
				'application/json': {
					schema: cursorPaginated(VenueSchema, 'VenueCursorPage'),
				},
			},
			description: 'Owner venues.',
		},
		...errs(401, 403, 422),
	},
});
venueRoutes.openapi(listVenuesRoute, async (c) => {
	const result = await c
		.get('container')
		.services.venue.listVenues(c.get('principal')!.id, c.req.valid('query'));
	const link = buildLinkHeader(new URL(c.req.url), result.meta);
	if (link) c.header('Link', link);
	return c.json(result, 200);
});

const createVenueRoute = createRoute({
	method: 'post',
	path: '/venues',
	tags: ['Venue management'],
	summary: 'Create a venue draft',
	security: [{ bearerAuth: [] }],
	middleware: ownerOnly,
	request: {
		body: { content: { 'application/json': { schema: CreateVenueSchema } } },
	},
	responses: {
		201: {
			content: { 'application/json': { schema: VenueSchema } },
			description: 'Unpublished venue draft.',
		},
		...errs(401, 403, 422),
	},
});
venueRoutes.openapi(createVenueRoute, async (c) =>
	c.json(
		await c
			.get('container')
			.services.venue.createVenue(c.get('principal')!.id, c.req.valid('json')),
		201,
	),
);

const getVenueRoute = createRoute({
	method: 'get',
	path: '/venues/{venueId}',
	tags: ['Venue management'],
	summary: 'Get an owned venue',
	security: [{ bearerAuth: [] }],
	middleware: ownerOnly,
	request: { params: VenueIdParamSchema },
	responses: {
		200: {
			content: { 'application/json': { schema: VenueSchema } },
			description: 'Owned venue.',
		},
		...errs(401, 403, 404, 422),
	},
});
venueRoutes.openapi(getVenueRoute, async (c) =>
	c.json(
		await c
			.get('container')
			.services.venue.getVenue(
				c.get('principal')!.id,
				c.req.valid('param').venueId,
			),
		200,
	),
);

const updateVenueRoute = createRoute({
	method: 'patch',
	path: '/venues/{venueId}',
	tags: ['Venue management'],
	summary: 'Edit an owned venue draft',
	security: [{ bearerAuth: [] }],
	middleware: ownerOnly,
	request: {
		params: VenueIdParamSchema,
		body: { content: { 'application/json': { schema: UpdateVenueSchema } } },
	},
	responses: {
		200: {
			content: { 'application/json': { schema: VenueSchema } },
			description: 'Updated venue.',
		},
		...errs(401, 403, 404, 422),
	},
});
venueRoutes.openapi(updateVenueRoute, async (c) =>
	c.json(
		await c
			.get('container')
			.services.venue.updateVenue(
				c.get('principal')!.id,
				c.req.valid('param').venueId,
				c.req.valid('json'),
			),
		200,
	),
);

const listCourtsRoute = createRoute({
	method: 'get',
	path: '/venues/{venueId}/courts',
	tags: ['Venue management'],
	summary: 'List courts for an owned venue',
	security: [{ bearerAuth: [] }],
	middleware: ownerOnly,
	request: { params: VenueIdParamSchema },
	responses: {
		200: {
			content: { 'application/json': { schema: CourtSchema.array() } },
			description: 'Owned venue courts.',
		},
		...errs(401, 403, 404, 422),
	},
});
venueRoutes.openapi(listCourtsRoute, async (c) =>
	c.json(
		await c
			.get('container')
			.services.venue.listCourts(
				c.get('principal')!.id,
				c.req.valid('param').venueId,
			),
		200,
	),
);

const createCourtRoute = createRoute({
	method: 'post',
	path: '/venues/{venueId}/courts',
	tags: ['Venue management'],
	summary: 'Create a court',
	security: [{ bearerAuth: [] }],
	middleware: ownerOnly,
	request: {
		params: VenueIdParamSchema,
		body: { content: { 'application/json': { schema: CreateCourtSchema } } },
	},
	responses: {
		201: {
			content: { 'application/json': { schema: CourtSchema } },
			description: 'Created active court.',
		},
		...errs(401, 403, 404, 409, 422),
	},
});
venueRoutes.openapi(createCourtRoute, async (c) =>
	c.json(
		await c
			.get('container')
			.services.venue.createCourt(
				c.get('principal')!.id,
				c.req.valid('param').venueId,
				c.req.valid('json'),
			),
		201,
	),
);

const updateCourtRoute = createRoute({
	method: 'patch',
	path: '/courts/{courtId}',
	tags: ['Venue management'],
	summary: 'Edit or deactivate an owned court',
	security: [{ bearerAuth: [] }],
	middleware: ownerOnly,
	request: {
		params: CourtIdParamSchema,
		body: { content: { 'application/json': { schema: UpdateCourtSchema } } },
	},
	responses: {
		200: {
			content: { 'application/json': { schema: CourtSchema } },
			description: 'Updated court.',
		},
		...errs(401, 403, 404, 409, 422),
	},
});
venueRoutes.openapi(updateCourtRoute, async (c) =>
	c.json(
		await c
			.get('container')
			.services.venue.updateCourt(
				c.get('principal')!.id,
				c.req.valid('param').courtId,
				c.req.valid('json'),
			),
		200,
	),
);
