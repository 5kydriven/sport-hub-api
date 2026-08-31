import { sql } from 'drizzle-orm';
import {
	boolean,
	check,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core';
import { venues } from './venues';

export const COURT_SPORTS = [
	'basketball',
	'badminton',
	'volleyball',
	'tennis',
	'futsal',
] as const;
export type CourtSport = (typeof COURT_SPORTS)[number];

export const courtSportEnum = pgEnum('court_sport', COURT_SPORTS);

/** A bookable area owned through its venue. Availability is configured later. */
export const courts = pgTable(
	'courts',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		venueId: uuid('venue_id')
			.notNull()
			.references(() => venues.id, { onDelete: 'restrict' }),
		name: text('name').notNull(),
		sport: courtSportEnum('sport').notNull(),
		priceCentavos: integer('price_centavos').notNull(),
		slotDurationMinutes: integer('slot_duration_minutes').notNull(),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index('courts_venue_idx').on(table.venueId),
		uniqueIndex('courts_venue_name_unique').on(table.venueId, table.name),
		check('courts_price_centavos_non_negative', sql`${table.priceCentavos} >= 0`),
		check(
			'courts_slot_duration_minutes_range',
			sql`${table.slotDurationMinutes} >= 15 AND ${table.slotDurationMinutes} <= 480`,
		),
	],
);

export type CourtRow = typeof courts.$inferSelect;
