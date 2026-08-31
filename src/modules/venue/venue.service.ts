import { ForbiddenError, NotFoundError } from '@/core/errors';
import { decodeCursor, toCursorMeta } from '@/core/pagination/helper';
import type { CursorQuery } from '@/core/pagination/schema';
import type { CursorPaginated } from '@/core/pagination/types';
import {
	toCourt,
	toVenue,
	type Court,
	type CreateCourtInput,
	type CreateVenueInput,
	type UpdateCourtInput,
	type UpdateVenueInput,
	type Venue,
} from './venue.schema';
import type { VenueRepository } from './venue.repository';

export interface VenueServiceDep {
	venueRepo: VenueRepository;
}

export function makeVenueService({ venueRepo }: VenueServiceDep) {
	async function ownedVenue(ownerId: string, venueId: string) {
		const venue = await venueRepo.findVenue(venueId);
		if (!venue) throw new NotFoundError('Venue', venueId);
		if (venue.ownerId !== ownerId) {
			throw new ForbiddenError('You do not manage this venue');
		}
		return venue;
	}

	return {
		async listVenues(
			ownerId: string,
			query: CursorQuery,
		): Promise<CursorPaginated<Venue>> {
			const rows = await venueRepo.listByOwner(ownerId, {
				limit: query.limit,
				cursor: query.cursor ? decodeCursor(query.cursor) : null,
			});
			const hasMore = rows.length > query.limit;
			const page = hasMore ? rows.slice(0, query.limit) : rows;
			return { data: page.map(toVenue), meta: toCursorMeta(page, hasMore) };
		},

		async createVenue(ownerId: string, data: CreateVenueInput): Promise<Venue> {
			return toVenue(await venueRepo.createVenue(ownerId, data));
		},

		async getVenue(ownerId: string, venueId: string): Promise<Venue> {
			return toVenue(await ownedVenue(ownerId, venueId));
		},

		async updateVenue(
			ownerId: string,
			venueId: string,
			data: UpdateVenueInput,
		): Promise<Venue> {
			await ownedVenue(ownerId, venueId);
			const updated = await venueRepo.updateVenue(venueId, data);
			if (!updated) throw new NotFoundError('Venue', venueId);
			return toVenue(updated);
		},

		async listCourts(ownerId: string, venueId: string): Promise<Court[]> {
			await ownedVenue(ownerId, venueId);
			return (await venueRepo.listCourts(venueId)).map(toCourt);
		},

		async createCourt(
			ownerId: string,
			venueId: string,
			data: CreateCourtInput,
		): Promise<Court> {
			await ownedVenue(ownerId, venueId);
			return toCourt(await venueRepo.createCourt(venueId, data));
		},

		async updateCourt(
			ownerId: string,
			courtId: string,
			data: UpdateCourtInput,
		): Promise<Court> {
			const court = await venueRepo.findCourt(courtId);
			if (!court) throw new NotFoundError('Court', courtId);
			await ownedVenue(ownerId, court.venueId);
			const updated = await venueRepo.updateCourt(courtId, data);
			if (!updated) throw new NotFoundError('Court', courtId);
			return toCourt(updated);
		},
	};
}

export type VenueService = ReturnType<typeof makeVenueService>;
