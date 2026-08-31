import { describe, expect, test } from 'bun:test';
import { ConflictError } from '@/core/errors';
import { makeOnboardingService } from '@/modules/onboarding/onboarding.service';

describe('onboarding service', () => {
	test('returns an owner onboarding result with its draft venue', async () => {
		const service = makeOnboardingService({
			onboardingRepo: {
				isComplete: async () => false,
				complete: async () => ({
					completedAt: '2026-08-31T10:00:00.000Z',
					venueId: 'b3c1f0a2-6d4e-4a19-9f27-5c8e0d1a7b34',
				}),
			} as never,
		});

		await expect(
			service.complete('a3c1f0a2-6d4e-4a19-9f27-5c8e0d1a7b34', {
				role: 'gym_owner',
				venue: {
					name: 'Tagpuno Sports Center',
					description: 'Indoor basketball venue',
					address: '123 Main Street',
					latitude: 14.5995,
					longitude: 120.9842,
					bookingAdvanceDays: 30,
				},
			}),
		).resolves.toEqual({
			role: 'gym_owner',
			onboardingCompletedAt: '2026-08-31T10:00:00.000Z',
			venueId: 'b3c1f0a2-6d4e-4a19-9f27-5c8e0d1a7b34',
		});
	});

	test('rejects a second onboarding completion', async () => {
		const service = makeOnboardingService({
			onboardingRepo: {
				isComplete: async () => true,
				complete: async () => null,
			} as never,
		});

		await expect(
			service.complete('a3c1f0a2-6d4e-4a19-9f27-5c8e0d1a7b34', {
				role: 'player',
			}),
		).rejects.toBeInstanceOf(ConflictError);
	});
});
