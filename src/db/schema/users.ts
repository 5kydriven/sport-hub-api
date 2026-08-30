import {
	pgTable,
	pgEnum,
	text,
	timestamp,
	boolean,
	uuid,
	index,
} from 'drizzle-orm/pg-core';

/**
 * The only two kinds of person the product has. Anything outside this list is
 * rejected by Postgres, not just by the application — which is the point of an
 * enum over a `text` column with a default.
 */
export const USER_ROLES = ['gym_owner', 'player'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const userRoleEnum = pgEnum('user_role', USER_ROLES);

/** Narrows anything off the wire to a role the enum column will accept. */
export const isUserRole = (v: unknown): v is UserRole =>
	typeof v === 'string' && (USER_ROLES as readonly string[]).includes(v);

export const users = pgTable(
	'users',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: text('name').notNull(),
		email: text('email').notNull().unique(),
		emailVerified: boolean('email_verified').notNull().default(false),
		image: text('image'),
		role: userRoleEnum('role').notNull().default('player'),

		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
		deletedAt: timestamp('deleted_at', { withTimezone: true }),
	},
	(t) => [
		// CRITICAL for keyset pagination — see §13.4
		index('users_cursor_idx').on(t.createdAt, t.id),
	],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
