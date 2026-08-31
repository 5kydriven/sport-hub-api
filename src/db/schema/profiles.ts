import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Role-specific profiles deliberately contain only their identity relationship
 * for the MVP. Additional optional data belongs here when a product need
 * materializes, rather than becoming another nullable column on `users`.
 */
export const playerProfiles = pgTable('player_profiles', {
	userId: uuid('user_id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});

export const gymOwnerProfiles = pgTable('gym_owner_profiles', {
	userId: uuid('user_id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});
