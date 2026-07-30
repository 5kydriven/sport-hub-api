import {
	index,
	pgTable,
	text,
	timestamp,
	uuid,
	uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from '.';

export const sessions = pgTable(
	'sessions',
	{
		id: uuid('id').primaryKey().defaultRandom(),

		token: text('token').notNull().unique(),

		expiresAt: timestamp('expires_at', {
			withTimezone: true,
		}).notNull(),

		ipAddress: text('ip_address'),

		userAgent: text('user_agent'),

		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, {
				onDelete: 'cascade',
			}),

		createdAt: timestamp('created_at', {
			withTimezone: true,
		})
			.notNull()
			.defaultNow(),

		updatedAt: timestamp('updated_at', {
			withTimezone: true,
		})
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index('sessions_user_idx').on(table.userId),
		uniqueIndex('sessions_token_idx').on(table.token),
	],
);

export const accounts = pgTable(
	'accounts',
	{
		id: uuid('id').primaryKey().defaultRandom(),

		accountId: text('account_id').notNull(),

		providerId: text('provider_id').notNull(),

		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, {
				onDelete: 'cascade',
			}),

		accessToken: text('access_token'),

		refreshToken: text('refresh_token'),

		idToken: text('id_token'),

		accessTokenExpiresAt: timestamp('access_token_expires_at', {
			withTimezone: true,
		}),

		refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
			withTimezone: true,
		}),

		scope: text('scope'),

		password: text('password'),

		createdAt: timestamp('created_at', {
			withTimezone: true,
		})
			.notNull()
			.defaultNow(),

		updatedAt: timestamp('updated_at', {
			withTimezone: true,
		})
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index('accounts_user_idx').on(table.userId),
		index('accounts_provider_account_idx').on(
			table.providerId,
			table.accountId,
		),
	],
);

export const verifications = pgTable(
	'verifications',
	{
		id: uuid('id').primaryKey().defaultRandom(),

		identifier: text('identifier').notNull(),

		value: text('value').notNull(),

		expiresAt: timestamp('expires_at', {
			withTimezone: true,
		}).notNull(),

		createdAt: timestamp('created_at', {
			withTimezone: true,
		})
			.notNull()
			.defaultNow(),

		updatedAt: timestamp('updated_at', {
			withTimezone: true,
		})
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [index('verifications_identifier_idx').on(table.identifier)],
);

export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;

export type AccountRow = typeof accounts.$inferSelect;
export type NewAccountRow = typeof accounts.$inferInsert;

export type VerificationRow = typeof verifications.$inferSelect;
export type NewVerificationRow = typeof verifications.$inferInsert;
