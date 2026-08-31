import { describe, expect, test } from 'bun:test';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { courts } from '@/db/schema';
import {
	CreateCourtSchema,
	CreateVenueSchema,
	UpdateCourtSchema,
	UpdateVenueSchema,
} from '@/modules/venue/venue.schema';

const venue = {
	name: 'Tagpuno Sports Center',
	description: 'Indoor courts for community sports.',
	address: '123 Main Street, Quezon City',
	latitude: 14.5995,
	longitude: 120.9842,
	bookingAdvanceDays: 30,
};

describe('venue and court API schemas', () => {
	test('accepts the fixed sport and PHP-centavo court fields', () => {
		expect(
			CreateCourtSchema.parse({
				name: 'Main Court',
				sport: 'basketball',
				priceCentavos: 50000,
				slotDurationMinutes: 60,
			}),
		).toMatchObject({ sport: 'basketball', priceCentavos: 50000 });
		expect(
			CreateCourtSchema.parse({
				name: 'Inactive Court',
				sport: 'futsal',
				priceCentavos: 0,
				slotDurationMinutes: 15,
				isActive: false,
			}),
		).toMatchObject({ isActive: false });
	});

	test('rejects invalid coordinate, advance window, sport, price, and duration', () => {
		expect(
			CreateVenueSchema.safeParse({ ...venue, latitude: 91 }).success,
		).toBe(false);
		expect(
			CreateVenueSchema.safeParse({ ...venue, bookingAdvanceDays: 366 })
				.success,
		).toBe(false);
		expect(
			CreateCourtSchema.safeParse({
				name: 'A',
				sport: 'padel',
				priceCentavos: 0,
				slotDurationMinutes: 60,
			}).success,
		).toBe(false);
		expect(
			CreateCourtSchema.safeParse({
				name: 'A',
				sport: 'tennis',
				priceCentavos: -1,
				slotDurationMinutes: 60,
			}).success,
		).toBe(false);
		expect(
			CreateCourtSchema.safeParse({
				name: 'A',
				sport: 'tennis',
				priceCentavos: 0,
				slotDurationMinutes: 10,
			}).success,
		).toBe(false);
	});

	test('rejects empty venue and court patches', () => {
		expect(UpdateVenueSchema.safeParse({}).success).toBe(false);
		expect(UpdateCourtSchema.safeParse({}).success).toBe(false);
	});

	test('enforces court-name uniqueness at the venue boundary', () => {
		const venueNameIndex = getTableConfig(courts).indexes.find(
			(index) => index.config.name === 'courts_venue_name_unique',
		);
		expect(venueNameIndex?.config.unique).toBe(true);
		expect(venueNameIndex?.config.columns).toHaveLength(2);
	});
});
