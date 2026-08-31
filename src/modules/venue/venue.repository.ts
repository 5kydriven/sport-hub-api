import { and, desc, eq, lt, or } from 'drizzle-orm';
import { Database } from '@/db/client';
import { courts, type CourtRow, type VenueRow, venues } from '@/db/schema';
import type { CursorParams } from '@/core/pagination/types';
import type {
	CreateCourtInput,
	CreateVenueInput,
	UpdateCourtInput,
	UpdateVenueInput,
} from './venue.schema';

export function makeVenueRepository(db: Database) {
	return {
		async listByOwner(ownerId: string, p: CursorParams): Promise<VenueRow[]> {
			const conditions = [eq(venues.ownerId, ownerId)];
			if (p.cursor) {
				conditions.push(
					or(
						lt(venues.createdAt, p.cursor.createdAt),
						and(
							eq(venues.createdAt, p.cursor.createdAt),
							lt(venues.id, p.cursor.id),
						),
					)!,
				);
			}
			return db
				.select()
				.from(venues)
				.where(and(...conditions))
				.orderBy(desc(venues.createdAt), desc(venues.id))
				.limit(p.limit + 1);
		},

		async createVenue(
			ownerId: string,
			data: CreateVenueInput,
		): Promise<VenueRow> {
			const [venue] = await db
				.insert(venues)
				.values({
					...data,
					ownerId,
					latitude: data.latitude.toString(),
					longitude: data.longitude.toString(),
				})
				.returning();
			return venue!;
		},

		async findVenue(id: string): Promise<VenueRow | null> {
			const venue = await db.query.venues.findFirst({
				where: (venues, { eq }) => eq(venues.id, id),
			});
			return venue ?? null;
		},

		async updateVenue(
			id: string,
			data: UpdateVenueInput,
		): Promise<VenueRow | null> {
			const { latitude, longitude, ...rest } = data;
			const [venue] = await db
				.update(venues)
				.set({
					...rest,
					...(latitude === undefined ? {} : { latitude: latitude.toString() }),
					...(longitude === undefined
						? {}
						: { longitude: longitude.toString() }),
				})
				.where(eq(venues.id, id))
				.returning();
			return venue ?? null;
		},

		async listCourts(venueId: string): Promise<CourtRow[]> {
			return db
				.select()
				.from(courts)
				.where(eq(courts.venueId, venueId))
				.orderBy(desc(courts.createdAt), desc(courts.id));
		},

		async createCourt(
			venueId: string,
			data: CreateCourtInput,
		): Promise<CourtRow> {
			const [court] = await db
				.insert(courts)
				.values({ venueId, ...data })
				.returning();
			return court!;
		},

		async findCourt(id: string): Promise<CourtRow | null> {
			const court = await db.query.courts.findFirst({
				where: (courts, { eq }) => eq(courts.id, id),
			});
			return court ?? null;
		},

		async updateCourt(
			id: string,
			data: UpdateCourtInput,
		): Promise<CourtRow | null> {
			const [court] = await db
				.update(courts)
				.set(data)
				.where(eq(courts.id, id))
				.returning();
			return court ?? null;
		},
	};
}

export type VenueRepository = ReturnType<typeof makeVenueRepository>;
