import { z } from '@hono/zod-openapi';

export const ErrorSchema = z
	.object({
		error: z.object({
			code: z.string(),
			message: z.string(),
			details: z.record(z.string(), z.unknown()).optional(),
			requestId: z.string(),
		}),
	})
	.openapi('Error');

const json = (description: string) => ({
	content: {
		'application/json': {
			schema: ErrorSchema,
		},
	},
	description,
});

export const errorResponses = {
	400: json('Bad request'),
	401: json('Missing or invalid credentials'),
	403: json('Insufficient permissions'),
	404: json('Resource not found'),
	409: json('Conflict with current state'),
	422: json('Request failed validation'),
	429: json('Rate limit exceeded'),
	500: json('Internal server error'),
} as const;

/**
 * Pick only the errors a given route can actually produce.
 */
export const errs = <K extends keyof typeof errorResponses>(
	...codes: K[]
): Pick<typeof errorResponses, K> =>
	Object.fromEntries(codes.map((c) => [c, errorResponses[c]])) as Pick<
		typeof errorResponses,
		K
	>;
