import {
	boolean,
	check,
	index,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

/** A physical owner-managed venue. Courts and schedules arrive in later slices. */
export const venues = pgTable(
	'venues',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		ownerId: uuid('owner_id')
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		name: text('name').notNull(),
		description: text('description').notNull(),
		address: text('address').notNull(),
		latitude: numeric('latitude', { precision: 9, scale: 6 }).notNull(),
		longitude: numeric('longitude', { precision: 9, scale: 6 }).notNull(),
		bookingAdvanceDays: integer('booking_advance_days').notNull(),
		isPublished: boolean('is_published').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index('venues_owner_idx').on(table.ownerId),
		check(
			'venues_latitude_range',
			sql`${table.latitude} >= -90 AND ${table.latitude} <= 90`,
		),
		check(
			'venues_longitude_range',
			sql`${table.longitude} >= -180 AND ${table.longitude} <= 180`,
		),
		check(
			'venues_booking_advance_days_range',
			sql`${table.bookingAdvanceDays} >= 1 AND ${table.bookingAdvanceDays} <= 365`,
		),
	],
);

export type VenueRow = typeof venues.$inferSelect;
