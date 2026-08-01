// modules/user/user.schema.ts
import { createSelectSchema, createInsertSchema } from 'drizzle-zod';
import { z } from '@hono/zod-openapi';
import { users, type UserRow } from '@/db/schema';

const base = createSelectSchema(users);

/**
 * What we send to clients. Note the omissions.
 *
 * Declared without the `.openapi()` annotation so the example below can be
 * typed against it (SC3). Writing `satisfies z.infer<typeof UserSchema>` inside
 * `UserSchema`'s own initializer is a circular reference and TypeScript rejects
 * it — splitting the declaration in two is what makes the check possible.
 *
 * `.extend()` here only re-types `createdAt`/`updatedAt`, which are real
 * columns given a wire representation. It must never introduce a key the table
 * does not have (SC2).
 */
const UserWire = base.omit({ deletedAt: true }).extend({
	createdAt: z.coerce.date().transform((d) => d.toISOString()),
	updatedAt: z.coerce.date().transform((d) => d.toISOString()),
});

// `satisfies` closes hole H1: `example` is typed `unknown`, so any object
// literal used to be accepted. This previously advertised `avatarUrl` (the
// column is `image`), omitted `role`, and used a ULID for a uuid `id` — none of
// which errored. It now catches both directions: an unknown key AND a missing
// one.
const userExample = {
	id: 'b3c1f0a2-6d4e-4a19-9f27-5c8e0d1a7b34',
	email: 'ada@example.com',
	name: 'Ada Lovelace',
	emailVerified: true,
	image: null,
	role: 'member',
	createdAt: '2025-01-15T10:30:00.000Z',
	updatedAt: '2025-01-15T10:30:00.000Z',
} satisfies z.infer<typeof UserWire>;

export const UserSchema = UserWire.openapi('User', { example: userExample });

export const CreateUserSchema = createInsertSchema(users, {
	email: () => z.email('Must be a valid email address'),
	name: (s) => s.min(1).max(120),
})
	.pick({ email: true, name: true })
	.openapi('CreateUser');

export const UpdateUserSchema = CreateUserSchema.partial()
	// zod 4 unified every custom-message key under `error`. `message` is still
	// accepted for back-compat, but `error` is the form that also takes a
	// function for context-dependent messages.
	.refine((o) => Object.keys(o).length > 0, {
		error: 'At least one field must be provided',
	})
	.openapi('UpdateUser');

export const IdParamSchema = z.object({
	// zod 4 promotes string formats to top-level: `z.uuid()`, not
	// `z.string().uuid()`. The chained form still works but is deprecated.
	id: z.uuid().openapi({
		param: { name: 'id', in: 'path' },
		example: 'b3c1f0a2-6d4e-4a19-9f27-5c8e0d1a7b34',
	}),
});

export type User = z.infer<typeof UserSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

/** Row → wire. The one place secrets get stripped. */
export const toPublicUser = (row: UserRow): User => UserSchema.parse(row);
