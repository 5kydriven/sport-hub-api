import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from '@hono/zod-openapi';
import {
	courts,
	COURT_SPORTS,
	type CourtRow,
	type VenueRow,
	venues,
} from '@/db/schema';

const venueBase = createSelectSchema(venues);
const courtBase = createSelectSchema(courts);

const VenueWire = venueBase.omit({ ownerId: true }).extend({
	latitude: z.coerce.number(),
	longitude: z.coerce.number(),
	createdAt: z.coerce.date().transform((d) => d.toISOString()),
	updatedAt: z.coerce.date().transform((d) => d.toISOString()),
});

const CourtWire = courtBase.extend({
	createdAt: z.coerce.date().transform((d) => d.toISOString()),
	updatedAt: z.coerce.date().transform((d) => d.toISOString()),
});

// Currency is a fixed wire-level constant for the MVP; price is persisted only
// as integer centavos, so clients cannot mistake it for a floating-point PHP value.
export const CourtSchema = CourtWire.extend({
	currency: z.literal('PHP'),
}).openapi('Court', {
	example: {
		id: 'b3c1f0a2-6d4e-4a19-9f27-5c8e0d1a7b34',
		venueId: 'c3c1f0a2-6d4e-4a19-9f27-5c8e0d1a7b34',
		name: 'Main Court',
		sport: 'basketball',
		priceCentavos: 50000,
		slotDurationMinutes: 60,
		isActive: true,
		createdAt: '2026-08-31T10:00:00.000Z',
		updatedAt: '2026-08-31T10:00:00.000Z',
		currency: 'PHP',
	},
});

export const VenueSchema = VenueWire.openapi('Venue', {
	example: {
		id: 'a3c1f0a2-6d4e-4a19-9f27-5c8e0d1a7b34',
		name: 'Tagpuno Sports Center',
		description: 'Indoor courts for community sports.',
		address: '123 Main Street, Quezon City',
		latitude: 14.5995,
		longitude: 120.9842,
		bookingAdvanceDays: 30,
		isPublished: false,
		createdAt: '2026-08-31T10:00:00.000Z',
		updatedAt: '2026-08-31T10:00:00.000Z',
	},
});

const venueInput = createInsertSchema(venues, {
	name: (s) => s.trim().min(1).max(160),
	description: (s) => s.trim().min(1).max(2_000),
	address: (s) => s.trim().min(1).max(500),
	latitude: () => z.coerce.number().min(-90).max(90),
	longitude: () => z.coerce.number().min(-180).max(180),
	bookingAdvanceDays: () => z.coerce.number().int().min(1).max(365),
});

export const CreateVenueSchema = venueInput
	.pick({
		name: true,
		description: true,
		address: true,
		latitude: true,
		longitude: true,
		bookingAdvanceDays: true,
	})
	.openapi('CreateVenue');

export const UpdateVenueSchema = CreateVenueSchema.partial()
	.refine((input) => Object.keys(input).length > 0, {
		error: 'At least one field must be provided',
	})
	.openapi('UpdateVenue');

const courtInput = createInsertSchema(courts, {
	name: (s) => s.trim().min(1).max(160),
	sport: () => z.enum(COURT_SPORTS),
	priceCentavos: () => z.coerce.number().int().min(0),
	slotDurationMinutes: () => z.coerce.number().int().min(15).max(480),
	isActive: () => z.boolean(),
});

export const CreateCourtSchema = courtInput
	.pick({
		name: true,
		sport: true,
		priceCentavos: true,
		slotDurationMinutes: true,
		isActive: true,
	})
	.partial({ isActive: true })
	.openapi('CreateCourt');

export const UpdateCourtSchema = CreateCourtSchema.partial()
	.refine((input) => Object.keys(input).length > 0, {
		error: 'At least one field must be provided',
	})
	.openapi('UpdateCourt');

export const VenueIdParamSchema = z.object({
	venueId: z.uuid().openapi({
		param: { name: 'venueId', in: 'path' },
		example: 'a3c1f0a2-6d4e-4a19-9f27-5c8e0d1a7b34',
	}),
});

export const CourtIdParamSchema = z.object({
	courtId: z.uuid().openapi({
		param: { name: 'courtId', in: 'path' },
		example: 'b3c1f0a2-6d4e-4a19-9f27-5c8e0d1a7b34',
	}),
});

export type Venue = z.infer<typeof VenueSchema>;
export type Court = z.infer<typeof CourtSchema>;
export type CreateVenueInput = z.infer<typeof CreateVenueSchema>;
export type UpdateVenueInput = z.infer<typeof UpdateVenueSchema>;
export type CreateCourtInput = z.infer<typeof CreateCourtSchema>;
export type UpdateCourtInput = z.infer<typeof UpdateCourtSchema>;

export const toVenue = (row: VenueRow): Venue => VenueSchema.parse(row);
export const toCourt = (row: CourtRow): Court =>
	CourtSchema.parse({ ...row, currency: 'PHP' });
