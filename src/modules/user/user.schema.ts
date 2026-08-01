// modules/user/user.schema.ts
import { createSelectSchema, createInsertSchema } from 'drizzle-zod';
import { z } from '@hono/zod-openapi';
import { users, type UserRow } from '@/db/schema';

const base = createSelectSchema(users);

/** What we send to clients. Note the omissions. */
export const UserSchema = base
	.omit({ deletedAt: true })
	.extend({
		createdAt: z.coerce.date().transform((d) => d.toISOString()),
		updatedAt: z.coerce.date().transform((d) => d.toISOString()),
	})
	.openapi('User', {
		// Keys must mirror the columns above. The example is untyped, so a stale
		// key is never caught — this previously advertised `avatarUrl` (the column
		// is `image`), omitted `role`, and used a ULID for a uuid `id`.
		example: {
			id: 'b3c1f0a2-6d4e-4a19-9f27-5c8e0d1a7b34',
			email: 'ada@example.com',
			name: 'Ada Lovelace',
			emailVerified: true,
			image: null,
			role: 'member',
			createdAt: '2025-01-15T10:30:00.000Z',
			updatedAt: '2025-01-15T10:30:00.000Z',
		},
	});

export const CreateUserSchema = createInsertSchema(users, {
	email: (_) => z.email('Must be a valid email address'),
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
