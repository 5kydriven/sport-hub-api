import { ConflictError } from '@/core/errors';
import type { OnboardingRepository } from './onboarding.repository';
import type {
	CompleteOnboardingInput,
	OnboardingResult,
} from './onboarding.schema';

export interface OnboardingServiceDep {
	onboardingRepo: OnboardingRepository;
}

export function makeOnboardingService(deps: OnboardingServiceDep) {
	const { onboardingRepo } = deps;
	return {
		isComplete(userId: string): Promise<boolean> {
			return onboardingRepo.isComplete(userId);
		},

		async complete(
			userId: string,
			input: CompleteOnboardingInput,
		): Promise<OnboardingResult> {
			const completed = await onboardingRepo.complete(userId, input);
			if (!completed) {
				throw new ConflictError('Onboarding has already been completed');
			}
			return {
				role: input.role,
				onboardingCompletedAt: new Date(completed.completedAt).toISOString(),
				...(completed.venueId ? { venueId: completed.venueId } : {}),
			};
		},
	};
}

export type OnboardingService = ReturnType<typeof makeOnboardingService>;
