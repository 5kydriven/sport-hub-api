import { z } from '@hono/zod-openapi';
const limit = z.coerce
	.number()
	.int()
	.min(1)
	.max(100)
	.default(20)
	.openapi({ description: 'Items per page (1–100).', example: 20 });

export const OffsetQuerySchema = z.object({
	page: z.coerce
		.number()
		.int()
		.min(1)
		.default(1)
		.openapi({ description: '1-indexed page number.', example: 1 }),
	limit,
	sort: z.enum(['createdAt', 'name']).default('createdAt').openapi({}),
	order: z.enum(['asc', 'desc']).default('desc').openapi({}),
});

export const CursorQuerySchema = z.object({
	cursor: z.string().optional().openapi({
		description:
			'Opaque cursor from `meta.nextCursor`. Do not construct by hand.',
		example: 'eyJjIjoiMjAyNS0wMS0xNVQxMDozMDowMFoiLCJpIjoiMDE5..."',
	}),
	limit,
});

export type OffsetQuery = z.infer<typeof OffsetQuerySchema>;
export type CursorQuery = z.infer<typeof CursorQuerySchema>;

// --- Response envelopes, as OpenAPI-compatible generics ---
export const PageMetaSchema = z
	.object({
		page: z.number().int(),
		limit: z.number().int(),
		total: z.number().int(),
		totalPages: z.number().int(),
		hasNextPage: z.boolean(),
		hasPrevPage: z.boolean(),
	})
	.openapi('PageMeta');

export const CursorMetaSchema = z
	.object({
		limit: z.number().int(),
		nextCursor: z.string().nullable(),
		prevCursor: z.string().nullable(),
		hasNextPage: z.boolean(),
	})
	.openapi('CursorMeta');

/** Wraps any item schema into a paginated envelope. */
export function paginated<T extends z.ZodTypeAny>(item: T, name: string) {
	return z.object({ data: z.array(item), meta: PageMetaSchema }).openapi(name);
}

export function cursorPaginated<T extends z.ZodTypeAny>(item: T, name: string) {
	return z
		.object({ data: z.array(item), meta: CursorMetaSchema })
		.openapi(name);
}
