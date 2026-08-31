import { describe, expect, test } from 'bun:test';
import { ForbiddenError, NotFoundError } from '@/core/errors';
import { makeVenueService } from '@/modules/venue/venue.service';

const OWNER_A = 'a3c1f0a2-6d4e-4a19-9f27-5c8e0d1a7b34';
const OWNER_B = 'b3c1f0a2-6d4e-4a19-9f27-5c8e0d1a7b34';
const VENUE_ID = 'c3c1f0a2-6d4e-4a19-9f27-5c8e0d1a7b34';
const COURT_ID = 'd3c1f0a2-6d4e-4a19-9f27-5c8e0d1a7b34';
const createdAt = new Date('2026-08-31T10:00:00.000Z');

const ownedVenue = {
	id: VENUE_ID,
	ownerId: OWNER_A,
	name: 'Tagpuno Sports Center',
	description: 'Indoor courts for community sports.',
	address: '123 Main Street, Quezon City',
	latitude: '14.599500',
	longitude: '120.984200',
	bookingAdvanceDays: 30,
	isPublished: false,
	createdAt,
	updatedAt: createdAt,
};

describe('venue service ownership', () => {
	test('returns 403 for a different owner venue', async () => {
		const service = makeVenueService({
			venueRepo: { findVenue: async () => ownedVenue } as never,
		});

		await expect(service.getVenue(OWNER_B, VENUE_ID)).rejects.toBeInstanceOf(
			ForbiddenError,
		);
	});

	test('returns 404 for an absent venue and absent court', async () => {
		const service = makeVenueService({
			venueRepo: {
				findVenue: async () => null,
				findCourt: async () => null,
			} as never,
		});

		await expect(service.getVenue(OWNER_A, VENUE_ID)).rejects.toBeInstanceOf(
			NotFoundError,
		);
		await expect(
			service.updateCourt(OWNER_A, COURT_ID, { isActive: false }),
		).rejects.toBeInstanceOf(NotFoundError);
	});

	test('creates a court under an owned venue and always emits PHP', async () => {
		const service = makeVenueService({
			venueRepo: {
				findVenue: async () => ownedVenue,
				createCourt: async () => ({
					id: COURT_ID,
					venueId: VENUE_ID,
					name: 'Main Court',
					sport: 'basketball',
					priceCentavos: 50000,
					slotDurationMinutes: 60,
					isActive: true,
					createdAt,
					updatedAt: createdAt,
				}),
			} as never,
		});

		await expect(
			service.createCourt(OWNER_A, VENUE_ID, {
				name: 'Main Court',
				sport: 'basketball',
				priceCentavos: 50000,
				slotDurationMinutes: 60,
			}),
		).resolves.toMatchObject({ currency: 'PHP', isActive: true });
	});
});
