import { createMiddleware } from 'hono/factory';
import { OnboardingRequiredError, UnauthorizedError } from '@/core/errors';
import type { AppEnv } from '@/core/types';

/**
 * Do not derive this from the session payload: profile completion changes just
 * after sign-up and must take effect before a client can use product routes.
 */
export const requireOnboarding = createMiddleware<AppEnv>(async (c, next) => {
	const principal = c.get('principal');
	if (!principal) throw new UnauthorizedError();
	const complete = await c
		.get('container')
		.services.onboarding.isComplete(principal.id);
	if (!complete) throw new OnboardingRequiredError();
	await next();
});
