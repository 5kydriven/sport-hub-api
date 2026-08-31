import { z } from '@hono/zod-openapi';

const VenueDraftInputSchema = z.object({
	name: z.string().trim().min(1).max(160),
	description: z.string().trim().min(1).max(2_000),
	address: z.string().trim().min(1).max(500),
	latitude: z.number().min(-90).max(90),
	longitude: z.number().min(-180).max(180),
	bookingAdvanceDays: z.number().int().min(1).max(365),
});

export const CompleteOnboardingSchema = z
	.discriminatedUnion('role', [
		z.object({ role: z.literal('player') }),
		z.object({ role: z.literal('gym_owner'), venue: VenueDraftInputSchema }),
	])
	.openapi('CompleteOnboarding');

export const OnboardingResultSchema = z
	.object({
		role: z.enum(['player', 'gym_owner']),
		onboardingCompletedAt: z.string().datetime(),
		venueId: z.uuid().optional(),
	})
	.openapi('OnboardingResult');

export type CompleteOnboardingInput = z.infer<typeof CompleteOnboardingSchema>;
export type OnboardingResult = z.infer<typeof OnboardingResultSchema>;
