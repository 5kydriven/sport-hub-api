import { createRoute } from '@hono/zod-openapi';
import { createApp } from '@/core/http/openapi';
import { errs } from '@/core/http/responses';
import { requireAuth } from '@/core/middleware/auth';
import {
	CompleteOnboardingSchema,
	OnboardingResultSchema,
} from './onboarding.schema';

export const onboardingRoutes = createApp();

const completeRoute = createRoute({
	method: 'put',
	path: '/me/onboarding',
	tags: ['Onboarding'],
	summary: 'Complete role onboarding',
	description:
		'Completes one account role. Gym-owner onboarding also creates the first venue as an unpublished draft.',
	security: [{ bearerAuth: [] }],
	middleware: [requireAuth] as const,
	request: {
		body: {
			content: {
				'application/json': { schema: CompleteOnboardingSchema },
			},
		},
	},
	responses: {
		200: {
			content: { 'application/json': { schema: OnboardingResultSchema } },
			description: 'Onboarding completed.',
		},
		...errs(401, 409, 422),
	},
});

onboardingRoutes.openapi(completeRoute, async (c) => {
	const { services } = c.get('container');
	const principal = c.get('principal');
	return c.json(
		await services.onboarding.complete(
			principal!.id,
			c.req.valid('json'),
		),
		200,
	);
});
